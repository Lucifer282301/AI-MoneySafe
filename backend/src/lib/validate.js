const { Category, TransactionType, AccountType } = require("@prisma/client");
const HttpError = require("./httpError");
const { round2 } = require("./dates");

const CATEGORIES = Object.values(Category);
const TYPES = Object.values(TransactionType);
const ACCOUNT_TYPES = Object.values(AccountType);

function parseCategory(value) {
  const c = String(value || "").toUpperCase();
  if (!CATEGORIES.includes(c)) {
    throw new HttpError(
      400,
      `Invalid category. Use one of: ${CATEGORIES.join(", ")}`,
    );
  }
  return c;
}

function parseType(value) {
  const t = String(value || "").toUpperCase();
  if (!TYPES.includes(t)) {
    throw new HttpError(400, "Type must be DEBIT or CREDIT");
  }
  return t;
}

function parseAccountType(value) {
  const t = String(value || "").toUpperCase();
  if (!ACCOUNT_TYPES.includes(t)) {
    throw new HttpError(
      400,
      `Account type must be one of: ${ACCOUNT_TYPES.join(", ")}`,
    );
  }
  return t;
}

function parseAmount(value, label = "Amount") {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 1e9) {
    throw new HttpError(400, `${label} must be a number greater than 0`);
  }
  const amount = round2(n);
  if (amount <= 0) {
    throw new HttpError(400, `${label} must be at least 0.01`);
  }
  return amount;
}

// Like parseAmount but allows zero and negatives (account balances)
function parseBalance(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > 1e10) {
    throw new HttpError(400, "Balance must be a number");
  }
  return round2(n);
}

function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, "Date must be in YYYY-MM-DD format");
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, "Invalid date");
  }
  return d;
}

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Only accept image URLs that point to Cloudinary over HTTPS
function parseReceiptUrl(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    const u = new URL(value);
    if (
      u.protocol === "https:" &&
      (u.hostname === "cloudinary.com" ||
        u.hostname.endsWith(".cloudinary.com"))
    ) {
      return value.slice(0, 500);
    }
  } catch {
    // fall through
  }
  return null;
}

module.exports = {
  CATEGORIES,
  parseCategory,
  parseType,
  parseAccountType,
  parseAmount,
  parseBalance,
  parseDate,
  cleanText,
  parseReceiptUrl,
};
