// Decides whether an imported (LINKED) card payment looks unusual.
// Pure functions: no database access, so they are easy to test.

const norm = (s) =>
  String(s || "")
    .trim()
    .toLowerCase();

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mostCommon(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

const MIN_HISTORY = 5; // a brand-new user has no "usual", so nothing is flagged
const HIGH_AMOUNT_FACTOR = 3;
const HIGH_AMOUNT_FLOOR = 50;

/**
 * @param payment  { merchant, amount, category, location }
 * @param history  earlier counted debits: [{ merchant, amount, category, location }]
 * @returns { reasons: string[], riskLevel: 'HIGH'|'MEDIUM'|null, flagged: boolean }
 */
function assessPayment(payment, history) {
  const reasons = [];

  if (history.length >= MIN_HISTORY) {
    const merchant = norm(payment.merchant);
    if (merchant && !history.some((h) => norm(h.merchant) === merchant)) {
      reasons.push("NEW_MERCHANT");
    }

    const sameCategory = history.filter((h) => h.category === payment.category);
    if (sameCategory.length >= 3) {
      const typical = median(sameCategory.map((h) => h.amount));
      if (
        payment.amount > typical * HIGH_AMOUNT_FACTOR &&
        payment.amount >= HIGH_AMOUNT_FLOOR
      ) {
        reasons.push("HIGH_AMOUNT");
      }
    }

    const location = norm(payment.location);
    const known = history.map((h) => norm(h.location)).filter(Boolean);
    if (location && known.length >= 3 && location !== mostCommon(known)) {
      reasons.push("NEW_LOCATION");
    }
  }

  const riskLevel =
    reasons.length >= 2 ? "HIGH" : reasons.length === 1 ? "MEDIUM" : null;
  // One signal alone does not interrupt the user; two or more pause the payment
  return { reasons, riskLevel, flagged: reasons.length >= 2 };
}

module.exports = { assessPayment, median };
