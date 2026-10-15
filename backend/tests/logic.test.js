// Run with: npm test   (plain Node test runner, no database needed)
const test = require("node:test");
const assert = require("node:assert/strict");

// Stub the database client and the generated enums so the pure functions load without a database
const Module = require("module");
const originalLoad = Module._load;
process.env.DATABASE_URL =
  "postgresql://test:test@localhost:5432/test?schema=public";
Module._load = function (request, ...rest) {
  if (request === "@prisma/client") {
    return {
      Category: {
        FOOD: "FOOD",
        TRANSPORT: "TRANSPORT",
        SHOPPING: "SHOPPING",
        ENTERTAINMENT: "ENTERTAINMENT",
        BILLS: "BILLS",
        HEALTH: "HEALTH",
        EDUCATION: "EDUCATION",
        OTHER: "OTHER",
      },
      TransactionType: { DEBIT: "DEBIT", CREDIT: "CREDIT" },
      AccountType: { CHECKING: "CHECKING", SAVINGS: "SAVINGS" },
      PrismaClient: class {},
    };
  }
  if (request === "@prisma/adapter-pg") {
    return { PrismaPg: class {} };
  }
  return originalLoad.call(this, request, ...rest);
};

const { assessPayment } = require("../src/lib/risk");
const { calcSafeToSpend, pickSavingSuggestion } = require("../src/lib/finance");
const { parsePeriod, periodOf } = require("../src/lib/dates");
const {
  parseAmount,
  parseDate,
  parseReceiptUrl,
} = require("../src/lib/validate");
Module._load = originalLoad;

const history = Array.from({ length: 8 }, (_, i) => ({
  merchant: i % 2 ? "Whole Foods" : "Corner Cafe",
  amount: 60 + i,
  category: "FOOD",
  location: "Singapore",
}));

test("a new merchant in a known place is a single signal and is not paused", () => {
  const r = assessPayment(
    {
      merchant: "Tea House",
      amount: 20,
      category: "FOOD",
      location: "Singapore",
    },
    history,
  );
  assert.deepEqual(r.reasons, ["NEW_MERCHANT"]);
  assert.equal(r.flagged, false);
  assert.equal(r.riskLevel, "MEDIUM");
});

test("a new merchant in a new place is paused as high risk", () => {
  const r = assessPayment(
    {
      merchant: "TechNova Online",
      amount: 249,
      category: "SHOPPING",
      location: "Overseas",
    },
    history,
  );
  assert.deepEqual(r.reasons.sort(), ["NEW_LOCATION", "NEW_MERCHANT"]);
  assert.equal(r.flagged, true);
  assert.equal(r.riskLevel, "HIGH");
});

test("an unusually large amount in a known category is flagged with a new merchant", () => {
  const r = assessPayment(
    {
      merchant: "Fancy Place",
      amount: 400,
      category: "FOOD",
      location: "Singapore",
    },
    history,
  );
  assert.ok(r.reasons.includes("HIGH_AMOUNT"));
  assert.equal(r.flagged, true);
});

test("nothing is flagged for a new user with little history", () => {
  const r = assessPayment(
    { merchant: "Anything", amount: 9999, category: "FOOD", location: "Mars" },
    history.slice(0, 3),
  );
  assert.equal(r.flagged, false);
  assert.deepEqual(r.reasons, []);
});

test("safe to spend subtracts buffer, upcoming bills and planned savings, and never goes below zero", () => {
  assert.deepEqual(
    calcSafeToSpend({
      checking: 8420,
      buffer: 1000,
      upcomingBills: 100,
      plannedSavings: 300,
    }),
    {
      safeToSpend: 7020,
      shortfall: 0,
    },
  );
  assert.deepEqual(
    calcSafeToSpend({
      checking: 500,
      buffer: 1000,
      upcomingBills: 0,
      plannedSavings: 0,
    }),
    {
      safeToSpend: 0,
      shortfall: 500,
    },
  );
});

test("saving suggestion uses the priority goal plan and keeps money safe", () => {
  const goals = [
    {
      id: "a",
      name: "Portugal",
      savedAmount: 1500,
      targetAmount: 3000,
      monthlyContribution: 100,
      priority: false,
    },
    {
      id: "b",
      name: "Rainy-day fund",
      savedAmount: 4250,
      targetAmount: 6000,
      monthlyContribution: 150,
      priority: true,
    },
  ];
  const s = pickSavingSuggestion({ safeToSpend: 2480, goals });
  assert.equal(s.goalId, "b");
  assert.equal(s.amount, 150);
  assert.equal(s.stillHave, 2330);
  assert.equal(s.fundedAfterPct, 73);
});

test("saving suggestion is capped at 40% of safe to spend and at what the goal still needs", () => {
  const goals = [
    {
      id: "a",
      name: "Laptop",
      savedAmount: 1490,
      targetAmount: 1500,
      monthlyContribution: 200,
      priority: true,
    },
  ];
  assert.equal(pickSavingSuggestion({ safeToSpend: 2480, goals }).amount, 10);
  const big = [
    {
      id: "a",
      name: "Car",
      savedAmount: 0,
      targetAmount: 20000,
      monthlyContribution: 5000,
      priority: true,
    },
  ];
  assert.equal(
    pickSavingSuggestion({ safeToSpend: 1000, goals: big }).amount,
    400,
  );
});

test("no suggestion when there is nothing safe to move or no open goal", () => {
  assert.equal(
    pickSavingSuggestion({
      safeToSpend: 0,
      goals: [
        { id: "a", savedAmount: 0, targetAmount: 10, monthlyContribution: 5 },
      ],
    }),
    null,
  );
  assert.equal(
    pickSavingSuggestion({
      safeToSpend: 1000,
      goals: [
        { id: "a", savedAmount: 10, targetAmount: 10, monthlyContribution: 5 },
      ],
    }),
    null,
  );
});

test("period helpers", () => {
  assert.equal(periodOf(new Date(Date.UTC(2026, 9, 9))), "2026-10");
  assert.equal(parsePeriod("2026-02"), "2026-02");
  assert.throws(() => parsePeriod("2026-13"));
  assert.throws(() => parsePeriod("October"));
});

test("amounts retain cent precision and reject values that round to zero", () => {
  assert.equal(parseAmount("1.25"), 1.25);
  assert.throws(() => parseAmount(0.001));
});

test("dates must be real calendar days in exact YYYY-MM-DD format", () => {
  assert.equal(
    parseDate("2026-02-28").toISOString(),
    "2026-02-28T00:00:00.000Z",
  );
  assert.throws(() => parseDate("2026-02-30"));
  assert.throws(() => parseDate("2026-02-28T00:00:00Z"));
});

test("receipt URLs must use HTTPS and a real Cloudinary hostname", () => {
  assert.equal(
    parseReceiptUrl("https://res.cloudinary.com/demo/image/upload/receipt.jpg"),
    "https://res.cloudinary.com/demo/image/upload/receipt.jpg",
  );
  assert.equal(
    parseReceiptUrl("https://cloudinary.com.evil.example/receipt.jpg"),
    null,
  );
  assert.equal(parseReceiptUrl("http://res.cloudinary.com/receipt.jpg"), null);
});
