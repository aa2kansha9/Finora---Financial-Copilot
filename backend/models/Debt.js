const mongoose = require("mongoose");

const debtSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      required: true,
      trim: true,
      // Example: credit card, loan, EMI
    },

    totalDebt: {
      type: Number,
      required: true,
      min: [0, "Debt must be positive"],
    },

    monthlyPayment: {
      type: Number,
      required: true,
      min: [0, "Monthly payment must be positive"],
    },

    interestRate: {
      type: Number,
      required: true,
      min: [0, "Interest rate cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Debt", debtSchema);