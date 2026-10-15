const prisma = require("../lib/prisma");
const asyncHandler = require("../middleware/asyncHandler");
const { parsePeriod, periodRange, round2 } = require("../lib/dates");
const { getBudgetsForPeriod, spentByCategory } = require("../lib/finance");
const { CATEGORIES, parseCategory, parseAmount } = require("../lib/validate");

// GET /api/budgets?period=2026-10
// Every category with its limit (or null), what was spent, and the month's totals.
exports.overview = asyncHandler(async (req, res) => {
  const period = parsePeriod(req.query.period);
  const [budgets, spent] = await Promise.all([
    getBudgetsForPeriod(req.userId, period),
    spentByCategory(req.userId, period),
  ]);

  const categories = CATEGORIES.map((category) => {
    const budget = budgets.find((b) => b.category === category);
    const used = spent[category] || 0;
    return {
      category,
      id: budget ? budget.id : null,
      limit: budget ? budget.limit : null,
      inherited: budget ? budget.inherited : false,
      spent: used,
      left: budget ? round2(budget.limit - used) : null,
      usedPct: budget ? Math.round((used / budget.limit) * 100) : null,
    };
  });

  const totalLimit = round2(budgets.reduce((s, b) => s + b.limit, 0));
  const totalSpent = round2(Object.values(spent).reduce((s, n) => s + n, 0));

  // The category closest to (or over) its limit, for the amber banner
  const alert =
    categories
      .filter((c) => c.usedPct !== null && c.usedPct >= 80)
      .sort((a, b) => b.usedPct - a.usedPct)[0] || null;

  const { lt } = periodRange(period);
  res.json({
    period,
    totalLimit,
    totalSpent,
    left: round2(totalLimit - totalSpent),
    usedPct:
      totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : null,
    through: new Date(lt.getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    categories,
    alert,
  });
});

// POST /api/budgets  { category, limit, period? }  : applies from that month onwards
exports.setBudget = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const category = parseCategory(body.category);
  const limit = parseAmount(body.limit, "Limit");
  const period = parsePeriod(body.period);

  const budget = await prisma.budget.upsert({
    where: { userId_category_period: { userId: req.userId, category, period } },
    update: { limit },
    create: { category, limit, period, userId: req.userId },
  });
  res.json(budget);
});

// DELETE /api/budgets?category=FOOD&period=2026-10 : removes the limit from that month onwards
exports.remove = asyncHandler(async (req, res) => {
  const category = parseCategory(req.query.category);
  const period = parsePeriod(req.query.period);

  const earlier = await prisma.budget.findFirst({
    where: { userId: req.userId, category, period: { lt: period } },
  });

  if (earlier) {
    // An earlier limit would carry forward, so record "no limit" (0) from this month on
    await prisma.budget.upsert({
      where: {
        userId_category_period: { userId: req.userId, category, period },
      },
      update: { limit: 0 },
      create: { category, limit: 0, period, userId: req.userId },
    });
  } else {
    await prisma.budget.deleteMany({
      where: { userId: req.userId, category, period },
    });
  }
  res.json({ success: true });
});
