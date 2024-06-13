const { model, Schema } = require("mongoose");

// BUYER
const buyerOtpVerSchema = new Schema({
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

const BuyerOTP = new model("buyerOtps", buyerOtpVerSchema);

// SELLER
const sellerOtpVerSchema = new Schema({
  userId: {
    type: String,
    ref: "sellers",
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

const SellerOTP = new model("sellerOtps", sellerOtpVerSchema);

// BROKER
const brokerOtpVerSchema = new Schema({
  userId: {
    type: String,
    ref: "brokers",
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

const BrokerOTP = new model("brokerOtps", brokerOtpVerSchema);

// ADMIN
const adminOtpVerSchema = new Schema({
  userId: {
    type: String,
    ref: "admins",
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

const AdminOTP = new model("adminOtps", adminOtpVerSchema);

module.exports = { BuyerOTP, SellerOTP, BrokerOTP, AdminOTP };
