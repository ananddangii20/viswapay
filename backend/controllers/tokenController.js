const OfflineToken = require("../models/OfflineToken");
const crypto = require("crypto");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { recordOnBlockchain } = require("../services/blockchainService");
const { convert } = require("../services/currencyService");

/**
 * POST /api/token/generate
 * Generate offline payment token with 5-minute expiry
 * Response includes token code, QR payload, and expiry time
 */
exports.generateToken = async (req, res) => {
  try {
    const { receiverEmail, amount, currency = "INR", bankName } = req.body;

    // Validation
    if (!receiverEmail || !receiverEmail.trim()) {
      return res.status(400).json({ message: "Receiver email required" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Get sender
    const sender = await User.findById(req.user.id);
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    // Check receiver exists (prevent payment to non-existent users)
    const receiver = await User.findOne({ email: receiverEmail.trim() });
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // Check balance
    if (sender.balance < amount) {
      return res.status(400).json({ 
        message: `Insufficient balance. Available: ${sender.balance}, Required: ${amount}` 
      });
    }

    // Generate random 6-digit numeric token
    const tokenNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenCode = tokenNumber; // Can also use crypto.randomBytes(3).toString("hex").toUpperCase()

    // Set expiry to 5 minutes from now
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);

    // Create offline token record
    const offlineToken = await OfflineToken.create({
      sender: sender._id,
      receiverEmail: receiverEmail.trim(),
      amount,
      currency,
      bankName: bankName || "Direct Transfer",
      token: tokenCode,
      expiry: expiryTime,
      status: "PENDING",
      isUsed: false
    });

    // Create QR payload (stringified JSON for scanner)
    const qrPayload = JSON.stringify({
      token: tokenCode,
      sender: sender.email,
      receiver: receiverEmail.trim(),
      amount,
      currency,
      expiry: expiryTime.toISOString(),
      platform: "ViswaPay"
    });

    // Log token generation
    console.log(
      `[Offline Token] Generated for ${sender.email} → ${receiverEmail}: ${tokenCode}`
    );

    res.status(201).json({
      success: true,
      message: "Offline token generated successfully",
      data: {
        token: tokenCode,
        expiry: expiryTime,
        expiryTimestamp: expiryTime.getTime(),
        expirySeconds: Math.round((expiryTime - Date.now()) / 1000),
        qrPayload,
        amount,
        currency,
        receiver: receiverEmail.trim(),
        sender: sender.email
      }
    });

  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ 
      success: false,
      message: "Token generation failed" 
    });
  }
};

/**
 * POST /api/token/redeem
 * Verify and redeem offline token
 * Handles payment execution with blockchain recording
 */
