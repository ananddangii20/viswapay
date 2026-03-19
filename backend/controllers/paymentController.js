const User = require("../models/User");
const Transaction = require("../models/Transaction");
const OfflineToken = require("../models/OfflineToken");
const mongoose = require("mongoose");
const { recordOnBlockchain } = require("../services/blockchainService");
const { checkFraud } = require("../services/fraudService");
const { convert } = require("../services/currencyService");
const { getBankRates } = require("../services/bankRateService");
const {
  processPayment,
  getFraudCheck,
  convertCurrency: convertCurrencyAmount,
  getBankRatesForAmount,
} = require("../services/paymentService");
const crypto = require("crypto");

// QR Code generation (optional - graceful fallback if not installed)
let QRCode;
try {
  QRCode = require("qrcode");
} catch (e) {
  console.warn("QRCode library not installed - QR features will be limited");
  QRCode = null;
}

/**
 * POST /api/payment/send
 * Send international payment with ATOMIC TRANSACTION
 * Uses unified payment engine
 */
exports.sendPayment = async (req, res) => {
  try {
    const { receiverEmail, amount, currency = "USD", bankName } = req.body;

    // Validation
    if (!receiverEmail || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid receiver email or amount"
      });
    }

    // Fraud check (before processing)
    const fraudCheck = await getFraudCheck(amount, receiverEmail, req.user.id);

    // Block high-risk transactions (simulated - 30% chance for high risk)
    if (fraudCheck.level === "HIGH" && Math.random() > 0.7) {
      return res.status(403).json({
        success: false,
        message: fraudCheck.message,
        fraud: fraudCheck
      });
    }

    // ✅ Process payment using unified engine
    const result = await processPayment({
      senderId: req.user.id,
      receiverEmail,
      amount,
      currency,
      bankName: bankName || "Unknown",
      mode: "DIRECT",
      description: `Direct payment`,
      fraudScore: fraudCheck.score
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    // ✅ Return success with updated balances
    res.status(201).json({
      success: true,
      message: "Payment sent successfully ✓",
      senderBalance: result.senderBalance,
      receiverBalance: result.receiverBalance,
      transaction: result.transaction
    });

  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({ success: false, message: "Payment processing failed" });
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
 * Verify and redeem offline token with ATOMIC TRANSACTION
 * Uses unified payment engine
 */
exports.verifyToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token required" });
    }

    // Find token
    const offlineToken = await OfflineToken.findOne({ token });
    if (!offlineToken) {
      return res.status(404).json({ success: false, message: "Invalid token" });
    }

    // Check expiry
    if (new Date() > offlineToken.expiry) {
      return res.status(400).json({ success: false, message: "Token expired" });
    }

    // Check if already used
    if (offlineToken.status === "COMPLETED") {
      return res.status(400).json({ success: false, message: "Token already used" });
    }

    // ✅ Process payment using unified engine
    const result = await processPayment({
      senderId: offlineToken.sender,
      receiverEmail: offlineToken.receiverEmail,
      amount: offlineToken.amount,
      currency: "INR",
      bankName: offlineToken.bankName,
      mode: "OFFLINE_TOKEN",
      description: `Offline token payment`
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    // Mark token as completed
    offlineToken.status = "COMPLETED";
    await offlineToken.save();

    res.json({
      success: true,
      message: "Offline payment completed ✓",
      senderBalance: result.senderBalance,
      receiverBalance: result.receiverBalance,
      transaction: result.transaction
    });

  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({ success: false, message: "Token verification failed" });
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

    const fraud = await getFraudCheck(parseFloat(amount), email, req.user.id);

    res.json({
      email,
      amount: parseFloat(amount),
      riskLevel: fraud.level,
      score: fraud.score,
      message: fraud.message
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

    const conversion = convertCurrencyAmount(parseFloat(amount), to);

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

    const rates = getBankRatesForAmount(parseFloat(amount), currency);

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
 * POST /api/payment/qr-generate
 * Generate QR code for payment
 */
exports.generateQRCode = async (req, res) => {
  try {
    const { receiverEmail, amount, currency = "INR" } = req.body;

    // Validation
    if (!receiverEmail || !amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid receiver email or amount" 
      });
    }

    // Get sender from JWT
    const sender = await User.findById(req.user.id);
    if (!sender) {
      return res.status(404).json({ success: false, message: "Sender not found" });
    }

    // Verify receiver exists
    const receiver = await User.findOne({ email: receiverEmail });
    if (!receiver) {
      return res.status(404).json({ success: false, message: "Receiver not found" });
    }

    // Check balance
    if (sender.balance < amount) {
      return res.status(400).json({ 
        success: false,
        message: "Insufficient balance" 
      });
    }

    // Create QR payload
    const qrPayload = {
      amount,
      currency,
      senderEmail: sender.email,
      senderName: sender.name,
      receiverEmail,
      timestamp: new Date().toISOString(),
      type: "QR_PAYMENT"
    };

    const qrString = JSON.stringify(qrPayload);

    // Generate QR code image
    if (QRCode) {
      try {
        const qrImage = await QRCode.toDataURL(qrString);
        
        res.json({
          success: true,
          message: "QR code generated",
          qrCode: {
            image: qrImage,
            data: qrPayload,
            expiryTime: new Date(Date.now() + 15 * 60 * 1000) // 15 min expiry
          }
        });
      } catch (qrError) {
        console.error("QR generation error:", qrError);
        // Fallback: return QR data without image
        res.json({
          success: true,
          message: "QR payload generated (image unavailable)",
          qrCode: {
            data: qrPayload,
            expiryTime: new Date(Date.now() + 15 * 60 * 1000)
          }
        });
      }
    } else {
      // QR library not available
      res.json({
        success: true,
        message: "QR payload generated",
        qrCode: {
          data: qrPayload,
          expiryTime: new Date(Date.now() + 15 * 60 * 1000)
        }
      });
    }

  } catch (error) {
    console.error("QR generation error:", error);
    res.status(500).json({ success: false, message: "QR code generation failed" });
  }
};

/**
 * POST /api/payment/qr-pay
 * Process QR payment (scanned by receiver)
 * Uses unified payment engine
 */
exports.processQRPayment = async (req, res) => {
  try {
    const { qrData } = req.body;

    // Validation
    if (!qrData) {
      return res.status(400).json({ 
        success: false,
        message: "QR data required" 
      });
    }

    // Parse QR payload
    let qrPayload;
    try {
      qrPayload = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch (e) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid QR data" 
      });
    }

    const { senderEmail, receiverEmail, amount, currency } = qrPayload;

    // Verify receiver matches authenticated user
    const receiver = await User.findById(req.user.id);
    if (!receiver || receiver.email !== receiverEmail) {
      return res.status(403).json({ 
        success: false,
        message: "You are not the intended receiver" 
      });
    }

    // Get sender to verify they exist
    const sender = await User.findOne({ email: senderEmail });
    if (!sender) {
      return res.status(404).json({ success: false, message: "Sender not found" });
    }

    // ✅ Process payment using unified engine
    const result = await processPayment({
      senderId: sender._id,
      receiverEmail: receiver.email,
      amount,
      currency: currency || "INR",
      bankName: "Unknown",
      mode: "QR",
      description: `QR payment`
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: "QR payment processed successfully ✓",
      senderBalance: result.senderBalance,
      receiverBalance: result.receiverBalance,
      transaction: result.transaction
    });

  } catch (error) {
    console.error("QR payment error:", error);
    res.status(500).json({ success: false, message: "QR payment processing failed" });
  }
};
