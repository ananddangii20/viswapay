const OfflineToken = require("../models/OfflineToken");
const crypto = require("crypto");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { recordOnBlockchain } = require("../services/blockchainService");
const { convert } = require("../services/currencyService");
const { processPayment } = require("../services/paymentService");

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
    const userId = req.user.id;

    // Step 1: Validate token input
    if (!token || !token.trim()) {
      return res.status(400).json({ 
        success: false,
        message: "Token required",
        errorType: "MISSING_TOKEN"
      });
    }

    // Step 2: Find and validate token existence (Token Matching Phase)
    const offlineToken = await OfflineToken.findOne({ token: token.trim() });
    
    if (!offlineToken) {
      return res.status(404).json({ 
        success: false,
        message: "Token not found - Invalid token code provided",
        errorType: "TOKEN_MISMATCH"
      });
    }

    // Step 3: Explicit token matching success confirmation
    console.log(`[Offline Token] Token matched successfully: ${offlineToken.token}`);

    // Step 4: Validate token expiry
    if (new Date() > offlineToken.expiry) {
      offlineToken.status = "EXPIRED";
      await offlineToken.save();
      return res.status(400).json({ 
        success: false,
        message: "Token has expired - Please generate a new offline token",
        errorType: "TOKEN_EXPIRED",
        expiry: offlineToken.expiry
      });
    }

    // Step 5: Check if already used (prevent double-spend)
    if (offlineToken.status === "COMPLETED" || offlineToken.isUsed) {
      return res.status(400).json({ 
        success: false,
        message: "Token already redeemed - Cannot use the same token twice",
        errorType: "TOKEN_ALREADY_USED",
        redeemedAt: offlineToken.redeemedAt
      });
    }

    // Step 6: Validate users exist
    const sender = await User.findById(offlineToken.sender);
    const receiver = await User.findOne({ email: offlineToken.receiverEmail });

    if (!sender || !receiver) {
      return res.status(404).json({ 
        success: false,
        message: "Sender or receiver account not found",
        errorType: "USER_NOT_FOUND"
      });
    }

    // Step 7: Verify receiver is the current user attempting redemption
    if (receiver._id.toString() !== userId) {
      return res.status(403).json({ 
        success: false,
        message: "You are not the intended receiver of this token",
        errorType: "UNAUTHORIZED_RECEIVER"
      });
    }

    // Step 8: Final balance validation (security measure)
    if (sender.balance < offlineToken.amount) {
      return res.status(403).json({ 
        success: false,
        message: "Sender has insufficient balance - Cannot complete transaction",
        errorType: "INSUFFICIENT_BALANCE",
        requiredAmount: offlineToken.amount,
        availableBalance: sender.balance
      });
    }

    // ✅ Step 9-12: USE UNIFIED PAYMENT ENGINE (atomic transaction)
    // This ensures sender deduction and receiver addition happen together
    const paymentResult = await processPayment({
      senderId: sender._id.toString(),
      receiverEmail: receiver.email,
      amount: offlineToken.amount,
      currency: offlineToken.currency,
      type: "OFFLINE",
      bankName: offlineToken.bankName,
      skipFraudCheck: true  // Offline tokens already validated
    });

    // Update offline token status after successful payment
    offlineToken.status = "COMPLETED";
    offlineToken.isUsed = true;
    offlineToken.blockchainHash = paymentResult.transaction.blockchainHash;
    offlineToken.redeemedAt = new Date();
    offlineToken.redeemedBy = receiver._id;
    await offlineToken.save();

    console.log(
      `[Offline Token] Redeemed successfully: ${offlineToken.token} | Hash: ${paymentResult.transaction.blockchainHash} | Receiver: ${receiver.email}`
    );

    // Step 13: Return success response with explicit confirmation
    res.json({
      success: true,
      message: "Token matched successfully! Payment completed and secured on blockchain.",
      tokenMatched: true,
      senderBalance: paymentResult.senderBalance,
      receiverBalance: paymentResult.receiverBalance,
      data: {
        transactionId: paymentResult.transaction.id,
        blockchainHash: paymentResult.transaction.blockchainHash,
        amount: paymentResult.transaction.amount,
        currency: paymentResult.transaction.currency,
        receiver: receiver.name,
        sender: sender.name,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
        mode: "OFFLINE_TOKEN"
      }
    });

  } catch (error) {
    console.error("Token redemption error:", error);
    
    // Roll back offline token status if payment failed
    try {
      const offlineToken = await OfflineToken.findOne({ token: req.body.token?.trim() });
      if (offlineToken && offlineToken.status !== "PENDING") {
        offlineToken.status = "PENDING";  // Reset status
        offlineToken.isUsed = false;
        await offlineToken.save();
      }
    } catch (rollbackError) {
      console.error("Failed to rollback token status:", rollbackError);
    }
    
    res.status(500).json({ 
      success: false,
      message: error.message || "Token verification failed - Please try again",
      errorType: "SERVER_ERROR"
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

