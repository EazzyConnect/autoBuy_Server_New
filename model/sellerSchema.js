const { Schema, model } = require("mongoose");
const { isEmail, isStrongPassword } = require("validator");

const sellerSchema = new Schema(
  {
    firstName: {
      type: String,
    },
    lastName: {
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
    product: [
      {
        productTag: { type: String },
        name: { type: String },
        category: { type: String },
        shortDescription: { type: String },
        longDescription: { type: String },
        costPrice: { type: String },
        sellingPrice: { type: String },
        color: { type: String },
        condition: { type: String },
        make: { type: String },
        model: { type: String },
        year: { type: String },
        milleage: { type: String },
        quantity: { type: String },
        discount: { type: Boolean },
        discountType: { type: String },
        discountValue: { type: String },
        // images: [{ type: String }],
      },
    ],
    role: {
      type: String,
      default: "Seller",
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

const Seller = new model("sellers", sellerSchema);

module.exports = Seller;
