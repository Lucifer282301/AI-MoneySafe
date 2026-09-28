const app = require("./src/app");
const cron = require("node-cron");
const { checkBudgetAlerts } = require("./src/lib/pushNotifications");

const PORT = process.env.PORT || 4000;

// Runs every day at 9:00 AM India time
cron.schedule("0 9 * * *", checkBudgetAlerts, { timezone: "Asia/Kolkata" });

app.listen(PORT, () => {
  console.log(`✦ Server running on http://localhost:${PORT}`);
});
