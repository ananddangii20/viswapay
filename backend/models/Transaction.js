const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false  // For transactions where receiver is found
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
    mode: {
      type: String,
      enum: ["DIRECT", "OFFLINE_TOKEN", "QR", "BANK_TRANSFER"],
      default: "DIRECT"
    },
    description: String,
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Index for efficient querying
transactionSchema.index({ sender: 1, createdAt: -1 });
transactionSchema.index({ receiver: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);