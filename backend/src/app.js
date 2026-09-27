require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const aiRoutes = require("./routes/aiRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Allow the mobile app to call this API from any origin
app.use(cors());

// Parse JSON request bodies (increase limit for base64 images)
app.use(express.json({ limit: "15mb" }));

// Health check endpoint
app.get("/", (req, res) => res.json({ status: "AI-MoneySafe API running ✓" }));

// Mount route groups under /api/*
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/ai", aiRoutes);

// Catch-all error handler — must be LAST
app.use(errorHandler);

module.exports = app;
