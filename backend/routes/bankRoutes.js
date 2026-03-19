const express = require("express");
const router = express.Router();
const { getBankRates, compareRates } = require("../controllers/bankController");
const authMiddleware = require("../middleware/authMiddleware");

// GET rates by amount and currency
router.get("/rates", authMiddleware, getBankRates);

// POST compare (for backward compatibility)
router.post("/compare", authMiddleware, compareRates);

module.exports = router;