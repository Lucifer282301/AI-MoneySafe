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

const pad = (n) => String(n).padStart(2, "0");

// "2026-10" for a date
const periodOf = (date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;

const currentPeriod = () => periodOf(new Date());

// Validates "YYYY-MM"; defaults to the current month when empty
function parsePeriod(value) {
  if (value === undefined || value === null || value === "")
    return currentPeriod();
  const p = String(value);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(p) || Number(p.slice(0, 4)) < 2000) {
    throw new HttpError(400, "period must look like 2026-10");
  }
  return p;
}

// { year, month, gte, lt } for a period string
function periodRange(period) {
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7));
  return { year, month, ...monthRange(year, month) };
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

module.exports = {
  monthRange,
  parseMonthYear,
  periodOf,
  currentPeriod,
  parsePeriod,
  periodRange,
  round2,
};
