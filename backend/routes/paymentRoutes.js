 const express = require("express");
const router = express.Router();
const {
  sendPayment,
  getHistory,
  generateToken,
  verifyToken,
  getBankRatesHandler,
  fraudCheck,
  convertCurrency
} = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");

// Send payment
router.post("/send", authMiddleware, sendPayment);

// Get history
router.get("/history", authMiddleware, getHistory);

// Offline token management
router.post("/generate-token", authMiddleware, generateToken);
router.post("/verify-token", authMiddleware, verifyToken);

// Bank rates comparison
router.get("/bank-rates", authMiddleware, getBankRatesHandler);

// Fraud detection
router.get("/fraud-check", authMiddleware, fraudCheck);

// Currency conversion
router.get("/convert", authMiddleware, convertCurrency);

module.exports = router;