const prisma = require("../lib/prisma");
const HttpError = require("../lib/httpError");
const asyncHandler = require("../middleware/asyncHandler");
const { monthRange, parseMonthYear, round2 } = require("../lib/dates");
const { COUNTED } = require("../lib/finance");
const { checkBudgetAfterExpense } = require("../lib/budgetAlerts");
const {
  parseCategory,
  parseType,
  parseAmount,
  parseDate,
  cleanText,
  parseReceiptUrl,
} = require("../lib/validate");

// How a transaction changes its account balance. Paused or disputed payments change nothing.
function balanceEffect(tx) {
  if (!tx.accountId || !["NONE", "CONFIRMED"].includes(tx.reviewStatus))
    return null;
  return {
    accountId: tx.accountId,
    delta: tx.type === "CREDIT" ? tx.amount : -tx.amount,
  };
}

async function assertAccountOwned(userId, accountId) {
  if (!accountId) return null;
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new HttpError(400, "Account not found");
  return account.id;
}

// Turns a request body into safe database fields (throws 400 if anything is invalid)
function parsePayload(body = {}) {
  const merchant = cleanText(body.merchant, 80);
  if (!merchant) throw new HttpError(400, "Merchant is required");

  return {
    merchant,
    amount: parseAmount(body.amount),
    category: parseCategory(body.category),
    type: body.type ? parseType(body.type) : "DEBIT",
    note: cleanText(body.note, 200) || null,
    date: parseDate(body.date),
    paymentMethod: cleanText(body.paymentMethod, 60) || null,
    location: cleanText(body.location, 60) || null,
    accountId:
      typeof body.accountId === "string" && body.accountId
        ? body.accountId
        : null,
    // undefined means "leave unchanged" on update
    receiptUrl:
      "receiptUrl" in body ? parseReceiptUrl(body.receiptUrl) : undefined,
  };
}

// GET /api/transactions?search=&category=&accountId=&month=&year=&page=1&limit=30
exports.getAll = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  const where = { userId: req.userId };
  if (req.query.category) where.category = parseCategory(req.query.category);
  if (req.query.accountId) where.accountId = String(req.query.accountId);
  if (req.query.search) {
    where.merchant = {
      contains: String(req.query.search).slice(0, 80),
      mode: "insensitive",
    };
  }
  if (req.query.month || req.query.year) {
    const { year, month } = parseMonthYear(req.query);
    where.date = monthRange(year, month);
  }

  const items = await prisma.transaction.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * limit,
    take: limit,
  });

  res.json(items);
});

// POST /api/transactions
exports.create = asyncHandler(async (req, res) => {
  const data = parsePayload(req.body);
  data.accountId = await assertAccountOwned(req.userId, data.accountId);

  const tx = await prisma.$transaction(async (db) => {
    const created = await db.transaction.create({
      data: {
        ...data,
        receiptUrl: data.receiptUrl ?? null,
        userId: req.userId,
      },
    });
    const effect = balanceEffect(created);
    if (effect) {
      await db.account.update({
        where: { id: effect.accountId },
        data: { balance: { increment: effect.delta } },
      });
    }
    return created;
  });

  checkBudgetAfterExpense(tx).catch((err) =>
    console.error("Budget alert failed:", err.message),
  );
  res.status(201).json(tx);
});

// PUT /api/transactions/:id
exports.update = asyncHandler(async (req, res) => {
  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new HttpError(404, "Transaction not found");

  const data = parsePayload(req.body);
  data.accountId = await assertAccountOwned(req.userId, data.accountId);

  const tx = await prisma.$transaction(async (db) => {
    const updated = await db.transaction.update({
      where: { id: existing.id },
      data,
    });

    // Undo the old balance effect, then apply the new one
    const before = balanceEffect(existing);
    if (before) {
      await db.account.update({
        where: { id: before.accountId },
        data: { balance: { increment: -before.delta } },
      });
    }
    const after = balanceEffect(updated);
    if (after) {
      await db.account.update({
        where: { id: after.accountId },
        data: { balance: { increment: after.delta } },
      });
    }
    return updated;
  });

  checkBudgetAfterExpense(tx, existing).catch((err) =>
    console.error("Budget alert failed:", err.message),
  );
  res.json(tx);
});

// DELETE /api/transactions/:id
exports.remove = asyncHandler(async (req, res) => {
  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new HttpError(404, "Transaction not found");

  await prisma.$transaction(async (db) => {
    await db.transaction.delete({ where: { id: existing.id } });
    const effect = balanceEffect(existing);
    if (effect) {
      await db.account.update({
        where: { id: effect.accountId },
        data: { balance: { increment: -effect.delta } },
      });
    }
  });

  res.json({ success: true });
});

// POST /api/transactions/:id/review  { decision: "RECOGNIZED" | "NOT_ME" }
exports.review = asyncHandler(async (req, res) => {
  const decision = String((req.body || {}).decision || "");
  if (!["RECOGNIZED", "NOT_ME"].includes(decision)) {
    throw new HttpError(400, "decision must be RECOGNIZED or NOT_ME");
  }

  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new HttpError(404, "Transaction not found");
  if (existing.reviewStatus !== "PENDING")
    throw new HttpError(409, "This payment was already reviewed");

  const tx = await prisma.$transaction(async (db) => {
    const updated = await db.transaction.update({
      where: { id: existing.id },
      data: {
        reviewStatus: decision === "RECOGNIZED" ? "CONFIRMED" : "DISPUTED",
      },
    });
    // A recognized payment now counts: apply it to the account balance
    const effect = balanceEffect(updated);
    if (effect) {
      await db.account.update({
        where: { id: effect.accountId },
        data: { balance: { increment: effect.delta } },
      });
    }
    return updated;
  });

  if (decision === "RECOGNIZED") {
    checkBudgetAfterExpense(tx).catch((err) =>
      console.error("Budget alert failed:", err.message),
    );
  }
  res.json(tx);
});

// GET /api/transactions/summary?month=&year=   (defaults to the current month)
exports.summary = asyncHandler(async (req, res) => {
  const { year, month } = parseMonthYear(req.query);
  const date = monthRange(year, month);

  const [debits, credits, paused] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["category"],
      where: { userId: req.userId, type: "DEBIT", date, ...COUNTED },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: req.userId, type: "CREDIT", date, ...COUNTED },
      _sum: { amount: true },
    }),
    prisma.transaction.count({
      where: { userId: req.userId, reviewStatus: "PENDING" },
    }),
  ]);

  const byCategory = {};
  let total = 0;
  let count = 0;
  for (const g of debits) {
    const amount = g._sum.amount || 0;
    byCategory[g.category] = round2(amount);
    total += amount;
    count += g._count._all;
  }

  res.json({
    total: round2(total),
    income: round2(credits._sum.amount || 0),
    count,
    byCategory,
    pausedCount: paused,
    month,
    year,
  });
});

// Escape a value for CSV and neutralise spreadsheet formulas
function csvCell(value) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

// GET /api/transactions/export.csv
exports.exportCsv = asyncHandler(async (req, res) => {
  const txs = await prisma.transaction.findMany({
    where: { userId: req.userId },
    orderBy: { date: "desc" },
  });

  const header = "Date,Merchant,Category,Amount,Type,Note";
  const rows = txs.map((t) =>
    [
      t.date.toISOString().slice(0, 10),
      csvCell(t.merchant),
      t.category,
      t.amount,
      t.type,
      csvCell(t.note),
    ].join(","),
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
  res.send([header, ...rows].join("\n"));
});
