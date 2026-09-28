require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const aiRoutes = require("./routes/aiRoutes");
const errorHandler = require("./middleware/errorHandler");
const { generalLimiter } = require("./middleware/rateLimiter");

const app = express();

// Allow the mobile app to call this API
app.use(cors());

// Parse JSON request bodies
app.use(express.json({ limit: "15mb" }));

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ status: "AI-MoneySafe API running ✓" });
});
// Apply general rate limiter to API routes
app.use(generalLimiter);

// Mount route groups
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/ai", aiRoutes);

// Error handler must be last
app.use(errorHandler);

module.exports = app;
