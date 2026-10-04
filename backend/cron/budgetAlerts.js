const prisma = require("../lib/prisma");
const { sendPush } = require("../src/lib/pushNotifications");

async function wasAlertSent(budgetId, threshold, month) {
  const alert = await prisma.budgetAlert.findUnique({
    where: {
      budgetId_threshold_month: {
        budgetId,
        threshold,
        month,
      },
    },
  });

  return Boolean(alert);
}

async function recordAlert(budgetId, threshold, month) {
  await prisma.budgetAlert.create({
    data: {
      budgetId,
      threshold,
      month,
    },
  });
}

async function checkBudgetAlerts() {
  const budgets = await prisma.budget.findMany();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  for (const budget of budgets) {
    const spent = await prisma.transaction.aggregate({
      where: {
        userId: budget.userId,
        category: budget.category,
        type: "DEBIT",
        date: {
          gte: startOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const total = Number(spent._sum.amount || 0);
    const limit = Number(budget.limit);

    if (limit <= 0) continue;

    const percentage = (total / limit) * 100;

    const threshold = percentage >= 100 ? 100 : percentage >= 80 ? 80 : null;
    if (
      threshold === null ||
      (await wasAlertSent(budget.id, threshold, month))
    ) {
      continue;
    }

    const delivered = await sendPush(
      budget.userId,
      threshold === 100 ? "Budget exceeded" : "Budget alert",
      threshold === 100
        ? `You've gone over your ${budget.category} budget.`
        : `You've used ${Math.round(percentage)}% of your ${budget.category} budget.`,
    );

    if (delivered) await recordAlert(budget.id, threshold, month);
  }
}

module.exports = {
  checkBudgetAlerts,
};
