const OfflineToken = require("../models/OfflineToken");

/**
 * Background job to clean up expired offline tokens
 * Runs every 1 minute to mark expired tokens as invalid
 */
class OfflineTokenCleanerService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Start the cleaner job
   * Runs every 60 seconds (1 minute)
   */
  start() {
    if (this.isRunning) {
      console.log("[TokenCleaner] Service already running");
      return;
    }

    this.isRunning = true;
    console.log("[TokenCleaner] Starting offline token expiry cleaner...");

    // Run immediately on start
    this.cleanExpiredTokens();

    // Then run every 60 seconds
    this.intervalId = setInterval(() => {
      this.cleanExpiredTokens();
    }, 60000); // 60 seconds = 1 minute

    console.log("[TokenCleaner] Service started successfully");
  }

  /**
   * Stop the cleaner job
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      console.log("[TokenCleaner] Service stopped");
    }
  }

  /**
   * Mark expired tokens as invalid
   * Also performs cleanup of very old tokens
   */
  async cleanExpiredTokens() {
    try {
      const now = new Date();

      // Mark expired tokens as EXPIRED (documents with expiry < now)
      const expiredResult = await OfflineToken.updateMany(
        {
          expiry: { $lt: now },
          status: { $in: ["PENDING"] } // Only update PENDING tokens
        },
        {
          $set: { status: "EXPIRED" }
        }
      );

      if (expiredResult.modifiedCount > 0) {
        console.log(
          `[TokenCleaner] Marked ${expiredResult.modifiedCount} token(s) as EXPIRED`
        );
      }

      // Delete very old completed/cancelled tokens (older than 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const deletedResult = await OfflineToken.deleteMany({
        createdAt: { $lt: sevenDaysAgo },
        status: { $in: ["COMPLETED", "CANCELLED", "EXPIRED"] }
      });

      if (deletedResult.deletedCount > 0) {
        console.log(
          `[TokenCleaner] Deleted ${deletedResult.deletedCount} old token(s)`
        );
      }

      // Get current statistics
      const pendingCount = await OfflineToken.countDocuments({
        status: "PENDING"
      });
      const completedCount = await OfflineToken.countDocuments({
        status: "COMPLETED"
      });
      const expiredCount = await OfflineToken.countDocuments({
        status: "EXPIRED"
      });

      console.log(
        `[TokenCleaner] Stats - Pending: ${pendingCount}, Completed: ${completedCount}, Expired: ${expiredCount}`
      );

    } catch (error) {
      console.error("[TokenCleaner] Error during cleanup:", error);
    }
  }

  /**
   * Get statistics about offline tokens
   */
  async getStatistics() {
    try {
      const stats = await OfflineToken.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" }
          }
        }
      ]);

      return {
        byStatus: stats,
        timestamp: new Date()
      };
    } catch (error) {
      console.error("[TokenCleaner] Error fetching statistics:", error);
      return null;
    }
  }
}

// Create singleton instance
const cleanerService = new OfflineTokenCleanerService();

module.exports = cleanerService;
