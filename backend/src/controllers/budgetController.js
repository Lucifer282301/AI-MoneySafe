const prisma = require("../lib/prisma");

exports.getAll = async (req, res) => {
  const budgets = await prisma.budget.findMany({
    where: { userId: req.userId },
  });
  res.json(budgets);
};

// POST /api/budgets — create OR update (upsert) a category budget
exports.setBudget = async (req, res) => {
  const { category, limit } = req.body;
  if (!category || !limit) {
    return res.status(400).json({ error: "category and limit required" });
  }

  const budget = await prisma.budget.upsert({
    where: {
      // This composite key matches the @@unique in schema.prisma
      userId_category: { userId: req.userId, category: category.toUpperCase() },
    },
    update: { limit: parseFloat(limit) }, // runs if a budget already exists
    create: {
      // runs if it doesn't
      category: category.toUpperCase(),
      limit: parseFloat(limit),
      userId: req.userId,
    },
  });

  res.json(budget);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  await prisma.budget.deleteMany({ where: { id, userId: req.userId } });
  res.json({ success: true });
};
