const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  balance: { type: Number, default: 1000 },
  walletAddress: String,
  country: String
});

module.exports = mongoose.model("User", userSchema);