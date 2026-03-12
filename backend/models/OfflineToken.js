const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  token: String,
  amount: Number,
  status: String
});

module.exports = mongoose.model("OfflineToken", schema);