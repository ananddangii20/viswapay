const User = require("../models/User");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");
const { recordOnBlockchain } = require("./blockchainService");
const { checkFraud } = require("./fraudService");
const { convert } = require("./currencyService");

/**
 * UNIFIED PAYMENT ENGINE
 * 
 * Centralized ACID-safe payment processing for ALL payment types:
 * - Normal Payments
 * - QR Payments
 * - Offline Token Redemptions
 * 
 * Guarantees:
 * ✅ Both wallets update atomically (all-or-nothing)
 * ✅ Automatic rollback on ANY failure
 * ✅ No money loss
 * ✅ Blockchain immutability
 * ✅ Complete transaction audit trail
 */

/**
 * Process Payment - Core ACID Transaction Handler
 * 
 * @param {Object} options - Payment configuration
 * @param {String} options.senderId - Sender user ID from JWT (req.user.id)
 * @param {String} options.receiverEmail - Receiver email address
 * @param {Number} options.amount - Payment amount (original currency)
 * @param {String} options.currency - Currency code (USD, INR, EUR, etc)
 * @param {String} options.type - Payment type (NORMAL | QR | OFFLINE)
 * @param {String} options.bankName - Optional bank name for rate selection
 * @param {Boolean} options.skipFraudCheck - Skip fraud check (for offline)
 * 
 * @returns {Promise<Object>} Payment result with updated balances and transaction
 * 
 * @throws {Error} On validation, fraud, or database failures (transaction auto-rolls back)
 */
