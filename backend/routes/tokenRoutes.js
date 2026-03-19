const express = require("express");
const router = express.Router();
const {
  generateToken,
  redeemToken,
  checkTokenStatus,
  bulkVerifyTokens
} = require("../controllers/tokenController");
const authMiddleware = require("../middleware/authMiddleware");

// Generate new offline payment token
router.post("/generate", authMiddleware, generateToken);

// Redeem/verify offline token
router.post("/redeem", authMiddleware, redeemToken);

// Check token status without redeeming
router.get("/status/:tokenCode", checkTokenStatus);

// Bulk verify multiple tokens (for offline sync)
router.post("/bulk-verify", bulkVerifyTokens);

module.exports = router;