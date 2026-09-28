// src/lib/exchangeRates.js

let cache = {
  rates: null,
  fetchedAt: 0,
};

const ONE_DAY = 24 * 60 * 60 * 1000;

// Get USD -> other currency rates
async function getRates() {
  if (cache.rates && Date.now() - cache.fetchedAt < ONE_DAY) {
    return cache.rates;
  }

  const response = await fetch("https://open.er-api.com/v6/latest/USD");

  if (!response.ok) {
    throw new Error("Failed to fetch exchange rates");
  }

  const data = await response.json();

  if (!data.rates) {
    throw new Error("Invalid exchange rate response");
  }

  cache = {
    rates: data.rates,
    fetchedAt: Date.now(),
  };

  return data.rates;
}

// Convert FROM currency TO USD
//
// Example:
// INR = 83.2
// ₹8320 / 83.2 = $100
async function toBaseCurrency(amount, fromCurrency) {
  const currency = fromCurrency.toUpperCase();

  if (currency === "USD") {
    return {
      amountBase: amount,
      rate: 1,
    };
  }

  const rates = await getRates();

  const rate = rates[currency];

  if (!rate) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  return {
    amountBase: amount / rate,
    rate,
  };
}

module.exports = {
  getRates,
  toBaseCurrency,
};
