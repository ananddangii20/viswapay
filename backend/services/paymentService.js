const User = require("../models/User");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");
const { recordOnBlockchain } = require("./blockchainService");
const { checkFraud } = require("./fraudService");
const { convert } = require("./currencyService");
const { getBankRates } = require("./bankRateService");

/**
 * UNIFIED PAYMENT ENGINE
 * Handles all payment types with ACID guarantees
 * 
 * Payment flow:
 * 1. Validate inputs
 * 2. Start MongoDB session
 * 3. Update both wallets atomically
 * 4. Record blockchain
 * 5. Create transaction record
 * 6. Commit or rollback
 * 7. Return updated balances
 */

/**
 * Core atomic payment processor
 * @param {Object} params - Payment parameters
 * @param {string} params.senderId - Sender User ID
 * @param {string} params.receiverEmail - Receiver email
 * @param {number} params.amount - Amount to send
 * @param {string} params.currency - Currency code
 * @param {string} params.bankName - Bank name (optional)
 * @param {string} params.mode - Payment mode (DIRECT, QR, OFFLINE_TOKEN)
 * @param {string} params.description - Transaction description
 * @param {number} params.fraudScore - Fraud score (optional)
 * @returns {Promise<{success: boolean, message: string, senderBalance: number, receiverBalance: number, transaction: Object}>}
 */
exports.processPayment = async (params) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      senderId,
      receiverEmail,
      amount,
      currency = "USD",
      bankName = "Unknown",
      mode = "DIRECT",
      description = "",
      fraudScore = 0,
    } = params;

    // ✅ STEP 1: Validation
    if (!senderId || !receiverEmail || !amount || amount <= 0) {
      throw new Error("Invalid payment parameters");
    }

    // ✅ STEP 2: Get sender (in session)
    const sender = await User.findById(senderId).session(session);
    if (!sender) {
      throw new Error("Sender not found");
    }

    // ✅ STEP 3: Get receiver (in session)
    const receiver = await User.findOne({ email: receiverEmail }).session(session);
    if (!receiver) {
      throw new Error("Receiver not found");
    }

    // ✅ STEP 4: Check sender balance
    if (sender.balance < amount) {
      throw new Error("Insufficient balance");
    }

    // ✅ STEP 5: Calculate conversion
    let conversion = convert(amount, currency);
    let exchangeRate = conversion.rate;
    let convertedAmount = conversion.convertedAmount;

    // Override with bank rates if provided
    if (bankName !== "Unknown") {
      const rates = getBankRates(amount, currency);
      const selectedBank = rates.find(b => b.bankName === bankName);
      if (selectedBank) {
        exchangeRate = selectedBank.exchangeRate;
        convertedAmount = selectedBank.convertedAmount;
      }
    }

    // ✅ STEP 6: ATOMIC UPDATE - Deduct from sender
    sender.balance -= amount;
    sender.updatedAt = new Date();
    await sender.save({ session });

    // ✅ STEP 7: ATOMIC UPDATE - Add to receiver
    receiver.balance += convertedAmount;
    receiver.updatedAt = new Date();
    await receiver.save({ session });

    // ✅ STEP 8: Record on blockchain
    const blockchainHash = await recordOnBlockchain(
      sender.email,
      receiver.email,
      amount,
      new Date().toISOString()
    );

    // ✅ STEP 9: Create transaction record (in session)
    const transaction = await Transaction.create(
      [{
        sender: sender._id,
        receiver: receiver._id,
        senderCountry: sender.country || "India",
        receiverEmail: receiver.email,
        receiverCountry: receiver.country || "USA",
        amount,
        currency,
        bankName,
        exchangeRate,
        convertedAmount,
        fraudScore,
        blockchainHash,
        status: "SUCCESS",
        mode,
        description: description || `Payment from ${sender.name} to ${receiver.name}`
      }],
      { session }
    );

    // ✅ STEP 10: COMMIT transaction
    await session.commitTransaction();

    // ✅ STEP 11: Return success with updated balances
    return {
      success: true,
      message: "Payment processed successfully ✓",
      senderBalance: sender.balance,
      receiverBalance: receiver.balance,
      transaction: {
        id: transaction[0]._id,
        sender: sender.email,
        senderCountry: sender.country || "India",
        receiver: receiver.email,
        receiverCountry: receiver.country || "USA",
        amountSent: amount,
        amountReceived: convertedAmount,
        currency,
        status: transaction[0].status,
        mode,
        blockchainHash,
        timestamp: transaction[0].createdAt
      }
    };

  } catch (error) {
    await session.abortTransaction();
    console.error("Payment processing error:", error.message);
    
    return {
      success: false,
      message: error.message || "Payment processing failed",
      senderBalance: null,
      receiverBalance: null,
      transaction: null
    };
  } finally {
    session.endSession();
  }
};

/**
 * Get fraud check for transaction
 * @param {number} amount - Transaction amount
 * @param {string} receiverEmail - Receiver email
 * @param {string} senderId - Sender id to check history
 * @returns {Promise<{level: string, score: number, message: string}>}
 */
exports.getFraudCheck = async (amount, receiverEmail, senderId) => {
  try {
    // Check if receiver is new
    const isNewReceiver = !await Transaction.findOne({
      sender: senderId,
      receiverEmail: receiverEmail
    });

    const fraudCheck = await checkFraud(amount, receiverEmail, isNewReceiver);
    return fraudCheck;
  } catch (error) {
    console.error("Fraud check error:", error);
    return { level: "LOW", score: 0, message: "Unable to check fraud status" };
  }
};

/**
 * Get currency conversion rates
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency
 * @returns {Object} Conversion details
 */
exports.convertCurrency = (amount, fromCurrency = "INR") => {
  return convert(amount, fromCurrency);
};

/**
 * Get bank rates for amount
 * @param {number} amount - Amount to convert
 * @param {string} currency - Target currency
 * @returns {Array} Bank rates
 */
exports.getBankRatesForAmount = (amount, currency) => {
  return getBankRates(amount, currency);
};
