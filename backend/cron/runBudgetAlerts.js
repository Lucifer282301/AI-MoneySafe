require("dotenv/config");

const prisma = require("../lib/prisma");
const { checkBudgetAlerts } = require("./budgetAlerts");

async function run() {
  try {
    await checkBudgetAlerts();
  } catch (error) {
    console.error("❌ Budget alert cron failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
