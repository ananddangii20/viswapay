/**
 * Migration Script: Initialize default wallet balance of ₹1000 for existing users
 * 
 * Purpose: Update all existing users that don't have a balance field
 * to set balance = 1000 (default initial wallet amount)
 * 
 * Usage: node scripts/migrate-user-balances.js
 * 
 * This script will:
 * 1. Connect to MongoDB
 * 2. Find all users where balance is null, undefined, or doesn't exist
 * 3. Update them with balance = 1000
 * 4. Display migration results
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const runMigration = async () => {
  try {
    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/vishwapay");
    console.log("✅ Connected to MongoDB\n");

    // Find users without balance
    console.log("🔍 Scanning for users without default balance...");
    const usersWithoutBalance = await User.countDocuments({
      $or: [
        { balance: { $exists: false } },
        { balance: null },
        { balance: undefined }
      ]
    });

    console.log(`Found ${usersWithoutBalance} users without balance\n`);

    if (usersWithoutBalance === 0) {
      console.log("✅ All users already have a balance set!\n");
      await mongoose.connection.close();
      process.exit(0);
    }

    // Perform migration: Update all users without balance
    console.log("⏳ Updating users with default balance of ₹1000...");
    const result = await User.updateMany(
      {
        $or: [
          { balance: { $exists: false } },
          { balance: null },
          { balance: undefined }
        ]
      },
      { $set: { balance: 1000 } }
    );

    console.log(`\n📊 Migration Result:`);
    console.log(`   Matched: ${result.matchedCount} users`);
    console.log(`   Modified: ${result.modifiedCount} users`);

    if (result.modifiedCount > 0) {
      console.log(`\n✅ Successfully updated ${result.modifiedCount} users with ₹1000 balance!\n`);
    }

    // Verify migration
    console.log("🔎 Verifying migration...");
    const usersAfter = await User.countDocuments({
      $or: [
        { balance: { $exists: false } },
        { balance: null },
        { balance: undefined }
      ]
    });

    console.log(`Users still without balance: ${usersAfter}`);

    if (usersAfter === 0) {
      console.log("\n✅ Migration completed successfully!");
      console.log("All existing users now have a default wallet balance of ₹1000\n");
    } else {
      console.log(
        "\n⚠️  Warning: Some users still don't have a balance. Manual review may be needed.\n"
      );
    }

    // Close connection
    await mongoose.connection.close();
    console.log("📴 MongoDB connection closed\n");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Migration Error:", error);
    console.error(error.message);
    
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error("Error closing connection:", closeError);
    }
    
    process.exit(1);
  }
};

// Run migration
console.log("\n" + "=".repeat(60));
console.log("  USER BALANCE MIGRATION - ₹1000 Default Initialization");
console.log("=".repeat(60) + "\n");

runMigration();
