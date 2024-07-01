const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Buyer = require("../model/buyerSchema");
const { sendBuyerOTPEmail } = require("./otpController");
const { Seller, Product } = require("../model/sellerSchema");
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

module.exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().populate("seller", "username");

    if (products.length === 0) {
      return res.status(200).json({ product: "No product available" });
    } else {
      return res.status(200).json({
        success: true,
        productLength: products.length,
        product: products,
      });
    }
  } catch (error) {
    // console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// module.exports.getProductsByCategory = async (req, res) => {
//   const { category } = req.body;

//   // Check if category is provided
//   if (!category) {
//     return res
//       .status(400)
//       .json({ success: false, error: "Category is required" });
//   }

//   try {
//     // Find products by category and populate the seller's username
//     const products = await Product.find({ category }).populate(
//       "seller",
//       "username"
//     );

//     // Respond with the found products
//     res.status(200).json({ success: true, products });
//   } catch (error) {
//     // Handle errors
//     console.error(error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

module.exports.getProductsByCategory = async (req, res) => {
  const { category } = req.params;
  try {
    const products = await Product.find({ category }).populate(
      "seller",
      "username"
    );

    if (products.length === 0) {
      return res.status(200).json({ product: "No product available" });
    } else {
      return res.status(200).json({
        success: true,
        productLength: products.length,
        product: products,
      });
    }
  } catch (error) {
    // console.error(error);
    return res.status(500).json({ success: false, error: "An error occured" });
  }
};

// ****** USER SETTINGS: EDIT PROFILE *********
module.exports.updateBuyerProfile = async (req, res) => {
  try {
    // Check if req.buyer exists
    if (!req.buyer) {
      return res.status(400).json({
        success: false,
        error: "Buyer information is missing",
      });
    }
    const {
      firstName,
      lastName,
      username,
      permanentAddress,
      presentAddress,
      city,
      town,
      postalCode,
      country,
      language,
      timeZone,
      emailNotification,
      pushNotification,
    } = req.body;

    if (firstName) req.buyer.firstName = firstName;
    if (lastName) req.buyer.lastName = lastName;
    if (permanentAddress) req.buyer.permanentAddress = permanentAddress;
    if (presentAddress) req.buyer.presentAddress = presentAddress;
    if (city) req.buyer.city = city;
    if (town) req.buyer.town = town;
    if (postalCode) req.buyer.postalCode = postalCode;
    if (country) req.buyer.country = country;
    if (language) req.buyer.language = language;
    if (timeZone) req.buyer.timeZone = timeZone;
    if (emailNotification) req.buyer.emailNotification = emailNotification;
    if (pushNotification) req.buyer.pushNotification = pushNotification;
    if (username) {
      const checkUsername = await Buyer.exists({ username });
      if (checkUsername !== null) {
        return res.status(406).json({
          responseMessage: "Username already taken",
          success: false,
        });
      }
      req.buyer.username = username;
    }

    // Update profile photo if a new one is uploaded
    if (req.file) {
      req.buyer.profilePhoto = req.file.path;
    }

    const update = await req.buyer.save();
    if (update) {
      return res
        .status(200)
        .json({ responseMessage: "Update successful", success: true });
    }
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ responseMessage: "An error occured", success: false });
  }
};

// ***** GET ALL BROKOERS *********
module.exports.getAllBrokers = async (req, res) => {
  try {
    const brokers = await Broker.find(
      { approved: true },
      "firstName lastName email -_id"
    );

    if (brokers.length === 0) {
      return res
        .status(404)
        .json({ responseMessage: "No broker found", success: false });
    } else {
      return res.status(200).json({
        responseMessage: {
          brokers: brokers,
          availableBrokers: brokers.length,
        },
        success: true,
      });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ responseMessage: "An error occured", success: false });
  }
};
