const HttpError = require("./httpError");

// Half-open range [start of month, start of next month) in UTC.
// Using "less than the next month" avoids dropping transactions on the last day.
function monthRange(year, month) {
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  };
}

// Reads ?month=&year= (defaults to the current UTC month)
function parseMonthYear(query = {}) {
  const now = new Date();
  const year = query.year ? Number(query.year) : now.getUTCFullYear();
  const month = query.month ? Number(query.month) : now.getUTCMonth() + 1;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    year < 2000 ||
    year > 2100
  ) {
    throw new HttpError(400, "Invalid month or year");
  }
  return { year, month };
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

module.exports = { monthRange, parseMonthYear, round2 };
