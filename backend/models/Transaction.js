const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    senderCountry: {
      type: String,
      default: "India"
    },
    receiverEmail: {
      type: String,
      required: true
    },
    receiverCountry: {
      type: String,
      default: "USA"
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: "USD",
      enum: ["USD", "EUR", "GBP", "AED", "INR"]
    },
    bankName: String,
    exchangeRate: Number,
    convertedAmount: Number,
    fraudScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    blockchainHash: String,
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING"
    },
    description: String,
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);