/**
 * Fraud detection engine with detailed reasoning
 * @param {number} amount - Transaction amount in INR
 * @param {string} receiverEmail - Receiver email
 * @param {boolean} isNewReceiver - Is this a new receiver for sender
 * @returns {object} { level, score, message, reasons: [] }
 */
exports.checkFraud = async (amount, receiverEmail, isNewReceiver = false) => {
  let score = 0;
  let level = "LOW";
  let message = "Transaction appears safe.";
  const reasons = [];

  // Amount-based scoring
  if (amount > 100000) {
    score += 40;
    level = "HIGH";
    message = "High amount transfer detected.";
    reasons.push({
      type: "High Transfer Amount",
      severity: "high",
      description: `Amount ₹${amount} exceeds normal threshold`
    });
  } else if (amount > 50000) {
    score += 20;
    level = "MEDIUM";
    message = "Moderate amount transfer.";
    reasons.push({
      type: "Above Average Amount",
      severity: "medium",
      description: `Amount ₹${amount} is above typical range`
    });
  }

  // New receiver scoring
  if (isNewReceiver) {
    score += 25;
    if (score >= 40) level = "MEDIUM";
    if (score >= 70) level = "HIGH";
    message = level === "HIGH"
      ? "High-risk: New receiver + large amount"
      : "New receiver detected";
    reasons.push({
      type: "New Recipient",
      severity: "medium",
      description: "First time sending to this recipient"
    });
  }

  // Cross-border transfer (simulated)
  if (Math.random() > 0.7) {
    score += 15;
    reasons.push({
      type: "Cross-border Transfer",
      severity: "low",
      description: "International transaction detected"
    });
  }

  // Simulate velocity check
  if (Math.random() > 0.8) {
    score += 12;
    reasons.push({
      type: "High Transfer Frequency",
      severity: "medium",
      description: "Multiple transactions in short time"
    });
  }

  // Normalize score to 0-100
  score = Math.min(score, 100);

  // Determine final level based on score
  if (score < 30) level = "LOW";
  else if (score < 70) level = "MEDIUM";
  else level = "HIGH";

  return {
    level,
    score,
    message,
    reasons: reasons.length > 0 ? reasons : [{
      type: "All Checks Passed",
      severity: "low",
      description: "Transaction meets all security criteria"
    }],
    timestamp: new Date().toISOString()
  };
};
