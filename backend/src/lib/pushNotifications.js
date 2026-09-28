const { Expo } = require("expo-server-sdk");
const prisma = require("./prisma");

const expo = new Expo();

// ==========================================
// SEND PUSH NOTIFICATION
// ==========================================
async function sendPush(userId, title, body) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    // No token
    if (!user?.pushToken) {
      return;
    }
    // Invalid Expo token
    if (!Expo.isExpoPushToken(user.pushToken)) {
      console.warn(`Invalid Expo push token for user ${userId}`);
      return;
    }
    await expo.sendPushNotificationsAsync([
      { to: user.pushToken, sound: "default", title, body },
    ]);
  } catch (error) {
    console.error("Push notification error:", error);
  }
}

// ==========================================
// CHECK IF ALERT WAS ALREADY SENT
// ==========================================
async function wasAlertSent(budgetId, threshold, month) {
  const alert = await prisma.budgetAlert.findUnique({
    where: { budgetId_threshold_month: { budgetId, threshold, month } },
  });
  return Boolean(alert);
}

// ==========================================
// RECORD ALERT
// ==========================================
async function recordAlert(budgetId, threshold, month) {
  await prisma.budgetAlert.create({ data: { budgetId, threshold, month } });
}

// ==========================================
// CHECK BUDGET ALERTS
// Runs every day at 9 AM
// ==========================================
async function checkBudgetAlerts() {
  try {
    console.log("Checking budget alerts...");
    // Get all budgets
    const budgets = await prisma.budget.findMany();
    const now = new Date();
    // First day of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Example: 2026-09
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    for (const budget of budgets) {
      // ==========================================
      // CALCULATE MONTHLY SPENDING
      // ==========================================
      const spent = await prisma.transaction.aggregate({
        where: {
          userId: budget.userId,
          category: budget.category,
          type: "DEBIT",
          date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      });
      const total = Number(spent._sum.amount || 0);
      const limit = Number(budget.limit);

      // Prevent division by zero
      if (limit <= 0) {
        continue;
      }
      const percentage = (total / limit) * 100;

      // ==========================================
      // 100% ALERT
      // ==========================================
      if (percentage >= 100) {
        const alreadySent = await wasAlertSent(budget.id, 100, month);
        if (!alreadySent) {
          await sendPush(
            budget.userId,
            "Budget exceeded ⚠️",
            `You've gone over your ${budget.category} budget.`,
          );
          await recordAlert(budget.id, 100, month);
        }
        // Don't send 80% after 100%
        continue;
      }

      // ==========================================
      // 80% ALERT
      // ==========================================
      if (percentage >= 80) {
        const alreadySent = await wasAlertSent(budget.id, 80, month);
        if (!alreadySent) {
          await sendPush(
            budget.userId,
            "Budget alert",
            `You've used ${Math.round(percentage)}% of your ${budget.category} budget.`,
          );
          await recordAlert(budget.id, 80, month);
        }
      }
    }
    console.log("✓ Budget alerts checked");
  } catch (error) {
    console.error("Budget alert job failed:", error);
  }
}

module.exports = { sendPush, checkBudgetAlerts };
