const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { sendBrokerOTPEmail, recoverPassworOTP } = require("./otpController");
const Broker = require("../model/brokerSchema");

// ******* PASSWORD VALIDATOR ************
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&#])[A-Za-z\d@$!%?&#]{8,}$/; // Password must contain 'a-z A-Z 0-9 @$!%?&#'

// ******** SIGN-UP ************
module.exports.signUp = async (req, res) => {
  // Required fields
  const { firstName, lastName, email, password } = req.body;

  // Check if all data are provided
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({
      error: "Please provide all fields",
      success: false,
    });
  }

  try {
    // Check if email exist
    const validEmail = await Broker.exists({ email });
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
    const newBroker = await new Broker({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });
    await newBroker?.save();

    // Set token to expire in 6mins (360 * 1000)
    const expiresIn = 360 * 1000;

    // Create a token
    const token = jwt.sign({ _id: newBroker._id }, process.env.SECRET_KEY, {
      expiresIn,
    });

    // Set the token as cookie. // maxAge is in milliseconds
    res.cookie("auth", token, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
    });

    // Send OTP if registration is succesfull
    if (newBroker) {
      await sendBrokerOTPEmail(newBroker, res);
      return res.status(201);
    } else {
      return res
        .status(406)
        .json({ error: "Registration failed", success: false });
    }
  } catch (error) {
    console.log(error);
    return res.json(error.message);
  }
};