exports.redeemToken = async (req, res) => {
  try {
    const { token } = req.body;

    // Validation
    if (!token || !token.trim()) {
      return res.status(400).json({ message: "Token required" });
    }

    // Find token in database
    const offlineToken = await OfflineToken.findOne({ token: token.trim() });
    
    if (!offlineToken) {
      return res.status(404).json({ message: "Invalid or expired token" });
    }

    // Check if token is expired
    if (new Date() > offlineToken.expiry) {
      offlineToken.status = "EXPIRED";
      await offlineToken.save();
      return res.status(400).json({ 
        message: "Token expired",
        expiry: offlineToken.expiry
      });
    }

    // Check if already used
    if (offlineToken.status === "COMPLETED" || offlineToken.isUsed) {
      return res.status(400).json({ 
        message: "Token already used",
        redeemedAt: offlineToken.redeemedAt
      });
    }

    // Get sender and receiver
    const sender = await User.findById(offlineToken.sender);
    const receiver = await User.findOne({ email: offlineToken.receiverEmail });

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Sender or receiver not found" });
    }

    // Double-check balance (security measure)
    if (sender.balance < offlineToken.amount) {
      return res.status(403).json({ 
        message: "Insufficient balance at redemption time" 
      });
    }

    // Process payment - deduct from sender, add to receiver
    sender.balance -= offlineToken.amount;
    receiver.balance += offlineToken.amount;

    await sender.save();
    await receiver.save();

    // Generate blockchain hash for immutability verification
    const blockchainHash = await recordOnBlockchain(
      sender.email,
      receiver.email,
      offlineToken.amount,
      new Date().toISOString()
    );

    // Update token status and record redemption
    offlineToken.status = "COMPLETED";
    offlineToken.isUsed = true;
    offlineToken.blockchainHash = blockchainHash;
    offlineToken.redeemedAt = new Date();
    offlineToken.redeemedBy = receiver._id;

    await offlineToken.save();

    // Create transaction record for audit trail
    const transaction = await Transaction.create({
      sender: sender._id,
      senderCountry: sender.country || "India",
      receiverEmail: receiver.email,
      receiverCountry: receiver.country || "USA",
      amount: offlineToken.amount,
      currency: offlineToken.currency,
      bankName: offlineToken.bankName,
      exchangeRate: 1, // 1:1 for offline tokens
      convertedAmount: offlineToken.amount,
      fraudScore: 0, // Offline tokens bypass fraud detection
      blockchainHash,
      status: "SUCCESS",
      description: `Offline token payment from ${sender.name} to ${receiver.name}`
    });

    console.log(
      `[Offline Token] Redeemed: ${offlineToken.token} | Hash: ${blockchainHash}`
    );

    res.json({
      success: true,
      message: "Payment completed successfully",
      data: {
        transactionId: transaction._id,
        blockchainHash,
        amount: offlineToken.amount,
        currency: offlineToken.currency,
        receiver: receiver.name,
        timestamp: new Date().toISOString(),
        status: "SUCCESS"
      }
    });

  } catch (error) {
    console.error("Token redemption error:", error);
    res.status(500).json({ 
      success: false,
      message: "Token verification failed" 
    });
  }
};

/**
 * GET /api/token/status/:tokenCode
 * Check token status without redeeming
 */
exports.checkTokenStatus = async (req, res) => {
  try {
    const { tokenCode } = req.params;

    if (!tokenCode) {
      return res.status(400).json({ message: "Token code required" });
    }

    const offlineToken = await OfflineToken.findOne({ token: tokenCode });

    if (!offlineToken) {
      return res.status(404).json({ message: "Token not found" });
    }

    const isExpired = new Date() > offlineToken.expiry;
    const timeRemaining = Math.max(0, offlineToken.expiry - Date.now());

    res.json({
      success: true,
      data: {
        token: offlineToken.token,
        status: isExpired ? "EXPIRED" : offlineToken.status,
        isValid: !isExpired && offlineToken.status === "PENDING",
        expiry: offlineToken.expiry,
        timeRemaining,
        timeRemainingSeconds: Math.round(timeRemaining / 1000),
        amount: offlineToken.amount,
        currency: offlineToken.currency,
        receiver: offlineToken.receiverEmail
      }
    });

  } catch (error) {
    console.error("Token status check error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to check token status" 
    });
  }
};

/**
 * POST /api/token/bulk-verify
 * Verify multiple tokens at once (useful for offline sync)
 */
exports.bulkVerifyTokens = async (req, res) => {
  try {
    const { tokens } = req.body;

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ message: "Token array required" });
    }

    const results = await Promise.all(
      tokens.map(async (tokenCode) => {
        const token = await OfflineToken.findOne({ token: tokenCode });
        if (!token) return { token: tokenCode, status: "NOT_FOUND" };

        const isExpired = new Date() > token.expiry;
        return {
          token: tokenCode,
          status: isExpired ? "EXPIRED" : token.status,
          isValid: !isExpired && token.status === "PENDING",
          expiry: token.expiry
        };
      })
    );

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error("Bulk token verify error:", error);
    res.status(500).json({ 
      success: false,
      message: "Bulk verification failed" 
    });
  }
};

