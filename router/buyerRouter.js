const express = require("express");
const router = express.Router();
const {
  signUp,
  buyerProfile,
  updateBuyerProfile,
  getAllBrokers,
} = require("../controller/buyerController");
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

// ***** GET ALL PRODUCTS *******
router.get("/products", authorizedBuyer, getAllProducts);

// ***** GET CATEGORY PRODUCT *******
router.get(
  "/products/category/:category",
  authorizedBuyer,
  getProductsByCategory
);

// ***** UPDATE PROFILE ********
router.put("/edit-profile", authorizedBuyer, updateBuyerProfile);

// ***** GET ALL BROKERS *******
router.get("/brokers", authorizedBuyer, getAllBrokers);

module.exports = router;
