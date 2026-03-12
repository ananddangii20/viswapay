const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { recordOnBlockchain } = require("../services/blockchainService");

exports.sendPayment = async (req, res) => {
  const { senderId, receiverEmail, amount } = req.body;

  const sender = await User.findById(senderId);
  const receiver = await User.findOne({ email: receiverEmail });

  if (sender.balance < amount)
    return res.json("Insufficient balance");

  sender.balance -= amount;
  receiver.balance += amount;

  await sender.save();
  await receiver.save();

  const hash = await recordOnBlockchain(sender.email, receiver.email, amount);

  const tx = await Transaction.create({
    sender: sender.email,
    receiver: receiver.email,
    amount,
    currency: "USD",
    blockchainHash: hash,
    status: "SUCCESS"
  });

  res.json(tx);
};