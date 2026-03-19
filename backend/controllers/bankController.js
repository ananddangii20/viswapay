const { getBankRates } = require("../services/bankRateService");

/**
 * GET /api/bank/rates
 * Get bank rates for a given amount and currency
 */
exports.getBankRates = async (req, res) => {
  try {
    const { amount, currency = "USD" } = req.query;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount required" });
    }

    const rates = await getBankRates(parseFloat(amount), currency);

    res.json({
      amount: parseFloat(amount),
      currency,
      rates
    });

  } catch (error) {
    console.error("Bank rates error:", error);
    res.status(500).json({ message: "Failed to fetch bank rates" });
  }
};

/**
 * POST /api/bank/compare
 * Compare rates across all banks
 */
exports.compareRates = async (req, res) => {
  try {
    const { amount, currency = "USD" } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount required" });
    }

    const rates = await getBankRates(parseFloat(amount), currency);

    // Sort by net amount (highest to lowest - best for customer)
    const sorted = rates.sort((a, b) => b.netAmount - a.netAmount);

    res.json({
      amount: parseFloat(amount),
      currency,
      bestBank: sorted[0],
      allRates: sorted
    });

  } catch (error) {
    console.error("Bank comparison error:", error);
    res.status(500).json({ message: "Failed to compare rates" });
  }
};