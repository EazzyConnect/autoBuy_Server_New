const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { BuyerOTP, SellerOTP, BrokerOTP } = require("../model/otpSchema");
const Buyer = require("../model/buyerSchema");
const Seller = require("../model/sellerSchema");
const Broker = require("../model/brokerSchema");
dotenv.config();

// ******* PASSWORD VALIDATOR ************
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&#])[A-Za-z\d@$!%?&#]{8,}$/; // Password must contain 'a-z A-Z 0-9 @$!%?&#'

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

// ******** BUYER SESSION *********

// ******** SEND OTP (BUYER) ************
module.exports.sendBuyerOTPEmail = async (user, res, token) => {
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
      // expiresAt: Date.now() + 300000, // 5 minutes
      expiresAt: Date.now() + 3600000, // 1hr
    });
    await newOTPVerification?.save();

    // Send mail to user
    await transporter.sendMail(mailOptions);
    // console.log(`Email sent to ${email}!`);

    return res.status(200).json({
      success: true,
      message: `Verification OTP email sent to ${email}`,
      token: token,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// ******** FORGOT/RECOVER PASSWORD OTP (BUYER) ********
module.exports.recoverBuyerPasswordOTP = async (user, res) => {
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
      // expiresAt: Date.now() + 300000, // 5 minutes
      expiresAt: Date.now() + 3600000, // 1hr
    });
    await newOTPVerification?.save();

    // Send mail to user
    await transporter.sendMail(mailOptions);
    // console.log(`Email sent to ${email}!`);

    // Set token to expire in 6mins
    // const expiresIn = 360000;
    const expiresIn = 3600000;

    // Create a token
    const token = jwt.sign({ email }, process.env.SECRET_KEY, {
      expiresIn,
    });

    // Set the token as cookie. // maxAge is in milliseconds
    res.cookie("auth", token, {
      maxAge: expiresIn,
      // httpOnly: true,
      secure: true,
    });

    // Redirect to "/user/changePassword" route
    return res.status(200).json({
      success: true,
      message: `OTP email sent to ${email}`,
      token: token,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// ********** VERIFY OTP EMAIL (BUYER) ***********
module.exports.verifyBuyerOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res
        .status(406)
        .json({ success: false, error: "Please provide OTP" });
    }

    // Confirm token existence
    // const token = req.cookies.auth;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    // console.log(`verToken:`, token);

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
        await BuyerOTP.deleteMany({
          $or: [{ userId: user_Id }, { email: userEmail }],
        });
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

          if (updateUser.modifiedCount > 0) {
            // Delete the OTP from db
            await BuyerOTP.deleteMany({
              $or: [{ userId: user_Id }, { email: userEmail }],
            });
            return res.status(200).json({
              success: true,
              message: "User email verified successfully.",
            });
          }
        }
      }
    }
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};

// ******** SELLER SESSION *********

