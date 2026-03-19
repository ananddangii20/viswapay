const User = require("../models/User");
const Transaction = require("../models/Transaction");
const OfflineToken = require("../models/OfflineToken");
const { recordOnBlockchain } = require("../services/blockchainService");
const { checkFraud } = require("../services/fraudService");
const { convert } = require("../services/currencyService");
const { getBankRates } = require("../services/bankRateService");
const crypto = require("crypto");

/**
 * POST /api/payment/send
 * Send international payment
 */
exports.sendPayment = async (req, res) => {
  try {
    const { receiverEmail, amount, currency = "USD", bankName } = req.body;

    // Validation
    if (!receiverEmail || !amount || amount <= 0) {
      return res.status(400).json({
        message: "Invalid receiver email or amount"
      });
    }

    // Get sender from JWT
    const sender = await User.findById(req.user.id);
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    // Get receiver
    const receiver = await User.findOne({ email: receiverEmail });
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // Check sender balance
    if (sender.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Fraud check
    const isNewReceiver = !await Transaction.findOne({
      sender: sender._id,
      receiverEmail: receiverEmail
    });
    const fraudCheck = await checkFraud(amount, receiverEmail, isNewReceiver);

    // Block high-risk transactions (simulated - 30% chance for high risk)
    if (fraudCheck.level === "HIGH" && Math.random() > 0.7) {
      return res.status(403).json({
        message: fraudCheck.message,
        fraud: fraudCheck
      });
    }

    // Currency conversion
    const conversion = convert(amount, currency);
    const convertedAmount = conversion.convertedAmount;

    // Get exchange rate from selected bank if provided
    let exchangeRate = conversion.rate;
    if (bankName) {
      const rates = getBankRates(amount, currency);
      const selectedBank = rates.find(b => b.bankName === bankName);
      if (selectedBank) {
        exchangeRate = selectedBank.exchangeRate;
      }
    }

    // Deduct from sender
    sender.balance -= amount;
    await sender.save();

    // Add to receiver
    receiver.balance += convertedAmount;
    await receiver.save();

    // Generate blockchain hash
    const blockchainHash = await recordOnBlockchain(
      sender.email,
      receiver.email,
      amount,
      new Date().toISOString()
    );

    // Create transaction record
    const transaction = await Transaction.create({
      sender: sender._id,
      receiver: receiver._id,  // Add receiver userId for transaction history queries
      senderCountry: sender.country || "India",
      receiverEmail: receiver.email,
      receiverCountry: receiver.country || "USA",
      amount,
      currency,
      bankName: bankName || "Unknown",
      exchangeRate,
      convertedAmount,
      fraudScore: fraudCheck.score,
      blockchainHash,
      status: "SUCCESS",
      description: `Payment from ${sender.name} to ${receiver.name}`
    });

    // Return success with updated balances
    res.status(201).json({
      success: true,
      message: "Payment sent successfully",
      senderBalance: sender.balance,  // Real updated balance
      receiverBalance: receiver.balance,  // Real updated balance
      transaction: {
        id: transaction._id,
        sender: sender.email,
        senderCountry: sender.country || "India",
        receiver: receiver.email,
        receiverCountry: receiver.country || "USA",
        amountSent: amount,
        amountReceived: convertedAmount,
        currency,
        status: transaction.status,
        blockchainHash,
        timestamp: transaction.createdAt
      }
    });

  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({ message: "Payment processing failed" });
  }
};

/**
 * GET /api/payment/history
 * Get transaction history for logged-in user (both sent and received)
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all transactions where user is sender OR receiver
    const transactions = await Transaction.find({
      $or: [
        { sender: userId },     // Sent transactions
        { receiver: userId }    // Received transactions
      ]
    })
      .sort({ createdAt: -1 })  // Latest first
      .limit(50)
      .lean();  // More efficient query

    // Format transactions to include direction badge logic
    const formattedTransactions = transactions.map((tx) => {
      const isOutgoing = tx.sender.toString() === userId;
      
      return {
        _id: tx._id,
        id: tx._id,
        sender: tx.sender,
        receiver: tx.receiver,
        receiverEmail: tx.receiverEmail,
        amount: tx.amount,
        currency: tx.currency,
        bankName: tx.bankName,
        status: tx.status,
        blockchainHash: tx.blockchainHash,
        convertedAmount: tx.convertedAmount,
        senderCountry: tx.senderCountry,
        receiverCountry: tx.receiverCountry,
        createdAt: tx.createdAt,
        type: isOutgoing ? "out" : "in",  // Direction badge
        direction: isOutgoing ? "Sent" : "Received",  // UI label
        displayName: isOutgoing ? tx.receiverEmail : tx.sender  // Change based on direction
      };
    });

    res.json({
      success: true,
      count: formattedTransactions.length,
      transactions: formattedTransactions
    });

  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch history" });
  }
};

/**
 * POST /api/payment/generate-token
 * Generate offline payment token
 */
exports.generateToken = async (req, res) => {
  try {
    const { receiverEmail, amount, bankName } = req.body;

    if (!receiverEmail || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid receiver or amount" });
    }

    // Get sender
    const sender = await User.findById(req.user.id);
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    // Check balance
    if (sender.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Generate random token (6 character hex)
    const token = crypto.randomBytes(3).toString("hex").toUpperCase();

    // Create offline token with 5 minute expiry
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    const offlineToken = await OfflineToken.create({
      sender: sender._id,
      receiverEmail,
      amount,
      bankName: bankName || "Unknown",
      token,
      expiry,
      status: "PENDING"
    });

    res.status(201).json({
      message: "Offline token generated",
      token: offlineToken.token,
      expiry: offlineToken.expiry,
      amount,
      receiver: receiverEmail
    });

  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ message: "Token generation failed" });
  }
};

