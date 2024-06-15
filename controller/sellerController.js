const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const Seller = require("../model/sellerSchema");
const SellerOTP = require("../model/otpSchema");
const { sendSellerOTPEmail, recoverPassworOTP } = require("./otpController");

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
    const validEmail = await Seller.exists({ email });
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
    const newSeller = await new Seller({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });
    await newSeller?.save();

    // Set token to expire in 6mins (360 * 1000)
    // const expiresIn = 360 * 1000;
    const expiresIn = 3600000;

    // Create a token
    const token = jwt.sign({ _id: newSeller._id }, process.env.SECRET_KEY, {
      expiresIn,
    });

    // Set the token as cookie. // maxAge is in milliseconds
    res.cookie("auth", token, {
      maxAge: expiresIn,
      // httpOnly: true,
      secure: true,
    });

    // Send OTP if registration is succesfull
    if (newSeller) {
      await sendSellerOTPEmail(newSeller, res);
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

// ******* ADD PRODUCT ********
module.exports.addProduct = async (req, res) => {
  try {
    const { productName, productDesc, productImg } = req.body;

    // Validate product details
    if (!productName || !productDesc || !productImg) {
      return res.status(400).json({
        success: false,
        error: "Please provide all product details",
      });
    }

    // Generate a unique product tag
    // const productTag = (req.user.product.length + 1).toString();
    const productPrefix = productName.substring(0, 3).toUpperCase();
    const productTag = `${productPrefix}${req.user.product.length + 1}`;

    // Add product to seller's product array
    req.user.product.push({
      productTag,
      productName,
      productDesc,
      productImg,
    });

    // Save the seller with the new product
    await req.user.save();

    return res.status(201).json({
      success: true,
      message: "Product added successfully.",
      // product: req.user.product[req.user.product.length - 1],
    });
  } catch (error) {
    // console.log(error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while adding the product",
    });
  }
};

// EDIT PRODUCT
module.exports.editProduct = async (req, res) => {
  try {
    const { productTag, productName, productDesc, productImg } = req.body;

    // Validate product details
    if (!productTag || !productName || !productDesc || !productImg) {
      return res.status(400).json({
        success: false,
        error: "Please provide all product details",
      });
    }

    // Find the product by tag within the seller's products array
    const product = req.user.product.find((p) => p.productTag === productTag);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // Update product details
    product.productName = productName;
    product.productDesc = productDesc;
    product.productImg = productImg;

    // Save the seller with the updated product
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      // product: product,
    });
  } catch (error) {
    // console.log(error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while updating the product",
    });
  }
};

// ******* DELETE PRODUCT *******
module.exports.deleteProduct = async (req, res) => {
  try {
    const { productTag } = req.body;

    // Validate product tag
    if (!productTag) {
      return res.status(400).json({
        success: false,
        error: "Please provide the product tag.",
      });
    }

    // Find the product by tag within the seller's products array
    const productIndex = req.user.product.findIndex(
      (p) => p.productTag === productTag
    );

    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Product not found.",
      });
    }

    // Remove the product from the array
    req.user.product.splice(productIndex, 1);

    // Save the seller with the removed product
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    // console.log(error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while deleting the product",
    });
  }
};

// ******* SIGN-IN (NOT USED) ***********
// module.exports.login = async (req, res) => {
//   const { email, password } = req.body;

//   // Check if expected user details are provided
//   if (!email || !password) {
//     return res
//       .status(406)
//       .json({ error: "⚠️ Provide all fields", success: false });
//   }

//   // Check for the user in the db
//   const seller = await Seller.findOne({ email });
//   if (!seller) {
//     return res
//       .status(401)
//       .json({ error: "⚠️ Authentication Failed", success: false });
//   }

//   // Check if password is correct
//   const checkPassword = await bcrypt.compare(password, seller.password);
//   if (!checkPassword) {
//     return res
//       .status(401)
//       .json({ error: "⚠️ Authentication Failed", success: false });
//   }

//   // Check if user is approved
//   const approvedUser = (await seller.approved) === true;
//   if (!approvedUser) {
//     return res.status(401).json({
//       error: "⚠️ Please verify your email.",
//       success: false,
//     });
//   }

//   // Check if user is active
//   const activeUser = (await seller.active) === true;
//   if (!activeUser) {
//     return res.status(401).json({
//       error:
//         "⚠️ Your account has been deactivated. Please contact customer support",
//       success: false,
//     });
//   }

//   try {
//     // Assign token and redirect to profile page
//     const expireDate = new Date(Date.now() + 3600000); // 1-hour
//     const token = jwt.sign({ _id: seller._id }, process.env.SECRET_KEY, {
//       expiresIn: "1h",
//     });
//     res.cookie("auth", token, {
//       expires: expireDate,
//       secure: true,
//       httpOnly: true,
//     });
//     // res.redirect("/user/profile");
//     const {
//       password: hashedPassword,
//       _id,
//       __v,
//       active,
//       approved,
//       createdAt,
//       updatedAt,
//       lastChangedPassword,
//       ...others
//     } = seller._doc;
//     return res.status(200).json({ data: others, success: true });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "An error occured", success: false });
//   }
// };