async function processPayment(options) {
  const {
    senderId,
    receiverEmail,
    amount,
    currency = "USD",
    type = "NORMAL",
    bankName = null,
    skipFraudCheck = false
  } = options;

  // ═══════════════════════════════════════════════════════════
  // STEP 1: START ATOMIC TRANSACTION SESSION
  // ═══════════════════════════════════════════════════════════
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 2: VALIDATE INPUT
    // ═══════════════════════════════════════════════════════════
    if (!senderId || !receiverEmail || !amount || amount <= 0) {
      await session.abortTransaction();
      throw new Error("Invalid sender ID, receiver email, or amount");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: FETCH USERS WITHIN SESSION (for transaction isolation)
    // ═══════════════════════════════════════════════════════════
    const sender = await User.findById(senderId).session(session);
    if (!sender) {
      await session.abortTransaction();
      throw new Error("Sender account not found");
    }

    const receiver = await User.findOne({ email: receiverEmail }).session(session);
    if (!receiver) {
      await session.abortTransaction();
      throw new Error("Receiver account not found");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: CONVERT AMOUNT TO INTERNAL CURRENCY (INR)
    // ═══════════════════════════════════════════════════════════
    let amountInINR = amount;
    let exchangeRate = 1;
    let convertedAmount = amount;

    if (currency && currency !== "INR") {
      const conversion = convert(amount, currency);
      amountInINR = Math.round(conversion.convertedAmount); // Convert to INR in internal DB
      exchangeRate = conversion.rate;
      convertedAmount = conversion.convertedAmount;
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: VALIDATE SENDER BALANCE (critical check)
    // ═══════════════════════════════════════════════════════════
    if (sender.balance < amountInINR) {
      await session.abortTransaction();
      throw new Error(
        `Insufficient balance. Required: ₹${amountInINR}, Available: ₹${sender.balance}`
      );
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 6: FRAUD CHECK (external - can be skipped for offline)
    // ═══════════════════════════════════════════════════════════
    let fraudCheck = { score: 0, level: "LOW", message: "No issues" };
    
    if (!skipFraudCheck) {
      const isNewReceiver = !await Transaction.findOne({
        sender: sender._id,
        receiverEmail: receiverEmail
      });
      fraudCheck = await checkFraud(amountInINR, receiverEmail, isNewReceiver);

      // Block high-risk transactions (30% chance block if HIGH risk)
      if (fraudCheck.level === "HIGH" && Math.random() > 0.7) {
        await session.abortTransaction();
        throw new Error(`Transaction blocked: ${fraudCheck.message}`);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 7: ✅ ATOMIC DEDUCT FROM SENDER
    // ═══════════════════════════════════════════════════════════
    sender.balance -= amountInINR;
    sender.updatedAt = new Date();
    await sender.save({ session });

    // ═══════════════════════════════════════════════════════════
    // STEP 8: ✅ ATOMIC ADD TO RECEIVER
    // ═══════════════════════════════════════════════════════════
    receiver.balance += amountInINR;
    receiver.updatedAt = new Date();
    await receiver.save({ session });

    // ═══════════════════════════════════════════════════════════
    // STEP 9: GENERATE BLOCKCHAIN HASH (immutability proof)
    // ═══════════════════════════════════════════════════════════
    const blockchainHash = await recordOnBlockchain(
      sender.email,
      receiver.email,
      amountInINR,
      new Date().toISOString()
    );

    // ═══════════════════════════════════════════════════════════
    // STEP 10: ✅ CREATE TRANSACTION RECORD (within session)
    // ═══════════════════════════════════════════════════════════
    const transaction = await Transaction.create(
      [{
        sender: sender._id,
        receiver: receiver._id,
        senderCountry: sender.country || "India",
        receiverEmail: receiver.email,
        receiverCountry: receiver.country || "USA",
        amount: amountInINR,
        originalAmount: amount,
        currency: "INR", // Always store in INR internally
        originalCurrency: currency,
        bankName: bankName || "Direct Transfer",
        exchangeRate,
        convertedAmount: amountInINR,
        fraudScore: fraudCheck.score,
        blockchainHash,
        status: "SUCCESS",
        mode: type,
        description: `${type} payment from ${sender.name} to ${receiver.name}`
      }],
      { session }
    );

    // ═══════════════════════════════════════════════════════════
    // STEP 11: ✅ COMMIT TRANSACTION (all-or-nothing)
    // ═══════════════════════════════════════════════════════════
    await session.commitTransaction();

    console.log(
      `[Payment Engine] ✅ ${type} payment SUCCESS: ${sender.email} → ${receiver.email} (₹${amountInINR})`
    );

    // ═══════════════════════════════════════════════════════════
    // RETURN SUCCESS
    // ═══════════════════════════════════════════════════════════
    return {
      success: true,
      senderBalance: sender.balance,
      receiverBalance: receiver.balance,
      transaction: {
        id: transaction[0]._id,
        sender: sender.email,
        receiver: receiver.email,
        amount: amountInINR,
        currency: "INR",
        originalAmount: amount,
        originalCurrency: currency,
        blockchainHash,
        status: "SUCCESS",
        timestamp: transaction[0].createdAt
      }
    };

  } catch (error) {
    // ═══════════════════════════════════════════════════════════
    // ✅ ATOMIC ROLLBACK ON ANY ERROR
    // ═══════════════════════════════════════════════════════════
    await session.abortTransaction();
    
    console.error(`[Payment Engine] ❌ Error:`, error.message);
    
    throw new Error(error.message || "Payment processing failed");

  } finally {
    // ═══════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════
    session.endSession();
  }
}

// ═══════════════════════════════════════════════════════════
// VALIDATE PAYMENT (pre-flight checks without modifying state)
// ═══════════════════════════════════════════════════════════
async function validatePayment(options) {
  const {
    senderId,
    receiverEmail,
    amount,
    currency = "USD"
  } = options;

  // Check sender exists
  const sender = await User.findById(senderId);
  if (!sender) throw new Error("Sender not found");

  // Check receiver exists
  const receiver = await User.findOne({ email: receiverEmail });
  if (!receiver) throw new Error("Receiver not found");

  // Convert and check balance
  let amountInINR = amount;
  if (currency !== "INR") {
    const conversion = convert(amount, currency);
    amountInINR = Math.round(conversion.convertedAmount);
  }

  if (sender.balance < amountInINR) {
    throw new Error(
      `Insufficient balance. Required: ₹${amountInINR}, Available: ₹${sender.balance}`
    );
  }

  return { sender, receiver, amountInINR };
}

module.exports = {
  processPayment,
  validatePayment
};
