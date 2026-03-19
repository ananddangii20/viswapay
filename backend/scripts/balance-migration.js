/**
 * Quick Balance Migration Function
 * 
 * Import and call this function in your server startup
 * to automatically migrate existing users without balances
 * 
 * Usage in server.js:
 * const { migrateUserBalances } = require("./scripts/balance-migration");
 * 
 * // In your server startup:
 * migrateUserBalances().catch(err => console.error("Balance migration error:", err));
 */

const User = require("../models/User");

/**
 * Migrate all existing users without balance to ₹1000
 * Can be run on server startup for automatic migration
 */
const migrateUserBalances = async () => {
  try {
    console.log("\n[Balance Migration] Checking for users without balance...");

    // Check how many users need migration
    const usersNeedingMigration = await User.countDocuments({
      $or: [
        { balance: { $exists: false } },
        { balance: null },
        { balance: undefined }
      ]
    });

    if (usersNeedingMigration === 0) {
      console.log("[Balance Migration] ✅ All users have balance initialized");
      return { migrated: 0, message: "No migration needed" };
    }

    console.log(`[Balance Migration] Found ${usersNeedingMigration} users to migrate...`);

    // Perform migration
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

    console.log(`[Balance Migration] ✅ Successfully migrated ${result.modifiedCount} users`);
    console.log("[Balance Migration] Setting default balance: ₹1000\n");

    return {
      migrated: result.modifiedCount,
      message: `Migrated ${result.modifiedCount} users with ₹1000 balance`
    };

  } catch (error) {
    console.error("[Balance Migration] ❌ Error during migration:", error.message);
    throw error;
  }
};

module.exports = { migrateUserBalances };
