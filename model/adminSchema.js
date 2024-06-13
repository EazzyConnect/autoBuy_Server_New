const { Schema, model } = require("mongoose");
const { isEmail, isStrongPassword } = require("validator");

const adminSchema = new Schema(
  {
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
      default: "Admin",
    },
    lastChangedPassword: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Admin = new model("admins", adminSchema);

module.exports = Admin;
