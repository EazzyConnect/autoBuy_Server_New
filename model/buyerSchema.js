const { Schema, model } = require("mongoose");
const { isEmail, isStrongPassword } = require("validator");

const buyerSchema = new Schema(
  {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    username: {
      type: String,
    },
    email: {
      type: String,
      required: [true, "Please provide email address"],
      validate: [isEmail, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please provide password"],
      validate: [
        isStrongPassword,
        "Password must be at least eight (8) characters and contain at least one (1) lowercase, one (1) uppercase, one (1) number and one (1) symbol ",
      ],
    },
    presentAddress: {
      type: String,
    },
    permanentAddress: {
      type: String,
    },
    city: {
      type: String,
    },
    postalCode: {
      type: String,
    },
    country: {
      type: String,
    },
    language: {
      type: String,
    },
    timeZone: {
      type: String,
    },
    emailNotification: {
      type: Boolean,
      default: false,
    },
    pushNotification: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: "Buyer",
    },
    lastChangedPassword: {
      type: Date,
      default: Date.now,
    },
    approved: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true, // Only ADMIN can change this field.
    },
  },
  {
    timestamps: true,
  }
);

const Buyer = new model("buyers", buyerSchema);

module.exports = Buyer;
