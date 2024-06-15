const express = require("express");
const router = express.Router();

router.use(express.json());

const {
  signUp,
  addProduct,
  editProduct,
  deleteProduct,
} = require("../controller/sellerController");
const { verifySellerOTP } = require("../controller/otpController");
const { authorizedSeller } = require("../middleware/sellerMiddleware");

router.use(express.json());

// ******* SIGN-UP ROUTE ********
router.post("/register", signUp);

// ***** VERIFY EMAIL ROUTE *********
router.post("/verification", verifySellerOTP);

// ***** ADD PRODUCT ********
router.post("/add-product", authorizedSeller, addProduct);

// ***** EDIT PRODUCT ********
router.put("/edit-product", authorizedSeller, editProduct);

// ***** DELETE PRODUCT ********
router.delete("/delete-product", authorizedSeller, deleteProduct);

module.exports = router;
