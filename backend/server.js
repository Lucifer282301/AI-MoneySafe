const env = require("./src/config/env");
const app = require("./src/app");
const prisma = require("./src/lib/prisma");

const server = app.listen(env.port, "0.0.0.0", () => {
  console.log(`✦ Server running on http://localhost:${env.port}`);
  console.log(`Environment: ${env.nodeEnv}`);
});

// Remove expired refresh tokens once a day
const cleanup = setInterval(
  () => {
    prisma.refreshToken
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .catch((err) => console.error("Token cleanup failed:", err));
  },
  24 * 60 * 60 * 1000,
);

cleanup.unref();

// Graceful shutdown so in-flight requests finish and DB connections close
let shuttingDown = false;
function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  clearInterval(cleanup);
  const timeout = setTimeout(() => {
    console.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10000);
  server.close(async (err) => {
    if (err) console.error("HTTP server shutdown failed:", err);
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error("Database shutdown failed:", disconnectError);
      exitCode = 1;
    } finally {
      clearTimeout(timeout);
      process.exitCode = exitCode;
    }
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown("uncaughtException", 1);
});
