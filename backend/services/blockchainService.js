const { ethers } = require("ethers");

exports.recordOnBlockchain = async (sender, receiver, amount) => {

  console.log("Recording on blockchain");

  const fakeHash =
    "0x" + Math.random().toString(16).substring(2, 15);

  return fakeHash;
};