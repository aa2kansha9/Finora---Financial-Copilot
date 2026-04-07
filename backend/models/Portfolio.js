const mongoose = require("mongoose");

const PortfolioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  riskProfile: { type: String, required: true },
  investmentAmount: { type: Number, required: true },
  recommendedAssets: { type: Object, required: true },
  explanation: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Portfolio", PortfolioSchema);
