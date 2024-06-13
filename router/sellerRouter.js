const express = require("express");
const router = express.Router();

router.use(express.json());

const { signUp } = require("../controller/sellerController");
const { verifySellerOTP } = require("../controller/otpController");

router.use(express.json());

// ******* SIGN-UP ROUTE ********
router.post("/register", signUp);

// ***** VERIFY EMAIL ROUTE *********
router.post("/verification", verifySellerOTP);

module.exports = router;