// ******** SEND OTP (SELLER) ************
module.exports.sendSellerOTPEmail = async (user, res, token) => {
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
      // expiresAt: Date.now() + 300000, // 5 minutes
      expiresAt: Date.now() + 3600000, // 1hr
    });
    await newOTPVerification?.save();

    // Send mail to user
    await transporter.sendMail(mailOptions);
    // console.log(`Email sent to ${email}!`);

    return res.status(200).json({
      success: true,
      message: `Verification OTP email sent to ${email}`,
      token: token,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// ******** FORGOT/RECOVER PASSWORD OTP (SELLER) ********
module.exports.recoverSellerPasswordOTP = async (user, res) => {
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
      <br><br>
      <b>NOTE: This OTP expires in five (5) minutes. </b>
      <p>DO NOT DISCLOSE OR SHARE YOUR DETAILS WITH ANYONE. ALWAYS REMEMBER TO KEEP YOUR LOGIN DETAILS SAFE AND CONFIDENTIAL.</p>
      `,
    };

    // Hash otp
    const hashedOTP = await bcrypt.hash(otp, 12);

    // Delete provide records of same email
    await SellerOTP.deleteMany({ email });

    // Create a record in the db
    const newOTPVerification = await new SellerOTP({
      userId: _id,
      email,
      otp: hashedOTP,
      createdAt: Date.now(),
      // expiresAt: Date.now() + 300000, // 5 minutes
      expiresAt: Date.now() + 3600000, // 1hr
    });
    await newOTPVerification?.save();

    // Send mail to user
    await transporter.sendMail(mailOptions);
    // console.log(`Email sent to ${email}!`);

    // Set token to expire in 6mins
    // const expiresIn = 360000;
    const expiresIn = 3600000;

    // Create a token
    const token = jwt.sign({ email }, process.env.SECRET_KEY, {
      expiresIn,
    });

    // Set the token as cookie. // maxAge is in milliseconds
    res.cookie("auth", token, {
      maxAge: expiresIn,
      // httpOnly: true,
      secure: true,
    });

    // Redirect to "/user/changePassword" route
    return res.status(200).json({
      success: true,
      message: `OTP email sent to ${email}`,
      token: token,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// ********** VERIFY OTP EMAIL (SELLER) ***********
module.exports.verifySellerOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res
        .status(406)
        .json({ success: false, error: "Please provide OTP" });
    }

    // Confirm token existence
    // const token = req.cookies.auth;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

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
    res.status(403).json({ success: false, message: error.message });
  }
};

// ******** BROKER SESSION *********

// ******** SEND OTP (BROKER) ************
module.exports.sendBrokerOTPEmail = async (user, res, token) => {
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
    const newOTPVerification = await new BrokerOTP({
      userId: _id,
      email,
      otp: hashedOTP,
      createdAt: Date.now(),
      // expiresAt: Date.now() + 300000, // 5 minutes
      expiresAt: Date.now() + 3600000, // 1hr
    });
    await newOTPVerification?.save();

    // Send mail to user
    await transporter.sendMail(mailOptions);
    // console.log(`Email sent to ${email}!`);

    return res.status(200).json({
      success: true,
      message: `Verification OTP email sent to ${email}`,
      token: token,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// ******** FORGOT/RECOVER PASSWORD OTP (BROKER) ********
module.exports.recoverBrokerPasswordOTP = async (user, res) => {
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
      <br><br>
      <b>NOTE: This OTP expires in five (5) minutes. </b>
      <p>DO NOT DISCLOSE OR SHARE YOUR DETAILS WITH ANYONE. ALWAYS REMEMBER TO KEEP YOUR LOGIN DETAILS SAFE AND CONFIDENTIAL.</p>
      `,
    };

    // Hash otp
    const hashedOTP = await bcrypt.hash(otp, 12);

    // Delete provide records of same email
    await BrokerOTP.deleteMany({ email });

    // Create a record in the db
    const newOTPVerification = await new BrokerOTP({
      userId: _id,
      email,
      otp: hashedOTP,
      createdAt: Date.now(),
      // expiresAt: Date.now() + 300000, // 5 minutes
      expiresAt: Date.now() + 3600000, // 1hr
    });
    await newOTPVerification?.save();

    // Send mail to user
    await transporter.sendMail(mailOptions);
    // console.log(`Email sent to ${email}!`);

    // Set token to expire in 6mins
    // const expiresIn = 360000;
    const expiresIn = 3600000;

    // Create a token
    const token = jwt.sign({ email }, process.env.SECRET_KEY, {
      expiresIn,
    });

    // Set the token as cookie. // maxAge is in milliseconds
    res.cookie("auth", token, {
      maxAge: expiresIn,
      // httpOnly: true,
      secure: true,
    });

    // Redirect to "/user/changePassword" route
    return res.status(200).json({
      success: true,
      message: `OTP email sent to ${email}`,
      token: token,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// ********** VERIFY OTP EMAIL (BROKER) ***********
module.exports.verifyBrokerOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res
        .status(406)
        .json({ success: false, error: "Please provide OTP" });
    }

    // Confirm token existence
    // const token = req.cookies.auth;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

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
    const userOTPVerifyRecords = await BrokerOTP.findOne({
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
        await BrokerOTP.deleteMany({ userId: user_Id } || { email: userEmail });
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
          const updateUser = await Broker.updateOne(
            { $or: [{ _id: user_Id }, { email: userEmail }] },
            { $set: { approved: true } }
          );

          if (updateUser) {
            // Delete the OTP from db
            await BrokerOTP.deleteMany(
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
    res.status(403).json({ success: false, message: error.message });
  }
};

// ********** RESEND OTP FOR ALL USERS ***********
// module.exports.resendOTP = async (req, res) => {
//   try {
//     // Confirm token existence
//     const token = req.cookies.auth;

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         error: "Session expired. Provide yor email to resend OTP again.",
//       });
//     }

//     // Verifying and decoding the token
//     const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
//     console.log(`decoded: `, decodedToken);

//     // Extracting items from the decoded token
//     const user_Id = decodedToken._id;
//     const userEmail = decodedToken.email;

//     let user = await Buyer.findOne(
//       { $or: [{ _id: user_Id }, { email: userEmail }] },
//       "email _id"
//     );
//     let buyerEmail = user.email;
//     console.log(`buyer: `, user);

//     if (!buyerEmail) {
//       const user = await Seller.findOne(
//         { $or: [{ _id: user_Id }, { email: userEmail }] },
//         "email -_id"
//       );
//       const sellerEmail = user.email;
//       console.log(`SellerEmail: `, user);

//       if (!sellerEmail) {
//         const user = await Broker.findOne(
//           { $or: [{ _id: user_Id }, { email: userEmail }] },
//           "email -_id"
//         );
//         const brokerEmail = user.email;
//         console.log(`BrokerEmail: `, brokerEmail);

//         if (!brokerEmail) {
//           return res.status(406).json({
//             error: "Please provide your email address",
//             success: false,
//           });
//         } else {
//           await BrokerOTP.deleteMany({ email: brokerEmail });

//           // Set cookies to expire in 6mins (360 * 1000)
//           // const expiresIn = 360 * 1000;
//           const expiresIn = 3600000;

//           // Create a token
//           const token = jwt.sign(
//             { email: brokerEmail },
//             process.env.SECRET_KEY,
//             {
//               expiresIn,
//             }
//           );

//           // Set the token as cookie.
//           res.cookie("auth", token, {
//             maxAge: expiresIn,
//            // httpOnly: true,
//             secure: true,
//           });

//           // call the sendOTP function
//           module.exports.sendBrokerOTPEmail({ email: brokerEmail }, res);
//         }
//       } else {
//         await SellerOTP.deleteMany({ email: sellerEmail });

//         // Set cookies to expire in 6mins (360 * 1000)
//         // const expiresIn = 360 * 1000;
//         const expiresIn = 3600000;

//         // Create a token
//         const token = jwt.sign({ email: sellerEmail }, process.env.SECRET_KEY, {
//           expiresIn,
//         });

//         // Set the token as cookie.
//         res.cookie("auth", token, {
//           maxAge: expiresIn,
//          // httpOnly: true,
//           secure: true,
//         });

//         // call the sendOTP function
//         module.exports.sendSellerOTPEmail({ email: sellerEmail }, res);
//       }
//     } else {
//       await BuyerOTP.deleteMany({ email: buyerEmail });

//       // Set cookies to expire in 6mins (360 * 1000)
//       // const expiresIn = 360 * 1000;
//       const expiresIn = 3600000;

//       // Create a token
//       const token = jwt.sign({ email: buyerEmail }, process.env.SECRET_KEY, {
//         expiresIn,
//       });

//       // Set the token as cookie.
//       res.cookie("auth", token, {
//         maxAge: expiresIn,
//         // httpOnly: true,
//         secure: true,
//       });

//       // call the sendOTP function
//       module.exports.sendBuyerOTPEmail({ email: buyerEmail }, res);

//       // const checkBuyerEmail = await Buyer.findOne(
//       //   { email: buyerEmail },
//       //   "email"
//       // );
//       // if (!checkBuyerEmail) {
//       //   const checkSellerEmail = await Seller.findOne({ email }, "email");
//       //   if (!checkSellerEmail) {
//       //     const checkBrokerEmail = await Broker.findOne({ email }, "email");
//       //     if (!checkBrokerEmail) {
//       //       return res.status(404).json({
//       //         error: "No record found",
//       //         success: false,
//       //       });
//       //     } else {
//       //       await BrokerOTP.deleteMany({ email });

//       //       // Set cookies to expire in 6mins (360 * 1000)
//       //       const expiresIn = 360 * 1000;

//       //       // Create a token
//       //       const token = jwt.sign({ email }, process.env.SECRET_KEY, {
//       //         expiresIn,
//       //       });

//       //       // Set the token as cookie.
//       //       res.cookie("auth", token, {
//       //         maxAge: expiresIn,
//       //         // httpOnly: true,
//       //         secure: true,
//       //       });

//       //       // call the sendOTP function
//       //       module.exports.sendBrokerOTPEmail({ email }, res);
//       //     }
//       //   } else {
//       //     await SellerOTP.deleteMany({ email });

//       //     // Set cookies to expire in 6mins (360 * 1000)
//       //     const expiresIn = 360 * 1000;

//       //     // Create a token
//       //     const token = jwt.sign({ email }, process.env.SECRET_KEY, {
//       //       expiresIn,
//       //     });

//       //     // Set the token as cookie.
//       //     res.cookie("auth", token, {
//       //       maxAge: expiresIn,
//       //       httpOnly: true,
//       //       secure: true,
//       //     });

//       //     // call the sendOTP function
//       //     module.exports.sendSellerOTPEmail({ email }, res);
//       //   }
//       // } else {
//       //   await BuyerOTP.deleteMany({ email: buyerEmail });

//       //   // Set cookies to expire in 6mins (360 * 1000)
//       //   const expiresIn = 360 * 1000;

//       //   // Create a token
//       //   const token = jwt.sign({ email: buyerEmail }, process.env.SECRET_KEY, {
//       //     expiresIn,
//       //   });

//       //   // Set the token as cookie.
//       //   res.cookie("auth", token, {
//       //     maxAge: expiresIn,
//       //     httpOnly: true,
//       //     secure: true,
//       //   });

//       //   // call the sendOTP function
//       //   module.exports.sendBuyerOTPEmail({ email: buyerEmail }, res);
//       // }
//     }
//   } catch (error) {
//     console.log(`err: `, error.message);
//     res.status(403).json({ success: false, message: "An error occured" });
//   }
// };

module.exports.resendOTP = async (req, res) => {
  try {
    // Confirm token existence
    // const token = req.cookies.auth;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Session expired. Provide your email to resend OTP again.",
      });
    }

    // Verifying and decoding the token
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    console.log(`decoded: `, decodedToken);

    // Extracting items from the decoded token
    const user_Id = decodedToken._id;
    const userEmail = decodedToken.email;

    let user = await Buyer.findOne(
      { $or: [{ _id: user_Id }, { email: userEmail }] },
      "email _id"
    );

    if (user) {
      const buyerEmail = user.email;
      await BuyerOTP.deleteMany({ email: buyerEmail });

      const expiresIn = 3600000; // 1 hour

      const newToken = jwt.sign({ email: buyerEmail }, process.env.SECRET_KEY, {
        expiresIn,
      });

      res.cookie("auth", newToken, {
        maxAge: expiresIn,
        // httpOnly: true,
        secure: true,
      });

      module.exports.sendBuyerOTPEmail({ email: buyerEmail }, res);
    } else {
      user = await Seller.findOne(
        { $or: [{ _id: user_Id }, { email: userEmail }] },
        "email _id"
      );

      if (user) {
        const sellerEmail = user.email;
        await SellerOTP.deleteMany({ email: sellerEmail });

        const expiresIn = 3600000; // 1 hour

        const newToken = jwt.sign(
          { email: sellerEmail },
          process.env.SECRET_KEY,
          {
            expiresIn,
          }
        );

        res.cookie("auth", newToken, {
          maxAge: expiresIn,
          // httpOnly: true,
          secure: true,
        });

        module.exports.sendSellerOTPEmail({ email: sellerEmail }, res);
      } else {
        user = await Broker.findOne(
          { $or: [{ _id: user_Id }, { email: userEmail }] },
          "email _id"
        );

        if (user) {
          const brokerEmail = user.email;
          await BrokerOTP.deleteMany({ email: brokerEmail });

          const expiresIn = 3600000; // 1 hour

          const newToken = jwt.sign(
            { email: brokerEmail },
            process.env.SECRET_KEY,
            {
              expiresIn,
            }
          );

          res.cookie("auth", newToken, {
            maxAge: expiresIn,
            // httpOnly: true,
            secure: true,
          });

          module.exports.sendBrokerOTPEmail({ email: brokerEmail }, res);
        } else {
          return res.status(406).json({
            error: "Please provide your email address",
            success: false,
          });
        }
      }
    }
  } catch (error) {
    console.log(`err: `, error.message);
    res.status(403).json({ success: false, message: "An error occurred" });
  }
};

// ********* FORGOT PASSWORD ***********
module.exports.forgotPassword = async (req, res) => {
  // Check the required field
  const { email } = req.body;
  if (!email) {
    return res
      .status(406)
      .json({ error: "⚠️ Provide your email", success: false });
  }

  try {
    // Check if the email exists in the db
    const checkBuyerEmail = await Buyer.findOne({ email }, "email active");
    if (!checkBuyerEmail) {
      const checkSellerEmail = await Seller.findOne({ email }, "email active");
      if (!checkSellerEmail) {
        const checkBrokerEmail = await Broker.findOne(
          { email },
          "email active"
        );
        if (!checkBrokerEmail) {
          return res
            .status(404)
            .json({ error: "⚠️ User not found", success: false });
        } else {
          // Check if broker is active
          const activeBroker = (await checkBrokerEmail.active) === true;
          if (!activeBroker) {
            return res.status(401).json({
              error:
                "⚠️ Your account has been deactivated. Please contact customer support",
              success: false,
            });
          }

          // Send OTP
          module.exports.recoverBrokerPasswordOTP(checkBrokerEmail, res);
        }
      } else {
        // Check if seller is active
        const activeSeller = (await checkSellerEmail.active) === true;
        if (!activeSeller) {
          return res.status(401).json({
            error:
              "⚠️ Your account has been deactivated. Please contact customer support",
            success: false,
          });
        }

        // Send OTP
        module.exports.recoverSellerPasswordOTP(checkSellerEmail, res);
      }
    } else {
      // Check if buyer is active
      const activeBuyer = (await checkBuyerEmail.active) === true;
      if (!activeBuyer) {
        return res.status(401).json({
          error:
            "⚠️ Your account has been deactivated. Please contact customer support",
          success: false,
        });
      }

      // Send OTP
      module.exports.recoverBuyerPasswordOTP(checkBuyerEmail, res);
    }
  } catch (error) {
    console.log(`Err: `, error.message);
    return res
      .status(500)
      .json({ message: "An error occured", success: false });
  }
};

// ********* CHANGE PASSWORD WITH OTP ************
module.exports.changePasswordOTP = async (req, res) => {
  try {
    const { otp, password, confirmPassword } = req.body;
    if (!otp || !password || !confirmPassword) {
      return res
        .status(406)
        .json({ success: false, error: "Please provide all fields" });
    }

    // Confirm token existence
    // const token = req.cookies.auth;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Session expired. Request OTP again.",
      });
    }

    // Verifying and decoding the token
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);

    // Extracting items from the decoded token
    const userEmail = decodedToken.email;

    // Checking for the user information
    const buyerOTPVerifyRecords = await BuyerOTP.findOne({ email: userEmail });

    if (!buyerOTPVerifyRecords) {
      const sellerOTPVerifyRecords = await SellerOTP.findOne({
        email: userEmail,
      });
      if (!sellerOTPVerifyRecords) {
        const brokerOTPVerifyRecords = await BrokerOTP.findOne({
          email: userEmail,
        });
        if (!brokerOTPVerifyRecords) {
          return res.status(400).json({
            success: false,
            error:
              "No record found, please sign up or login or request new OTP code.",
          });
        } else {
          // OTP record exists
          const { expiresAt, otp: hashedOTP } = brokerOTPVerifyRecords;

          // checking if OTP has expired or not
          if (expiresAt < Date.now()) {
            await BrokerOTP.deleteMany({ email: userEmail });
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
              // Success. Update user password

              if (confirmPassword !== password) {
                return res
                  .status(406)
                  .json({ success: false, error: "Password does not match." });
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

              const updateBroker = await Broker.updateOne(
                { email: userEmail },
                {
                  $set: {
                    password: hashedPassword,
                    lastChangedPassword: Date.now(),
                  },
                }
              );

              if (updateBroker) {
                // Delete the OTP from db
                await BrokerOTP.deleteMany({ email: userEmail });
                return res.status(200).json({
                  success: true,
                  message: "Password changed successfully.",
                });
              }
            }
          }
        }
      } else {
        // OTP record exists
        const { expiresAt, otp: hashedOTP } = sellerOTPVerifyRecords;

        // checking if OTP has expired or not
        if (expiresAt < Date.now()) {
          await SellerOTP.deleteMany({ email: userEmail });
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
            // Success. Update user password

            if (confirmPassword !== password) {
              return res
                .status(406)
                .json({ success: false, error: "Password does not match." });
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

            const updateSeller = await Seller.updateOne(
              { email: userEmail },
              {
                $set: {
                  password: hashedPassword,
                  lastChangedPassword: Date.now(),
                },
              }
            );

            if (updateSeller) {
              // Delete the OTP from db
              await SellerOTP.deleteMany({ email: userEmail });
              return res.status(200).json({
                success: true,
                message: "Password changed successfully.",
              });
            }
          }
        }
      }
    } else {
      // OTP record exists
      const { expiresAt, otp: hashedOTP } = buyerOTPVerifyRecords;

      // checking if OTP has expired or not
      if (expiresAt < Date.now()) {
        await BuyerOTP.deleteMany({ email: userEmail });
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
          // Success. Update user password

          if (confirmPassword !== password) {
            return res
              .status(406)
              .json({ success: false, error: "Password does not match." });
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

          const updateBuyer = await Buyer.updateOne(
            { email: userEmail },
            {
              $set: {
                password: hashedPassword,
                lastChangedPassword: Date.now(),
              },
            }
          );

          if (updateBuyer) {
            // Delete the OTP from db
            await BuyerOTP.deleteMany({ email: userEmail });
            return res.status(200).json({
              success: true,
              message: "Password changed successfully.",
            });
          }
        }
      }
    }
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};
