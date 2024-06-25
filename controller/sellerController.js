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
  try {
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
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: "An error occurred.",
    });
  }
};

// ******* ADD PRODUCT ********
// module.exports.addProduct = async (req, res) => {
//   try {
//     const {
//       name,
//       category,
//       shortDescription,
//       longDescription,
//       costPrice,
//       sellingPrice,
//       color,
//       condition,
//       make,
//       model,
//       year,
//       milleage,
//       quantity,
//       discount,
//       discountType,
//       discountValue,
//       images,
//     } = req.body;

//     // Validate product details
//     if (
//       !name ||
//       !category ||
//       !shortDescription ||
//       !longDescription ||
//       !costPrice ||
//       !sellingPrice ||
//       !color ||
//       !condition ||
//       !make ||
//       !model ||
//       !year ||
//       !milleage ||
//       !quantity ||
//       !discount ||
//       !discountType ||
//       !discountValue ||
//       !images
//     ) {
//       return res.status(400).json({
//         success: false,
//         error: "Please provide all product details",
//       });
//     }

//     // Check if req.seller exists
//     if (!req.seller) {
//       return res.status(400).json({
//         success: false,
//         error: "Seller information is missing",
//       });
//     }

//     // Generate a unique product tag
//     // const productTag = (req.seller.product.length + 1).toString();
//     const productPrefix = name.substring(0, 3).toUpperCase();
//     const productPrefix2 = make.substring(0, 2).toLowerCase();
//     const productPrefix3 = shortDescription.substring(0, 4).toLowerCase();
//     const productPrefix4 = longDescription.substring(0, 5).toLowerCase();

//     const productTagName = `${productPrefix}${productPrefix4}${
//       req.seller.product.length + 19
//     }${productPrefix3}${productPrefix2}${Math.floor(
//       1000 + Math.random() * 9000
//     )}${req.seller.product.length + 1}`;

//     // Trim white spaces
//     const productTag = productTagName.trim().replace(/ /g, "");

//     // Add product to seller's product array
//     req.seller.product.push({
//       productTag,
//       name,
//       category,
//       shortDescription,
//       longDescription,
//       costPrice,
//       sellingPrice,
//       color,
//       condition,
//       make,
//       model,
//       year,
//       milleage,
//       quantity,
//       discount,
//       discountType,
//       discountValue,
//       images,
//     });

//     // Save the seller with the new product
//     const addedProduct = await req.seller?.save();

//     if (addedProduct) {
//       return res.status(201).json({
//         success: true,
//         responseMessage: "Product added successfully.",
//         product: req.seller.product[req.seller.product.length - 1],
//       });
//     } else {
//       return res.status(400).json({
//         success: false,
//         error: "Product not added",
//       });
//     }
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       success: false,
//       error: "An error occurred while adding the product",
//     });
//   }
// };

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
      // images,
    } = req.body;

    // Validate product details
    const requiredFields = [
      { field: "name", value: name },
      { field: "category", value: category },
      { field: "shortDescription", value: shortDescription },
      { field: "longDescription", value: longDescription },
      { field: "costPrice", value: costPrice },
      { field: "sellingPrice", value: sellingPrice },
      { field: "color", value: color },
      { field: "condition", value: condition },
      { field: "make", value: make },
      { field: "model", value: model },
      { field: "year", value: year },
      { field: "milleage", value: milleage },
      { field: "quantity", value: quantity },
      { field: "discount", value: discount },
      { field: "discountType", value: discountType },
      { field: "discountValue", value: discountValue },
      // { field: "images", value: images },
    ];

    // Validate product details
    for (let i = 0; i < requiredFields.length; i++) {
      if (!requiredFields[i].value) {
        return res.status(400).json({
          success: false,
          error: `Please provide ${requiredFields[i].field}`,
        });
      }
    }

    // Check if req.seller exists
    if (!req.seller) {
      return res.status(400).json({
        success: false,
        error: "Seller information is missing",
      });
    }

    // Create image url
    // const imageUrls = req.files.map((file) => file.path);

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map((file) => file.path);
    }

    console.log(`img: `, imageUrls);

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
      images: imageUrls,
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
    // console.log(`ErrorUpload: `, error);
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
    } = req.body;

    // Validate product details
    // if (
    //   !productTag ||
    //   !name ||
    //   !category ||
    //   !shortDescription ||
    //   !longDescription ||
    //   !costPrice ||
    //   !sellingPrice ||
    //   !color ||
    //   !condition ||
    //   !make ||
    //   !model ||
    //   !year ||
    //   !milleage ||
    //   !quantity ||
    //   !discount ||
    //   !discountType ||
    //   !discountValue
    // ) {
    //   return res.status(400).json({
    //     success: false,
    //     error: "Please provide all product details",
    //   });
    // }

    // Validate product details
    const requiredFields = [
      { field: "productTag", value: productTag },
      { field: "name", value: name },
      { field: "category", value: category },
      { field: "shortDescription", value: shortDescription },
      { field: "longDescription", value: longDescription },
      { field: "costPrice", value: costPrice },
      { field: "sellingPrice", value: sellingPrice },
      { field: "color", value: color },
      { field: "condition", value: condition },
      { field: "make", value: make },
      { field: "model", value: model },
      { field: "year", value: year },
      { field: "milleage", value: milleage },
      { field: "quantity", value: quantity },
      { field: "discount", value: discount },
      { field: "discountType", value: discountType },
      { field: "discountValue", value: discountValue },
    ];

    // Validate product details
    for (let i = 0; i < requiredFields.length; i++) {
      if (!requiredFields[i].value) {
        return res.status(400).json({
          success: false,
          error: `Please provide ${requiredFields[i].field}`,
        });
      }
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
      // Save the seller with the updated product
      await req.seller.save();

    return res.status(200).json({
      success: true,
      responseMessage: "Product updated successfully",
      product: product,
    });
  } catch (error) {
    console.log(error);
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

// ****** UPLOAD PHOTO *******
module.exports.uploadPhoto = async (req, res) => {
  try {
    const { productTag } = req.body;

    // Check if file is provided
    // req.file for single; req.files for multiple
    if (!req.files || req.files.length === 0 || !productTag) {
      return res.status(400).json({
        success: false,
        error: "Please provide a photo and its tag to upload",
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

    // For single image
    // const photoUrl = req.file.path;
    // product.images.push(photoUrl);

    // For multiple images
    req.files.forEach((file) => {
      product.images.push(file.path);
    });

    await req.seller.save();

    return res.status(201).json({
      success: true,
      responseMessage: "Photo uploaded successfully.",
      // photoUrl: photoUrl,  // For single image
      photoUrls: req.files.map((file) => file.path),
    });
  } catch (error) {
    console.log(`ErrorUpload: `, error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while uploading the photo",
    });
  }
};
