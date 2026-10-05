const env = require("./src/config/env");
const app = require("./src/app");
const prisma = require("./src/lib/prisma");

const server = app.listen(env.port, "0.0.0.0", () => {
  console.log(`✦ Server running on http://localhost:${env.port}`);
  console.log(`Environment: ${env.nodeEnv}`);
});

// Remove expired refresh tokens once a day
const cleanup = setInterval(
  async () => {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      console.log(`🧹 Expired refresh tokens removed: ${result.count}`);
    } catch (error) {
      console.error("❌ Token cleanup failed:", error);
    }
  },
  24 * 60 * 60 * 1000,
);

cleanup.unref();

// Graceful shutdown so in-flight requests finish and DB connections close
async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down...`);

  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("✅ Database connection closed");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error("⚠️ Forced shutdown");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
});
