const env = require("./config/env"); // must be first: validates the environment
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const prisma = require("./lib/prisma");
const asyncHandler = require("./middleware/asyncHandler");
const { generalLimiter } = require("./middleware/rateLimiter");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

app.set("trust proxy", 1); // one reverse proxy in front (Railway, Render, Nginx)
app.use(helmet());

// Native mobile apps don't need CORS. Only enable it for browser origins you list.
if (env.corsOrigins.length) {
  app.use(cors({ origin: env.corsOrigins }));
}

app.get("/", (req, res) => res.json({ status: "AI-MoneySafe API running" }));

// Health check (before the rate limiter so platform probes are never blocked)
app.get(
  "/health",
  asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  }),
);

app.use(generalLimiter);

// AI routes accept base64 images, so they get a larger body limit
app.use("/api/ai", express.json({ limit: "12mb" }), aiRoutes);

// Everything else: small JSON bodies only
app.use(express.json({ limit: "100kb" }));
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);

app.use(notFound);
app.use(errorHandler); // must be last

module.exports = app;
