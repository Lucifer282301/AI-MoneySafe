const prisma = require("../lib/prisma");
const asyncHandler = require("../middleware/asyncHandler");
const {
  monthRange,
  parseMonthYear,
  periodOf,
  round2,
} = require("../lib/dates");
const { COUNTED, getBudgetsForPeriod } = require("../lib/finance");

// GET /api/insights/spending?month=&year=
// Cumulative spending by day, the budget left, top categories, and a comparison with last month.
exports.spending = asyncHandler(async (req, res) => {
  const { year, month } = parseMonthYear(req.query);
  const range = monthRange(year, month);
  const now = new Date();
  const isCurrent =
    now.getUTCFullYear() === year && now.getUTCMonth() + 1 === month;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cutoff = isCurrent ? now.getUTCDate() : daysInMonth;

  const txs = await prisma.transaction.findMany({
    where: { userId: req.userId, type: "DEBIT", date: range, ...COUNTED },
    select: { date: true, amount: true, category: true },
  });

  const perDay = new Array(cutoff + 1).fill(0);
  const perCategory = {};
  for (const t of txs) {
    const day = t.date.getUTCDate();
    if (day <= cutoff) perDay[day] += t.amount;
    perCategory[t.category] = (perCategory[t.category] || 0) + t.amount;
  }

  const series = [];
  let running = 0;
  for (let day = 1; day <= cutoff; day += 1) {
    running += perDay[day];
    series.push({ day, total: round2(running) });
  }
  const total = round2(txs.reduce((s, t) => s + t.amount, 0));

  // Same point in the previous month
  const prev = new Date(Date.UTC(year, month - 2, 1));
  const prevDays = new Date(
    Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const prevCutoff = Math.min(cutoff, prevDays);
  const prevAgg = await prisma.transaction.aggregate({
    where: {
      userId: req.userId,
      type: "DEBIT",
      date: {
        gte: prev,
        lt: new Date(
          Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prevCutoff + 1),
        ),
      },
      ...COUNTED,
    },
    _sum: { amount: true },
  });
  const previousSamePoint = round2(prevAgg._sum.amount || 0);

  const budgets = await getBudgetsForPeriod(req.userId, periodOf(range.gte));
  const budgetTotal = round2(budgets.reduce((s, b) => s + b.limit, 0));

  const topCategories = Object.entries(perCategory)
    .map(([category, amount]) => ({ category, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 2);

  const pausedCount = await prisma.transaction.count({
    where: { userId: req.userId, reviewStatus: "PENDING" },
  });

  res.json({
    year,
    month,
    cutoffDay: cutoff,
    series,
    total,
    budgetTotal,
    leftPct:
      budgetTotal > 0
        ? Math.max(0, Math.round(100 - (total / budgetTotal) * 100))
        : null,
    topCategories,
    comparison: {
      previousSamePoint,
      pct:
        previousSamePoint > 0
          ? Math.round(((total - previousSamePoint) / previousSamePoint) * 100)
          : null,
      previousMonth: prev.getUTCMonth() + 1,
    },
    pausedCount,
  });
});
