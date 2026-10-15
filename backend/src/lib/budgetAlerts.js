const prisma = require("./prisma");
const { sendToUser } = require("./push");
const { periodOf, periodRange } = require("./dates");
const { COUNTED, effectiveBudgetFor } = require("./finance");

const CATEGORY_LABELS = {
  FOOD: "Food",
  TRANSPORT: "Transport",
  SHOPPING: "Shopping",
  ENTERTAINMENT: "Entertainment",
  BILLS: "Bills",
  HEALTH: "Health",
  EDUCATION: "Education",
  OTHER: "Other",
};

const sameMonth = (a, b) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth();

// Call after creating, editing or confirming an expense. Pass the transaction as it was BEFORE
// an edit as `previous`. Sends at most one notification, only when 80% or 100% was just crossed.
async function checkBudgetAfterExpense(tx, previous = null) {
  if (tx.type !== "DEBIT" || !["NONE", "CONFIRMED"].includes(tx.reviewStatus))
    return;

  const now = new Date();
  if (!sameMonth(tx.date, now)) return; // only alert for the current month

  const period = periodOf(now);
  const budget = await effectiveBudgetFor(tx.userId, tx.category, period);
  if (!budget) return;

  const { gte, lt } = periodRange(period);
  const spent = await prisma.transaction.aggregate({
    where: {
      userId: tx.userId,
      category: tx.category,
      type: "DEBIT",
      date: { gte, lt },
      ...COUNTED,
    },
    _sum: { amount: true },
  });

  const after = spent._sum.amount || 0;

  const previousAmount =
    previous &&
    previous.type === "DEBIT" &&
    ["NONE", "CONFIRMED"].includes(previous.reviewStatus) &&
    previous.category === tx.category &&
    sameMonth(previous.date, tx.date)
      ? previous.amount
      : 0;

  const before = after - tx.amount + previousAmount;

  const crossed100 = before < budget.limit && after >= budget.limit;
  const crossed80 = before < budget.limit * 0.8 && after >= budget.limit * 0.8;
  if (!crossed100 && !crossed80) return;

  const user = await prisma.user.findUnique({ where: { id: tx.userId } });
  const money = (n) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: user?.currency || "INR",
      maximumFractionDigits: 0,
    }).format(n);

  const label = CATEGORY_LABELS[tx.category] || tx.category;
  const pct = Math.round((after / budget.limit) * 100);

  await sendToUser(tx.userId, {
    title: crossed100
      ? `${label} budget exceeded`
      : `${label} budget at ${pct}%`,
    body: `You have spent ${money(after)} of ${money(budget.limit)} this month.`,
    data: { type: "budget_alert", screen: "Budgets", category: tx.category },
  });
}

module.exports = { checkBudgetAfterExpense };
