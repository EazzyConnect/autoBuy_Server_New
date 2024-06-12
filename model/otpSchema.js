const { model, Schema } = require("mongoose");

const otpVerificationSchema = new Schema({
  userId: {
    type: String,
    ref: "buyers",
  },
  otp: {
    type: String,
  },
  email: {
    type: String,
  },
  createdAt: Date,
  expiresAt: Date,
});

const BuyerOTP = new model("userOtps", otpVerificationSchema);

module.exports = BuyerOTP;
