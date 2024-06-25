const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Buyer = require("../model/buyerSchema");
const Seller = require("../model/sellerSchema");
const Broker = require("../model/brokerSchema");
const Admin = require("../model/adminSchema");

module.exports.usersLogin = async (req, res) => {
  const { email, password } = req.body;

  // Check if expected user details are provided
  if (!email || !password) {
    return res
      .status(406)
      .json({ error: "⚠️ Provide all fields", success: false });
  }

  try {
    // Find user in the database
    let user =
      (await Buyer.findOne({ email })) ||
      (await Seller.findOne({ email })) ||
      (await Broker.findOne({ email })) ||
      (await Admin.findOne({ email }));

    if (!user) {
      return res
        .status(401)
        .json({ error: "⚠️ Authentication Failed", success: false });
    }

    // Check if password is correct
    const checkPassword = await bcrypt.compare(password, user.password);
    if (!checkPassword) {
      return res
        .status(401)
        .json({ error: "⚠️ Authentication Failed", success: false });
    }

    // Common checks for all users except Admin
    if (user.role !== "Admin") {
      // Check if user is approved
      if (!user.approved) {
        return res
          .status(401)
          .json({ error: "⚠️ Please verify your email.", success: false });
      }

      // Check if user is active
      if (!user.active) {
        return res.status(401).json({
          error:
            "⚠️ Your account has been deactivated. Please contact customer support",
          success: false,
        });
      }
    }

    // Set token and cookie to expire after 24hrs
    const expireDate = new Date(Date.now() + 86400000); // 24-hour
    const token = jwt.sign({ _id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "1d",
    });
    res.cookie("auth", token, {
      expires: expireDate,
      secure: true,
      // httpOnly: true,
      sameSite: "none",
    });
    // console.log(`LoginToken: `, token);
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
    // console.log(`user:`, others);
    return res
      .status(200)
      .json({ responseMessage: others, token: token, success: true });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "An error occurred", success: false });
  }
};

module.exports.usersLogout = (_, res) => {
  res.clearCookie("auth");
  return res
    .status(200)
    .json({ responseMessage: "Logout Successful", success: true });
};
