const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Buyer = require("../model/buyerSchema");
const { sendBuyerOTPEmail } = require("./otpController");

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
    const validEmail = await Buyer.exists({ email });
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
    const newBuyer = await new Buyer({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });
    await newBuyer?.save();

    // Set token to expire in 6mins (360 * 1000)
    // const expiresIn = 360 * 1000;
    const expiresIn = 3600000;

    // // Create a token
    const token = jwt.sign({ _id: newBuyer._id }, process.env.SECRET_KEY, {
      expiresIn,
    });

    // // Set the token as cookie. // maxAge is in milliseconds
    res.cookie("auth", token, {
      maxAge: expiresIn,
      // httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    // Send OTP if registration is succesfull
    if (newBuyer) {
      await sendBuyerOTPEmail(newBuyer, res, token);
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

module.exports.buyerProfile = async (req, res) => {
  // Check for the user with the user ID
  const user = await Buyer.findById({ _id: req.buyer._id });
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
