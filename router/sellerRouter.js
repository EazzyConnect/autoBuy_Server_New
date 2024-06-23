const express = require("express");
const router = express.Router();

router.use(express.json());

const {
  signUp,
  addProduct,
  editProduct,
  deleteProduct,
  sellerProfile,
  uploadPhoto,
} = require("../controller/sellerController");
const { verifySellerOTP } = require("../controller/otpController");
const { authorizedSeller } = require("../middleware/sellerMiddleware");
const parser = require("../config/cloudinary");

router.use(express.json());

// ******* SIGN-UP ROUTE ********
router.post("/register", signUp);

// ***** VERIFY EMAIL ROUTE *********
router.post("/verification", verifySellerOTP);

// ***** PROFILE ******
router.get("/profile", authorizedSeller, sellerProfile);

// ***** ADD PRODUCT ********
router.post(
  "/add-product",
  authorizedSeller,
  parser.array("images"),
  addProduct
);

// ***** EDIT PRODUCT ********
router.put("/edit-product", authorizedSeller, editProduct);

// ***** DELETE PRODUCT ********
router.delete("/delete-product", authorizedSeller, deleteProduct);

// ******UPLOAD PHOTO ******
router.post(
  "/upload-photo",
  authorizedSeller,
  // parser.single("images"), // For single image
  parser.array("images"),
  uploadPhoto
);

module.exports = router;
