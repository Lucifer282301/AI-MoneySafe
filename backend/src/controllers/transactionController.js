const prisma = require("../lib/prisma");
const HttpError = require("../lib/httpError");
const asyncHandler = require("../middleware/asyncHandler");
const { monthRange, parseMonthYear, round2 } = require("../lib/dates");
const {
  parseCategory,
  parseType,
  parseAmount,
  parseDate,
  cleanText,
  parseReceiptUrl,
} = require("../lib/validate");
const { checkBudgetAfterExpense } = require("../lib/budgetAlerts");

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
    // undefined means "leave unchanged" on update
    receiptUrl:
      "receiptUrl" in body ? parseReceiptUrl(body.receiptUrl) : undefined,
  };
}

// GET /api/transactions?search=&category=&month=&year=&page=1&limit=30
exports.getAll = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  const where = { userId: req.userId };
  if (req.query.category) where.category = parseCategory(req.query.category);
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
  const tx = await prisma.transaction.create({
    data: { ...data, receiptUrl: data.receiptUrl ?? null, userId: req.userId },
  });

  // Fire and forget: never make the user wait for push delivery
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

  const tx = await prisma.transaction.update({
    where: { id: existing.id },
    data: parsePayload(req.body),
  });

  // Compare spending before and after the edit.
  // Never make the user wait for push delivery.
  checkBudgetAfterExpense(tx, existing).catch((err) =>
    console.error("Budget alert failed:", err.message),
  );
  res.json(tx);
});

// DELETE /api/transactions/:id
exports.remove = asyncHandler(async (req, res) => {
  const { count } = await prisma.transaction.deleteMany({
    where: { id: req.params.id, userId: req.userId },
  });
  if (count === 0) throw new HttpError(404, "Transaction not found");
  res.json({ success: true });
});

// GET /api/transactions/summary?month=&year=   (defaults to the current month)
exports.summary = asyncHandler(async (req, res) => {
  const { year, month } = parseMonthYear(req.query);
  const date = monthRange(year, month);

  const [debits, credits] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["category"],
      where: { userId: req.userId, type: "DEBIT", date },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: req.userId, type: "CREDIT", date },
      _sum: { amount: true },
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
    month,
    year,
  });
});

// GET /api/transactions/trend?months=6
// Income and spending per month for the last N months (oldest first), used by the app's bar chart
exports.trend = asyncHandler(async (req, res) => {
  const count = Math.min(Math.max(parseInt(req.query.months, 10) || 6, 1), 12);
  const now = new Date();

  const months = Array.from({ length: count }, (_, i) => {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1),
    );
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
  });

  const points = await Promise.all(
    months.map(async ({ year, month }) => {
      const date = monthRange(year, month);
      const [debit, credit] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId: req.userId, type: "DEBIT", date },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId: req.userId, type: "CREDIT", date },
          _sum: { amount: true },
        }),
      ]);
      return {
        year,
        month,
        expense: round2(debit._sum.amount || 0),
        income: round2(credit._sum.amount || 0),
      };
    }),
  );

  res.json(points);
});

// Escape a value for CSV and neutralize spreadsheet formulas
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
