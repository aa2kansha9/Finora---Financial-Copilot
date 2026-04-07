const mongoose = require("mongoose");

const investmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assetType: {
      type: String,
      required: true,
      trim: true,
      // Examples: Stocks, Crypto, Mutual Funds, Gold
    },

    amount: {
      type: Number,
      required: true,
      min: [0, "Amount must be positive"],
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Investment", investmentSchema);