const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { checkAffordability } = require("../controllers/reportController");

router.post("/afford", protect, checkAffordability);

module.exports = router;
