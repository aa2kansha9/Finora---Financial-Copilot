const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const User = require("../models/User");

router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/profile", protect, async (req, res) => {
  try {
    const { emergencyFundBalance } = req.body;
    if (emergencyFundBalance === undefined) {
      return res.status(400).json({ message: "Send emergencyFundBalance (number ≥ 0, or null to clear)" });
    }
    let ef = null;
    if (emergencyFundBalance !== null && emergencyFundBalance !== "") {
      const n = Number(emergencyFundBalance);
      if (Number.isNaN(n) || n < 0) {
        return res.status(400).json({ message: "emergencyFundBalance must be a number ≥ 0 or null" });
      }
      ef = n;
    }
    const user = await User.findByIdAndUpdate(
      req.user,
      { $set: { emergencyFundBalance: ef } },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;