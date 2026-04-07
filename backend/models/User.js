const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email"],
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    emergencyFundBalance: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  {
    timestamps: true, // this automatically adds createdAt & updatedAt
  }
);

module.exports = mongoose.model("User", userSchema);