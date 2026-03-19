const crypto = require("crypto");

/**
 * Generate deterministic blockchain hash for transaction
 * @param {string} sender - Sender email/address
 * @param {string} receiver - Receiver email/address
 * @param {number} amount - Transaction amount
 * @param {string} timestamp - ISO timestamp
 * @returns {string} SHA256 hash
 */
exports.recordOnBlockchain = async (sender, receiver, amount, timestamp = new Date().toISOString()) => {
  try {
    const data = `${sender}:${receiver}:${amount}:${timestamp}`;
    const hash = crypto.createHash("sha256").update(data).digest("hex");
    console.log(`[Blockchain] Transaction recorded: ${hash}`);
    return hash;
  } catch (error) {
    console.error("[Blockchain] Error generating hash:", error);
    throw new Error("Blockchain recording failed");
  }
};
