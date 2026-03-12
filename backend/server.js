require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

 app.use("/api/auth", require("./routes/authRoutes"));
// app.use("/api/payment", require("./routes/paymentRoutes"));
// app.use("/api/bank", require("./routes/bankRoutes"));

app.listen(process.env.PORT, () =>
  console.log("Server running")
);
