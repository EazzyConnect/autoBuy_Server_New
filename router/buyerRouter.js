const express = require("express");
const router = express.Router();
const { signUp, buyerProfile } = require("../controller/buyerController");
const { verifyBuyerOTP } = require("../controller/otpController");
const { authorizedBuyer } = require("../middleware/buyerMiddleware");
const {
  getAllProducts,
  getProductsByCategory,
} = require("../controller/buyerController"); // Adjust path as needed

router.use(express.json());

// ******* SIGN-UP ROUTE ********
router.post("/register", signUp);

// ***** VERIFY EMAIL ROUTE *********
router.post("/verification", verifyBuyerOTP);

// ***** PROFILE ******
router.get("/profile", authorizedBuyer, buyerProfile);

// Route to get all products
router.get("/products", getAllProducts);

// Route to get products by category
router.get("/products/category/:category", getProductsByCategory);

module.exports = router;
