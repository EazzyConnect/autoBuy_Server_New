const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { Seller, Product } = require("../model/sellerSchema");
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
    const user = await Seller.findById({ _id: req.seller._id }).populate(
      "product"
    );
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

    // Generate a unique product tag

    // const productTag = (req.seller.product.length + 1).toString();

    const productPrefix = name.substring(0, 3).toUpperCase();
    const productPrefix2 = make.substring(0, 2).toLowerCase();
    const productPrefix3 = shortDescription.substring(0, 4).toLowerCase();
    const productPrefix4 = longDescription.substring(0, 5).toLowerCase();

    const productTagName = `${productPrefix}${productPrefix4}${productPrefix3}${productPrefix2}${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    // Trim white spaces
    const productTag = productTagName.trim().replace(/ /g, "");

    // // Add product to seller's product array
    // req.seller.product.push({
    //   productTag,
    //   name,
    //   category,
    //   shortDescription,
    //   longDescription,
    //   costPrice,
    //   sellingPrice,
    //   color,
    //   condition,
    //   make,
    //   model,
    //   year,
    //   milleage,
    //   quantity,
    //   discount,
    //   discountType,
    //   discountValue,
    //   images: imageUrls,
    // });

    // // Save the seller with the new product
    // const addedProduct = await req.seller?.save();

    const newProduct = new Product({
      seller: req.seller._id,
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

    // Save the new product
    const savedProduct = await newProduct.save();

    // Add product reference to seller's products array
    req.seller.product.push(savedProduct._id);
    const addedProduct = await req.seller?.save();

    if (addedProduct) {
      return res.status(201).json({
        success: true,
        responseMessage: "Product added successfully.",
        // product: req.seller.product[req.seller.product.length - 1],
        product: savedProduct,
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
// module.exports.editProduct = async (req, res) => {
//   try {
//     const {
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
//     } = req.body;

//     // Validate product details
//     const requiredFields = [
//       { field: "productTag", value: productTag },
//       { field: "name", value: name },
//       { field: "category", value: category },
//       { field: "shortDescription", value: shortDescription },
//       { field: "longDescription", value: longDescription },
//       { field: "costPrice", value: costPrice },
//       { field: "sellingPrice", value: sellingPrice },
//       { field: "color", value: color },
//       { field: "condition", value: condition },
//       { field: "make", value: make },
//       { field: "model", value: model },
//       { field: "year", value: year },
//       { field: "milleage", value: milleage },
//       { field: "quantity", value: quantity },
//       { field: "discount", value: discount },
//       { field: "discountType", value: discountType },
//       { field: "discountValue", value: discountValue },
//     ];

//     // Validate product details
//     for (let i = 0; i < requiredFields.length; i++) {
//       if (!requiredFields[i].value) {
//         return res.status(400).json({
//           success: false,
//           error: `Please provide ${requiredFields[i].field}`,
//         });
//       }
//     }

//     // Find the product by tag within the seller's products array
//     const product = req.seller.product.find((p) => p.productTag === productTag);

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         error: "Product not found",
//       });
//     }

//     // Update product details
//     (product.name = name),
//       (product.category = category),
//       (product.shortDescription = shortDescription),
//       (product.longDescription = longDescription),
//       (product.costPrice = costPrice),
//       (product.sellingPrice = sellingPrice),
//       (product.color = color),
//       (product.condition = condition),
//       (product.make = make),
//       (product.model = model),
//       (product.year = year),
//       (product.milleage = milleage),
//       (product.quantity = quantity),
//       (product.discount = discount),
//       (product.discountType = discountType),
//       (product.discountValue = discountValue),
//       // Save the seller with the updated product
//       await req.seller.save();

//     return res.status(200).json({
//       success: true,
//       responseMessage: "Product updated successfully",
//       product: product,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       success: false,
//       error: "An error occurred while updating the product",
//     });
//   }
// };

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

    // Ensure req.seller is defined
    if (!req.seller) {
      return res.status(401).json({
        success: false,
        error: "Seller information is missing.",
      });
    }

    console.log("Seller's products:", req.seller.product);

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

// ****** DELETE PHOTO *******
module.exports.deletePhoto = async (req, res) => {
  try {
    const { productTag, imageUrl } = req.body;

    // Validate product details
    const requiredFields = [
      { field: "productTag", value: productTag },
      { field: "imageUrl", value: imageUrl },
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

    // Find the index of the image to delete
    const imageIndex = product.images.indexOf(imageUrl);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Image not found in product.",
      });
    }

    // Remove the image from the array
    product.images.splice(imageIndex, 1);

    await req.seller.save();

    return res.status(200).json({
      success: true,
      responseMessage: "Photo deleted successfully.",
    });
  } catch (error) {
    console.error("ErrorDeletePhoto: ", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while deleting the photo.",
    });
  }
};

// ****** USER SETTINGS: EDIT PROFILE *********
module.exports.updateSellerProfile = async (req, res) => {
  try {
    // Check if req.seller exists
    if (!req.seller) {
      return res.status(400).json({
        success: false,
        error: "Seller information is missing",
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
    } = req.body;

    if (firstName) req.seller.firstName = firstName;
    if (lastName) req.seller.lastName = lastName;
    if (permanentAddress) req.seller.permanentAddress = permanentAddress;
    if (presentAddress) req.seller.presentAddress = presentAddress;
    if (city) req.seller.city = city;
    if (town) req.seller.town = town;
    if (username) {
      const checkUsername = await Seller.exists({ username });
      if (checkUsername !== null) {
        return res.status(406).json({
          responseMessage: "Username already taken",
          success: false,
        });
      }
      req.seller.username = username;
    }

    const update = await req.seller.save();
    if (update) {
      return res
        .status(200)
        .json({ responseMessage: "Update successful", success: true });
    }
  } catch (error) {
    console.error();
    return res
      .status(500)
      .json({ responseMessage: "An error occured", success: false });
  }
};

// ****** EDIT PRODUCT FULLY *******
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

    // This is for multiple imagesUrls.
    // let deleteImages = [];
    // if (req.body.deleteImages) {
    //   try {
    //     deleteImages = JSON.parse(req.body.deleteImages);
    //   } catch (error) {
    //     return res.status(400).json({
    //       success: false,
    //       error: "Invalid format for deleteImages. It should be a JSON array.",
    //     });
    //   }
    // }

    // Validate productTag
    if (!productTag) {
      return res.status(400).json({
        success: false,
        error: "Please provide productTag",
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

    // Update product details if provided
    if (name) product.name = name;
    if (category) product.category = category;
    if (shortDescription) product.shortDescription = shortDescription;
    if (longDescription) product.longDescription = longDescription;
    if (costPrice) product.costPrice = costPrice;
    if (sellingPrice) product.sellingPrice = sellingPrice;
    if (color) product.color = color;
    if (condition) product.condition = condition;
    if (make) product.make = make;
    if (model) product.model = model;
    if (year) product.year = year;
    if (milleage) product.milleage = milleage;
    if (quantity) product.quantity = quantity;
    if (discount !== undefined) product.discount = discount;
    if (discountType) product.discountType = discountType;
    if (discountValue) product.discountValue = discountValue;

    // Handle adding new image files
    if (req.files && req.files.length > 0) {
      const imageUrls = req.files.map((file) => file.path);
      imageUrls.forEach((url) => {
        product.images.push(url);
      });
    }

    // Handle deleting images for multiple imageUrls
    // if (deleteImages && Array.isArray(deleteImages)) {
    //   deleteImages.forEach((image) => {
    //     const imageIndex = product.images.indexOf(image);
    //     if (imageIndex !== -1) {
    //       product.images.splice(imageIndex, 1);
    //     }
    //   });
    // }

    // Handle deleting images
    if (req.body.deleteImages) {
      let deleteImages;
      try {
        deleteImages = JSON.parse(req.body.deleteImages);
      } catch {
        deleteImages = [req.body.deleteImages];
      }

      deleteImages.forEach((image) => {
        const imageIndex = product.images.indexOf(image);
        if (imageIndex !== -1) {
          product.images.splice(imageIndex, 1);
        }
      });
    }

    await req.seller.save();

    return res.status(200).json({
      success: true,
      responseMessage: "Product updated successfully",
      product: product,
    });
  } catch (error) {
    console.log("ErrorEditProduct: ", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while updating the product",
    });
  }
};
