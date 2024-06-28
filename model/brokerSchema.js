const { Schema, model } = require("mongoose");
const { isEmail, isStrongPassword } = require("validator");

const brokerSchema = new Schema(
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
    role: {
      type: String,
      default: "Broker",
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

const Broker = new model("brokers", brokerSchema);

module.exports = Broker;
