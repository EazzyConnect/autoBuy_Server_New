const bcrypt = require("bcrypt");
const Admin = require("../model/adminSchema");
const { validationResult } = require("express-validator");

// ******* PASSWORD VALIDATOR ************
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&#])[A-Za-z\d@$!%?&#]{8,}$/; // Password must contain 'a-z A-Z 0-9 @$!%?&#'

// ******** SIGN-UP ************
module.exports.signUp = async (req, res) => {
  // Required fields
  const { email, password } = req.body;

  // Check if all data are provided
  if (!email || !password) {
    return res.status(400).json({
      error: "Please provide all fields",
      success: false,
    });
  }

  try {
    // Check if email exist
    const validEmail = await Admin.exists({ email });
    if (validEmail !== null) {
      return res.status(406).json({
        error: "Email already taken",
        success: false,
      });
    }

    // Validate password
    const testPass = passwordRegex.test(password);
    if (!testPass) {
      return res.status(400).json({
        error:
          "Password must contain at least 1 lowercase, 1 uppercase, 1 number, 1 symbol (@$!%?&#), and be at least 8 characters long",
        success: false,
      });
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the user
    const newAdmin = await new Admin({
      email,
      password: hashedPassword,
    });
    await newAdmin?.save();
    return res
      .status(201)
      .json({ message: "Registration successful", success: true });
  } catch (error) {
    console.log(error);
    return res.json(error.message);
  }
};

module.exports.adminProfile = async (req, res) => {
  // Check for the user with the user ID
  const user = await Admin.findById({ _id: req.admin._id });
  if (!user) {
    return res
      .status(401)
      .json({ error: "⚠️ Authentication Failed", success: false });
  }

  // If user is available, destructure the user to take away some information
  const {
    password: hashedPassword,
    _id,
    __v,
    active,
    approved,
    createdAt,
    updatedAt,
    lastChangedPassword,
    ...others
  } = user._doc;
  return res.status(200).json({ responseMessage: others, success: true });
};
