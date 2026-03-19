const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiverEmail: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      enum: ["USD", "EUR", "GBP", "AED", "INR"],
      default: "INR"
    },
    bankName: String,
    token: {
      type: String,
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "EXPIRED", "CANCELLED"],
      default: "PENDING"
    },
    expiry: {
      type: Date,
      required: true,
      index: true // Index for faster expiry queries
    },
    blockchainHash: String,
    isUsed: {
      type: Boolean,
      default: false
    },
    redeemedAt: Date,
    redeemedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    createdAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

// TTL index - automatically delete expired tokens after 6 hours
tokenSchema.index(
  { expiry: 1 },
  { expireAfterSeconds: 21600 } // 6 hours
);

module.exports = mongoose.model("OfflineToken", tokenSchema);
