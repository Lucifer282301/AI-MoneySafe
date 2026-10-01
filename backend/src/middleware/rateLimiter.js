const rateLimit = require("express-rate-limit");

const WINDOW = 15 * 60 * 1000;

// Login/signup/refresh: 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: WINDOW,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

// AI calls cost quota: 30 per 15 minutes per logged-in user
const aiLimiter = rateLimit({
  windowMs: WINDOW,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
  message: { error: "AI request limit reached. Please wait a few minutes." },
});

// Everything else: 600 per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: WINDOW,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

module.exports = { authLimiter, aiLimiter, generalLimiter };
