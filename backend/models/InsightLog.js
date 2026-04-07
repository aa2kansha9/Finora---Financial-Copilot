const mongoose = require("mongoose");

const InsightLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  insights: { type: Array, required: true },
  riskProfile: { type: String },
  score: { type: Number },
  generatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("InsightLog", InsightLogSchema);
