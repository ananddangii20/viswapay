/**
 * Forex rates (simulated)
 * INR as base currency
 */
const FOREX_RATES = {
  USD: 1 / 83,
  EUR: 1 / 90,
  GBP: 1 / 102,
  AED: 1 / 22.5,
  INR: 1
};

/**
 * Convert INR to target currency
 * @param {number} amountINR - Amount in INR
 * @param {string} targetCurrency - Target currency code
 * @returns {object} { convertedAmount, rate, sourceCurrency, targetCurrency }
 */
exports.convert = (amountINR, targetCurrency = "USD") => {
  const rate = FOREX_RATES[targetCurrency] || FOREX_RATES.USD;
  const convertedAmount = parseFloat((amountINR * rate).toFixed(2));

  return {
    convertedAmount,
    rate: parseFloat(rate.toFixed(6)),
    sourceCurrency: "INR",
    targetCurrency,
    timestamp: new Date().toISOString()
  };
};

/**
 * Get all available rates
 */
exports.getAllRates = () => {
  return FOREX_RATES;
};
