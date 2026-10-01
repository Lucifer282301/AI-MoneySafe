const prisma = require("../lib/prisma");
const HttpError = require("../lib/httpError");
const asyncHandler = require("../middleware/asyncHandler");
const { parseCategory, parseAmount } = require("../lib/validate");

exports.getAll = asyncHandler(async (req, res) => {
  const budgets = await prisma.budget.findMany({
    where: { userId: req.userId },
    orderBy: { category: "asc" },
  });
  res.json(budgets);
});

// POST /api/budgets — create or update the budget for a category
exports.setBudget = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const category = parseCategory(body.category);
  const limit = parseAmount(body.limit);

  const budget = await prisma.budget.upsert({
    where: { userId_category: { userId: req.userId, category } },
    update: { limit },
    create: { category, limit, userId: req.userId },
  });
  res.json(budget);
});

exports.remove = asyncHandler(async (req, res) => {
  const { count } = await prisma.budget.deleteMany({
    where: { id: req.params.id, userId: req.userId },
  });
  if (count === 0) throw new HttpError(404, "Budget not found");
  res.json({ success: true });
});
