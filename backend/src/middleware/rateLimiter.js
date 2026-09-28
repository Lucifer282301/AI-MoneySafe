const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

// ==========================================
// AUTH RATE LIMITER
// 10 login/signup attempts per 15 minutes
// ==========================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "Too many attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// AI RATE LIMITER
// 30 AI requests per 15 minutes
// ==========================================
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    error: "AI request limit reached. Please wait a few minutes.",
  },

  // Use logged-in user ID.
  // Fall back to IPv6-safe IP key.
  keyGenerator: (req) => {
    return req.userId || ipKeyGenerator(req.ip);
  },
});

// ==========================================
// GENERAL RATE LIMITER
// 300 requests per 15 minutes per IP
// ==========================================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

module.exports = {
  authLimiter,
  aiLimiter,
  generalLimiter,
};
