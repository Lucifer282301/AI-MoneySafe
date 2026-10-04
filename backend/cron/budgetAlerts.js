require("dotenv/config");

const { Expo } = require("expo-server-sdk");
const prisma = require("../lib/prisma");

const expo = new Expo();

async function sendPush(userId, title, body) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pushToken: true,
      },
    });

    if (!user?.pushToken) {
      console.log(`No push token for user ${userId}`);
      return;
    }

    if (!Expo.isExpoPushToken(user.pushToken)) {
      console.warn(`Invalid Expo push token for user ${userId}`);
      return;
    }

    await expo.sendPushNotificationsAsync([
      {
        to: user.pushToken,
        sound: "default",
        title,
        body,
      },
    ]);

    console.log(`📱 Push notification sent to user ${userId}`);
  } catch (error) {
    console.error("Push notification error:", error);
  }
}

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
  console.log("⏰ Budget alert job started");

  try {
    const budgets = await prisma.budget.findMany();

    console.log(`📊 Checking ${budgets.length} budgets`);

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

      if (limit <= 0) {
        continue;
      }

      const percentage = (total / limit) * 100;

      console.log(
        `💰 ${budget.category}: ₹${total} / ₹${limit} (${Math.round(percentage)}%)`,
      );

      if (percentage >= 100) {
        const alreadySent = await wasAlertSent(budget.id, 100, month);

        if (!alreadySent) {
          await sendPush(
            budget.userId,
            "Budget exceeded ⚠️",
            `You've gone over your ${budget.category} budget.`,
          );

          await recordAlert(budget.id, 100, month);
          console.log(`🚨 100% alert recorded for ${budget.category}`);
        }

        continue;
      }

      if (percentage >= 80) {
        const alreadySent = await wasAlertSent(budget.id, 80, month);

        if (!alreadySent) {
          await sendPush(
            budget.userId,
            "Budget alert",
            `You've used ${Math.round(percentage)}% of your ${budget.category} budget.`,
          );

          await recordAlert(budget.id, 80, month);
          console.log(`⚠️ 80% alert recorded for ${budget.category}`);
        }
      }
    }

    console.log("✅ Budget alerts checked");
  } catch (error) {
    console.error("❌ Budget alert job failed:", error);
    throw error;
  }
}

module.exports = {
  sendPush,
  checkBudgetAlerts,
};
