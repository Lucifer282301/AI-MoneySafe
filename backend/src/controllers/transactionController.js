const prisma = require("../lib/prisma");

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
  const { merchant, amount, category, type, note, date } = req.body;

  if (!merchant || !amount || !category || !date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const tx = await prisma.transaction.create({
    data: {
      merchant,
      amount: parseFloat(amount),
      category: category.toUpperCase(),
      type: (type || "debit").toUpperCase(),
      note: note || null,
      date: new Date(date),
      userId: req.userId, // from auth middleware
    },
  });

  res.status(201).json(tx);
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
