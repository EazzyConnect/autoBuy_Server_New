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
      await sendSellerOTPEmail(newSeller, res, token);
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

// ****** PROFILE ********
module.exports.sellerProfile = async (req, res) => {
  // Check for the user with the user ID
  const user = await Seller.findById({ _id: req.seller._id });
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

// ******* ADD PRODUCT ********
module.exports.addProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      shortDescription,
      longDescription,
      costPrice,
      sellingPrice,
      color,
      condition,
      make,
      model,
      year,
      milleage,
      quantity,
      discount,
      discountType,
      discountValue,
      images,
    } = req.body;

    // Validate product details
    if (
      !name ||
      !category ||
      !shortDescription ||
      !longDescription ||
      !costPrice ||
      !sellingPrice ||
      !color ||
      !condition ||
      !make ||
      !model ||
      !year ||
      !milleage ||
      !quantity ||
      !discount ||
      !discountType ||
      !discountValue ||
      !images
    ) {
      return res.status(400).json({
        success: false,
        error: "Please provide all product details",
      });
    }

    // Check if req.seller exists
    if (!req.seller) {
      return res.status(400).json({
        success: false,
        error: "Seller information is missing",
      });
    }

    // Generate a unique product tag
    // const productTag = (req.seller.product.length + 1).toString();
    const productPrefix = name.substring(0, 3).toUpperCase();
    const productPrefix2 = make.substring(0, 2).toLowerCase();
    const productPrefix3 = shortDescription.substring(0, 4).toLowerCase();
    const productPrefix4 = longDescription.substring(0, 5).toLowerCase();

    const productTagName = `${productPrefix}${productPrefix4}${
      req.seller.product.length + 19
    }${productPrefix3}${productPrefix2}${Math.floor(
      1000 + Math.random() * 9000
    )}${req.seller.product.length + 1}`;

    // Trim white spaces
    const productTag = productTagName.trim().replace(/ /g, "");

    // Add product to seller's product array
    req.seller.product.push({
      productTag,
      name,
      category,
      shortDescription,
      longDescription,
      costPrice,
      sellingPrice,
      color,
      condition,
      make,
      model,
      year,
      milleage,
      quantity,
      discount,
      discountType,
      discountValue,
      images,
    });

    // Save the seller with the new product
    const addedProduct = await req.seller?.save();

    if (addedProduct) {
      return res.status(201).json({
        success: true,
        responseMessage: "Product added successfully.",
        product: req.seller.product[req.seller.product.length - 1],
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Product not added",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while adding the product",
    });
  }
};

// EDIT PRODUCT
module.exports.editProduct = async (req, res) => {
  try {
    const {
      productTag,
      name,
      category,
      shortDescription,
      longDescription,
      costPrice,
      sellingPrice,
      color,
      condition,
      make,
      model,
      year,
      milleage,
      quantity,
      discount,
      discountType,
      discountValue,
      images,
    } = req.body;

    // Validate product details
    if (
      !productTag ||
      !name ||
      !category ||
      !shortDescription ||
      !longDescription ||
      !costPrice ||
      !sellingPrice ||
      !color ||
      !condition ||
      !make ||
      !model ||
      !year ||
      !milleage ||
      !quantity ||
      !discount ||
      !discountType ||
      !discountValue ||
      !images
    ) {
      return res.status(400).json({
        success: false,
        error: "Please provide all product details",
      });
    }

    // Find the product by tag within the seller's products array
    const product = req.seller.product.find((p) => p.productTag === productTag);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // Update product details
    (product.name = name),
      (product.category = category),
      (product.shortDescription = shortDescription),
      (product.longDescription = longDescription),
      (product.costPrice = costPrice),
      (product.sellingPrice = sellingPrice),
      (product.color = color),
      (product.condition = condition),
      (product.make = make),
      (product.model = model),
      (product.year = year),
      (product.milleage = milleage),
      (product.quantity = quantity),
      (product.discount = discount),
      (product.discountType = discountType),
      (product.discountValue = discountValue),
      (product.images = images),
      // Save the seller with the updated product
      await req.seller.save();

    return res.status(200).json({
      success: true,
      responseMessage: "Product updated successfully",
      product: product,
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
    const productIndex = req.seller.product.findIndex(
      (p) => p.productTag === productTag
    );

    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Product not found.",
      });
    }

    // Remove the product from the array
    req.seller.product.splice(productIndex, 1);

    // Save the seller with the removed product
    await req.seller.save();

    return res.status(200).json({
      success: true,
      responseMessage: "Product deleted successfully.",
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
