const prisma = require("./prisma");
const { CATEGORIES } = require("./validate");
const { periodRange, periodOf, round2 } = require("./dates");

// Paused and disputed payments never count in totals, balances or budgets
const COUNTED = { reviewStatus: { in: ["NONE", "CONFIRMED"] } };

// ----- Budgets: a limit applies from its period onwards until a later period overrides it -----

// Returns the effective limit for every category that has one in `period`
async function getBudgetsForPeriod(userId, period) {
  const rows = await prisma.budget.findMany({
    where: { userId, period: { lte: period } },
    orderBy: { period: "desc" },
  });

  const byCategory = new Map();
  for (const row of rows) {
    if (!byCategory.has(row.category)) byCategory.set(row.category, row); // newest period first
  }

  return [...byCategory.values()]
    .filter((row) => row.limit > 0) // 0 means "no limit from this period on"
    .map((row) => ({
      id: row.id,
      category: row.category,
      limit: row.limit,
      period: row.period,
      inherited: row.period !== period,
    }));
}

async function effectiveBudgetFor(userId, category, period) {
  const list = await getBudgetsForPeriod(userId, period);
  return list.find((b) => b.category === category) || null;
}

// Counted spending per category for a period: { FOOD: 420.2, ... }
async function spentByCategory(userId, period) {
  const { gte, lt } = periodRange(period);
  const groups = await prisma.transaction.groupBy({
    by: ["category"],
    where: { userId, type: "DEBIT", date: { gte, lt }, ...COUNTED },
    _sum: { amount: true },
  });
  const result = {};
  for (const g of groups) result[g.category] = round2(g._sum.amount || 0);
  return result;
}

// ----- Safe to spend -----

// Pure formula, easy to test
function calcSafeToSpend({ checking, buffer, upcomingBills, plannedSavings }) {
  const raw = checking - buffer - upcomingBills - plannedSavings;
  return {
    safeToSpend: round2(Math.max(0, raw)),
    shortfall: round2(Math.max(0, -raw)),
  };
}

async function computeSafeToSpend(userId, now = new Date()) {
  const period = periodOf(now);
  const { gte, lt } = periodRange(period);

  const [user, accounts, budgets, spent, goals, contributions] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.account.findMany({ where: { userId } }),
      getBudgetsForPeriod(userId, period),
      spentByCategory(userId, period),
      prisma.goal.findMany({ where: { userId } }),
      prisma.goalContribution.groupBy({
        by: ["goalId"],
        where: { goal: { userId }, createdAt: { gte, lt } },
        _sum: { amount: true },
      }),
    ]);

  const checking = round2(
    accounts
      .filter((a) => a.type === "CHECKING")
      .reduce((s, a) => s + a.balance, 0),
  );
  const savings = round2(
    accounts
      .filter((a) => a.type === "SAVINGS")
      .reduce((s, a) => s + a.balance, 0),
  );
  const buffer = user ? user.safetyBuffer : 0;

  // Money still expected to leave for bills this month: the Bills budget that is not yet used
  const billsBudget = budgets.find((b) => b.category === "BILLS");
  const upcomingBills = billsBudget
    ? round2(Math.max(0, billsBudget.limit - (spent.BILLS || 0)))
    : 0;

  // Savings you planned for this month and have not moved yet
  const contributed = new Map(
    contributions.map((c) => [c.goalId, c._sum.amount || 0]),
  );
  const plannedSavings = round2(
    goals
      .filter(
        (g) => g.monthlyContribution > 0 && g.savedAmount < g.targetAmount,
      )
      .reduce(
        (s, g) =>
          s + Math.max(0, g.monthlyContribution - (contributed.get(g.id) || 0)),
        0,
      ),
  );

  const { safeToSpend, shortfall } = calcSafeToSpend({
    checking,
    buffer,
    upcomingBills,
    plannedSavings,
  });
  const through = new Date(lt.getTime() - 24 * 60 * 60 * 1000);

  return {
    safeToSpend,
    shortfall,
    checking,
    savings,
    buffer,
    upcomingBills,
    plannedSavings,
    through: through.toISOString().slice(0, 10),
  };
}

// ----- Saving suggestion -----

// Pure: picks a goal and an amount that keeps the buffer and upcoming bills covered
function pickSavingSuggestion({ safeToSpend, goals }) {
  const open = goals.filter((g) => g.savedAmount < g.targetAmount);
  if (open.length === 0 || safeToSpend <= 0) return null;

  const goal = open.find((g) => g.priority) || open[0];
  const remaining = goal.targetAmount - goal.savedAmount;

  // The plan if there is one, otherwise about 6% of safe-to-spend rounded to 50
  const base =
    goal.monthlyContribution > 0
      ? goal.monthlyContribution
      : Math.max(10, Math.round((safeToSpend * 0.06) / 50) * 50);

  const cap = Math.min(remaining, Math.floor(safeToSpend * 0.4));
  const amount = round2(Math.min(base, cap));
  if (amount < 1) return null;

  return {
    goalId: goal.id,
    goalName: goal.name,
    amount,
    safeToSpend,
    stillHave: round2(safeToSpend - amount),
    fundedAfterPct: Math.round(
      ((goal.savedAmount + amount) / goal.targetAmount) * 100,
    ),
  };
}

async function suggestSaving(userId, safe) {
  const [goals, s] = await Promise.all([
    prisma.goal.findMany({ where: { userId } }),
    safe ? Promise.resolve(safe) : computeSafeToSpend(userId),
  ]);
  return pickSavingSuggestion({ safeToSpend: s.safeToSpend, goals });
}

module.exports = {
  COUNTED,
  CATEGORIES,
  getBudgetsForPeriod,
  effectiveBudgetFor,
  spentByCategory,
  calcSafeToSpend,
  computeSafeToSpend,
  pickSavingSuggestion,
  suggestSaving,
};
