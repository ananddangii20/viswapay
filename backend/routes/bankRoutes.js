const express = require("express");
const router = express.Router();

router.get("/test", (req, res) => {
  res.send("Bank route working");
});

module.exports = router;