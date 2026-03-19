/**
 * Bank forex rates and processing fees
 */
const BANKS = [
  { bankName: "HDFC", exchangeRate: 0.01205, processingFee: 200 },
  { bankName: "ICICI", exchangeRate: 0.01185, processingFee: 150 },
  { bankName: "Axis", exchangeRate: 0.01215, processingFee: 180 },
  { bankName: "Wise", exchangeRate: 0.01235, processingFee: 100 }
];

/**
 * Get bank rates for given amount
 * @param {number} amountINR - Amount in INR
 * @param {string} targetCurrency - Target currency (not used in rates, for reference)
 * @returns {array} Bank options with converted amounts
 */
exports.getBankRates = (amountINR, targetCurrency = "USD") => {
  return BANKS.map((bank) => ({
    bankName: bank.bankName,
    exchangeRate: bank.exchangeRate,
    processingFee: bank.processingFee,
    convertedAmount: parseFloat((amountINR * bank.exchangeRate).toFixed(2)),
    netAmount: parseFloat((amountINR * bank.exchangeRate - bank.processingFee).toFixed(2)),
    targetCurrency
  }));
};
