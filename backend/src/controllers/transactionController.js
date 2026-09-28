const prisma = require("../lib/prisma");
const { toBaseCurrency } = require("../lib/exchangeRates");

// GET /api/transactions?search=&category=&month=9&year=2026
exports.getAll = async (req, res) => {
  const { search, category, month, year } = req.query;

  const where = { userId: req.userId }; // always scoped to logged-in user

  if (category) where.category = category.toUpperCase();
  if (search) {
    where.merchant = { contains: search, mode: "insensitive" };
  }
  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
  });

  res.json(transactions);
};

// POST /api/transactions
exports.create = async (req, res) => {
  try {
    const { merchant, amount, category, type, note, date, currency } = req.body;

    // Validate required fields
    if (!merchant || amount === undefined || !category || !date) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const parsedAmount = parseFloat(amount);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        error: "Amount must be a valid positive number",
      });
    }

    // Get user's preferred currency
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        currency: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Request currency > user's preference > INR
    const currencyCode = (currency || user.currency || "INR")
      .trim()
      .toUpperCase();

    // Convert original amount to USD
    const { amountBase, rate } = await toBaseCurrency(
      parsedAmount,
      currencyCode,
    );

    const tx = await prisma.transaction.create({
      data: {
        merchant,
        amount: parsedAmount, // Original amount
        currency: currencyCode, // Original currency
        amountBase, // USD normalized amount
        exchangeRate: rate, // Currency -> USD rate
        category: category.toUpperCase(),
        type: (type || "DEBIT").toUpperCase(),
        note: note || null,
        date: new Date(date),
        userId: req.userId,
      },
    });

    return res.status(201).json(tx);
  } catch (error) {
    console.error("Create transaction error:", error);

    return res.status(500).json({
      error: "Failed to create transaction",
    });
  }
};

// DELETE /api/transactions/:id
exports.remove = async (req, res) => {
  const { id } = req.params;

  // Ensure the transaction belongs to the requesting user before deleting
  const tx = await prisma.transaction.findFirst({
    where: { id, userId: req.userId },
  });
  if (!tx) return res.status(404).json({ error: "Transaction not found" });

  await prisma.transaction.delete({ where: { id } });
  res.json({ success: true });
};

// GET /api/transactions/summary — totals for dashboard
exports.summary = async (req, res) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const txs = await prisma.transaction.findMany({
    where: {
      userId: req.userId,
      type: "DEBIT",
      date: { gte: start, lte: end },
    },
  });

  const total = txs.reduce((s, t) => s + t.amount, 0);

  // Group totals by category
  const byCategory = {};
  txs.forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });

  res.json({ total, count: txs.length, byCategory });
};

// GET /api/transactions/export.csv
exports.exportCsv = async (req, res) => {
  const txs = await prisma.transaction.findMany({
    where: { userId: req.userId },
    orderBy: { date: "desc" },
  });

  const header = "Date,Merchant,Category,Amount,Type,Note";
  const rows = txs.map(
    (t) =>
      `${t.date.toISOString().split("T")[0]},"${t.merchant}",${t.category},${t.amount},${t.type},"${t.note || ""}"`,
  );
  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
  res.send(csv);
};
