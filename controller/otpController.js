const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { BuyerOTP, SellerOTP } = require("../model/otpSchema");
const Buyer = require("../model/buyerSchema");
const Seller = require("../model/sellerSchema");
dotenv.config();

// ******** NODEMAILER SETUP *********
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

// ******** SEND OTP (BUYER) ************
module.exports.sendOTPEmail = async (user, res) => {
  const { _id, email } = user;
  try {
    // Generate OTP
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

    // Construct the mail to be sent to user
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Verify Your Email",
      html: `<p> Enter this OTP code: <b>${otp}</b> to verify your email address: <b>${email}</b> and complete signing up. </p>
      <br>
      <b>NOTE: This OTP expires in five (5) minutes.</b>
      `,
    };

    // Hashing OTP
    const hashedOTP = await bcrypt.hash(otp, 12);

    // Create a record in the db
    const newOTPVerification = await new BuyerOTP({
      userId: _id,
      email,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 300000, // 5 minutes
    });
    await newOTPVerification?.save();

    // Send mail to user
    await transporter.sendMail(mailOptions);
    // console.log(`Email sent to ${email}!`);

    return res.status(200).json({
      success: true,
      message: `Verification OTP email sent to ${email}`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// ********** VERIFY OTP EMAIL (BUYER) ***********
module.exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res
        .status(406)
        .json({ success: false, error: "Please provide OTP" });
    }

    // Confirm token existence
    const token = req.cookies.auth;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Session expired. Request OTP again.",
      });
    }

    // Verifying and decoding the token
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);

    // Extracting items from the decoded token
    const user_Id = decodedToken._id;
    const userEmail = decodedToken.email;
    // console.log(`userEmail: `, userEmail, `userID: `, user_Id);

    // Checking for the user information using either email or id.
    // At signup, token was created with user id; while at resendOTP, token was created with user email
    const userOTPVerifyRecords = await BuyerOTP.findOne({
      $or: [{ userId: user_Id }, { email: userEmail }],
    });

    if (!userOTPVerifyRecords) {
      return res.status(400).json({
        success: false,
        error:
          "No record found, please sign up or login or request new OTP code.",
      });
    } else {
      // OTP record exists
      const { expiresAt, otp: hashedOTP } = userOTPVerifyRecords;

      // checking if OTP has expired or not
      if (expiresAt < Date.now()) {
        await BuyerOTP.deleteMany({ userId: user_Id } || { email: userEmail });
        return res.status(400).json({
          success: false,
          error: "OTP code has expired, please request again.",
        });
      } else {
        // OTP is available but checking if it's valid
        const validOTP = await bcrypt.compare(otp, hashedOTP);
        if (!validOTP) {
          return res
            .status(406)
            .json({ success: false, error: "Invalid code provided." });
        } else {
          // Success. Approve the user
          const updateUser = await Buyer.updateOne(
            { $or: [{ _id: user_Id }, { email: userEmail }] },
            { $set: { approved: true } }
          );

          if (updateUser) {
            // Delete the OTP from db
            await BuyerOTP.deleteMany(
              { userId: user_Id } || { email: userEmail }
            );
            return res.status(200).json({
              success: true,
              message: "User email verified successfully.",
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`verifyErr: `, error);
    res.status(403).json({ success: false, message: error.message });
  }
};

// ******** SEND OTP (SELLER) ************
module.exports.sendOTPEmail = async (user, res) => {
  const { _id, email } = user;
  try {
    // Generate OTP
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

    // Construct the mail to be sent to user
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Verify Your Email",
      html: `<p> Enter this OTP code: <b>${otp}</b> to verify your email address: <b>${email}</b> and complete signing up. </p>
      <br>
      <b>NOTE: This OTP expires in five (5) minutes.</b>
      `,
    };

    // Hashing OTP
    const hashedOTP = await bcrypt.hash(otp, 12);

    // Create a record in the db
    const newOTPVerification = await new SellerOTP({
      userId: _id,
      email,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 300000, // 5 minutes
    });
    await newOTPVerification?.save();

    // Send mail to user
    await transporter.sendMail(mailOptions);
    // console.log(`Email sent to ${email}!`);

    return res.status(200).json({
      success: true,
      message: `Verification OTP email sent to ${email}`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// ********** VERIFY OTP EMAIL (SELLER) ***********
module.exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res
        .status(406)
        .json({ success: false, error: "Please provide OTP" });
    }

    // Confirm token existence
    const token = req.cookies.auth;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Session expired. Request OTP again.",
      });
    }

    // Verifying and decoding the token
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);

    // Extracting items from the decoded token
    const user_Id = decodedToken._id;
    const userEmail = decodedToken.email;
    // console.log(`userEmail: `, userEmail, `userID: `, user_Id);

    // Checking for the user information using either email or id.
    // At signup, token was created with user id; while at resendOTP, token was created with user email
    const userOTPVerifyRecords = await SellerOTP.findOne({
      $or: [{ userId: user_Id }, { email: userEmail }],
    });

    if (!userOTPVerifyRecords) {
      return res.status(400).json({
        success: false,
        error:
          "No record found, please sign up or login or request new OTP code.",
      });
    } else {
      // OTP record exists
      const { expiresAt, otp: hashedOTP } = userOTPVerifyRecords;

      // checking if OTP has expired or not
      if (expiresAt < Date.now()) {
        await SellerOTP.deleteMany({ userId: user_Id } || { email: userEmail });
        return res.status(400).json({
          success: false,
          error: "OTP code has expired, please request again.",
        });
      } else {
        // OTP is available but checking if it's valid
        const validOTP = await bcrypt.compare(otp, hashedOTP);
        if (!validOTP) {
          return res
            .status(406)
            .json({ success: false, error: "Invalid code provided." });
        } else {
          // Success. Approve the user
          const updateUser = await Seller.updateOne(
            { $or: [{ _id: user_Id }, { email: userEmail }] },
            { $set: { approved: true } }
          );

          if (updateUser) {
            // Delete the OTP from db
            await SellerOTP.deleteMany(
              { userId: user_Id } || { email: userEmail }
            );
            return res.status(200).json({
              success: true,
              message: "User email verified successfully.",
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`verifyErr: `, error);
    res.status(403).json({ success: false, message: error.message });
  }
};

// ********** RESEND OTP ***********
module.exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(406).json({
        error: "Please provide your email address",
        success: false,
      });
    } else {
      const checkEmail = await Buyer.findOne({ email }, "email");
      if (!checkEmail) {
        return res.status(404).json({
          error: "No record found",
          success: false,
        });
      } else {
        await BuyerOTP.deleteMany({ email });

        // Set cookies to expire in 6mins (360 * 1000)
        const expiresIn = 360 * 1000;

        // Create a token
        const token = jwt.sign({ email }, process.env.SECRET_KEY, {
          expiresIn,
        });

        // Set the token as cookie.
        res.cookie("auth", token, {
          maxAge: expiresIn,
          httpOnly: true,
          secure: true,
        });

        // call the sendOTP function
        module.exports.sendOTPEmail({ email }, res);
      }
    }
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};

// ******** FORGOT/RECOVER PASSWORD OTP ********
module.exports.recoverPassworOTP = async (user, res) => {
  const { _id, email } = user;
  try {
    // Generate OTP
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

    // Construct the mail to be sent to user
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Recover Your Account",
      html: `<p> Enter this OTP: <b>${otp}</b> to recover your account (<b>${email}</b>) and change your password. </p>
      <br>
      <p>Follow this link to recover your account. 🔗https://(change-the domain-name)/user/changePassword</p>
      <br><br>
      <b>NOTE: This OTP expires in five (5) minutes. </b>
      <p>DO NOT DISCLOSE OR SHARE YOUR DETAILS WITH ANYONE. ALWAYS REMEMBER TO KEEP YOUR LOGIN DETAILS SAFE AND CONFIDENTIAL.</p>
      `,
    };

    // Hash otp
    const hashedOTP = await bcrypt.hash(otp, 12);

    // Delete provide records of same email
    await BuyerOTP.deleteMany({ email });

    // Create a record in the db
    const newOTPVerification = await new BuyerOTP({
      userId: _id,
      email,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 300000, // 5 minutes
    });
    await newOTPVerification?.save();

    // Send mail to user
    await transporter.sendMail(mailOptions);
    // console.log(`Email sent to ${email}!`);

    // Set token to expire in 6mins
    const expiresIn = 360000;

    // Create a token
    const token = jwt.sign({ email }, process.env.SECRET_KEY, {
      expiresIn,
    });

    // Set the token as cookie. // maxAge is in milliseconds
    res.cookie("auth", token, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
    });

    // Redirect to "/user/changePassword" route
    return res.status(200).json({
      success: true,
      message: `OTP email sent to ${email}`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};