/**
 * POST /api/payment/verify-token
 * Verify and redeem offline token
 */
exports.verifyToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token required" });
    }

    // Find token
    const offlineToken = await OfflineToken.findOne({ token });
    if (!offlineToken) {
      return res.status(404).json({ message: "Invalid token" });
    }

    // Check expiry
    if (new Date() > offlineToken.expiry) {
      return res.status(400).json({ message: "Token expired" });
    }

    // Check if already used
    if (offlineToken.status === "COMPLETED") {
      return res.status(400).json({ message: "Token already used" });
    }

    // Get sender and receiver
    const sender = await User.findById(offlineToken.sender);
    const receiver = await User.findOne({ email: offlineToken.receiverEmail });

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Sender or receiver not found" });
    }

    // Check balance
    if (sender.balance < offlineToken.amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Process payment
    sender.balance -= offlineToken.amount;
    receiver.balance += offlineToken.amount;

    await sender.save();
    await receiver.save();

    // Generate blockchain hash
    const blockchainHash = await recordOnBlockchain(
      sender.email,
      receiver.email,
      offlineToken.amount,
      new Date().toISOString()
    );

    // Update token status
    offlineToken.status = "COMPLETED";
    await offlineToken.save();

    // Create transaction record
    const transaction = await Transaction.create({
      sender: sender._id,
      senderCountry: sender.country || "India",
      receiverEmail: receiver.email,
      receiverCountry: receiver.country || "USA",
      amount: offlineToken.amount,
      currency: "INR",
      bankName: offlineToken.bankName,
      convertedAmount: offlineToken.amount,
      blockchainHash,
      status: "SUCCESS",
      description: `Offline payment from ${sender.name} to ${receiver.email}`
    });

    res.json({
      message: "Offline payment completed",
      transaction: {
        id: transaction._id,
        amount: offlineToken.amount,
        receiver: receiver.email,
        blockchainHash,
        status: "SUCCESS"
      }
    });

  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({ message: "Token verification failed" });
  }
};

/**
 * GET /api/payment/bank-rates
 * Get bank rates for currency conversion
 */
exports.getBankRatesHandler = async (req, res) => {
  try {
    const { amount, currency = "USD" } = req.query;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const rates = getBankRates(parseFloat(amount), currency);

    res.json({
      amount: parseFloat(amount),
      currency,
      rates: rates.map(rate => ({
        bankName: rate.bankName,
        exchangeRate: rate.exchangeRate,
        convertedAmount: rate.convertedAmount,
        processingFee: rate.processingFee,
        netAmount: rate.netAmount
      }))
    });

  } catch (error) {
    console.error("Bank rates error:", error);
    res.status(500).json({ message: "Failed to fetch bank rates" });
  }
};

/**
 * GET /api/payment/fraud-check
 * Check fraud risk for transaction
 */
exports.fraudCheck = async (req, res) => {
  try {
    const { email, amount } = req.query;

    if (!email || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid email or amount" });
    }

    // Check if receiver is new
    const isNewReceiver = !await Transaction.findOne({
      sender: req.user.id,
      receiverEmail: email
    });

    const fraud = await checkFraud(parseFloat(amount), email, isNewReceiver);

    res.json({
      email,
      amount: parseFloat(amount),
      riskLevel: fraud.level,
      score: fraud.score,
      message: fraud.message,
      isNewReceiver
    });

  } catch (error) {
    console.error("Fraud check error:", error);
    res.status(500).json({ message: "Fraud check failed" });
  }
};

/**
 * GET /api/payment/convert
 * Convert INR to target currency
 */
exports.convertCurrency = async (req, res) => {
  try {
    const { amount, to = "USD" } = req.query;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const conversion = convert(parseFloat(amount), to);

    res.json({
      amountINR: parseFloat(amount),
      convertedAmount: conversion.convertedAmount,
      rate: conversion.rate,
      from: conversion.sourceCurrency,
      to: conversion.targetCurrency,
      timestamp: conversion.timestamp
    });

  } catch (error) {
    console.error("Conversion error:", error);
    res.status(500).json({ message: "Conversion failed" });
  }
};
