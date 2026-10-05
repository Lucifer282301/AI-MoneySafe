const prisma = require("./prisma");
const { sendToUser } = require("./push");
const { monthRange } = require("./dates");

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

// Check whether two dates belong to the same UTC month
const sameMonth = (a, b) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth();

// Call after creating a transaction:
//   checkBudgetAfterExpense(tx)
//
// Call after editing a transaction:
//   checkBudgetAfterExpense(tx, previous)
//
// Sends at most one notification.
async function checkBudgetAfterExpense(tx, previous = null) {
  // Only expenses can trigger budget alerts
  if (tx.type !== "DEBIT") return;

  // Only alert for the current month
  const now = new Date();

  if (!sameMonth(tx.date, now)) {
    return;
  }

  // Find the budget for this user's category
  const budget = await prisma.budget.findUnique({
    where: {
      userId_category: {
        userId: tx.userId,
        category: tx.category,
      },
    },
  });

  if (!budget || budget.limit <= 0) return;

  // Calculate current spending for this category this month
  const spent = await prisma.transaction.aggregate({
    where: {
      userId: tx.userId,
      category: tx.category,
      type: "DEBIT",
      date: monthRange(now.getUTCFullYear(), now.getUTCMonth() + 1),
    },
    _sum: {
      amount: true,
    },
  });

  const after = spent._sum.amount || 0;

  // If this is an edit, work out how much the OLD transaction
  // contributed to this category/month.
  //
  // Example:
  // Old transaction = Food ₹50
  // New transaction = Food ₹90
  //
  // Current database spending after update = ₹140
  //
  // before = ₹140 - ₹90 + ₹50
  //        = ₹100
  const previousAmount =
    previous &&
    previous.type === "DEBIT" &&
    previous.category === tx.category &&
    sameMonth(previous.date, tx.date)
      ? previous.amount
      : 0;

  // For a new transaction, previousAmount is 0.
  // For an edited transaction, previousAmount is the old amount.
  const before = after - tx.amount + previousAmount;

  // Check whether this transaction moved spending across
  // the 80% or 100% budget threshold.
  const crossed100 = before < budget.limit && after >= budget.limit;

  const crossed80 = before < budget.limit * 0.8 && after >= budget.limit * 0.8;

  // Nothing crossed, so don't send a notification
  if (!crossed100 && !crossed80) return;

  // Get user's currency
  const user = await prisma.user.findUnique({
    where: {
      id: tx.userId,
    },
  });

  const money = (n) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: user?.currency || "INR",
      maximumFractionDigits: 0,
    }).format(n);

  const label = CATEGORY_LABELS[tx.category] || tx.category;

  const pct = Math.round((after / budget.limit) * 100);

  // Send push notification
  await sendToUser(tx.userId, {
    title: crossed100
      ? `${label} budget exceeded`
      : `${label} budget at ${pct}%`,

    body: `You have spent ${money(after)} of ${money(
      budget.limit,
    )} this month.`,

    data: {
      type: "budget_alert",
      screen: "Budgets",
      category: tx.category,
    },
  });
}

module.exports = {
  checkBudgetAfterExpense,
};
