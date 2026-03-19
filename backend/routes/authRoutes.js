const express = require("express");
const router = express.Router();

const { register, login, getProfile } = require("../controllers/authController");
const { googleLogin } = require("../controllers/googleAuthController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);

// Protected route to fetch current user profile with balance
router.get("/profile", authMiddleware, getProfile);

module.exports = router;