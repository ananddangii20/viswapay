require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const tokenCleanerService = require("./services/offlineTokenCleanerService");

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/bank", require("./routes/bankRoutes"));
app.use("/api/token", require("./routes/tokenRoutes"));

// Start offline token cleaner service
tokenCleanerService.start();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Server] Shutting down gracefully...");
  tokenCleanerService.stop();
  process.exit(0);
});

app.listen(process.env.PORT || 5000, () =>
  console.log("Server running on port", process.env.PORT || 5000)
);


