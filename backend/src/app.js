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
const accountRoutes = require("./routes/accountRoutes");
const goalRoutes = require("./routes/goalRoutes");
const transferRoutes = require("./routes/transferRoutes");
const insightRoutes = require("./routes/insightRoutes");
const aiRoutes = require("./routes/aiRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

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

// Routes that receive base64 images get a larger body limit
app.use("/api/ai", express.json({ limit: "12mb" }), aiRoutes);
app.use("/api/uploads", express.json({ limit: "12mb" }), uploadRoutes);
app.use("/api/auth/avatar", express.json({ limit: "3mb" }));

// Everything else: small JSON bodies only
app.use(express.json({ limit: "100kb" }));
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api", insightRoutes); // /overview, /insights/spending, /safety

app.use(notFound);
app.use(errorHandler); // must be last

module.exports = app;
