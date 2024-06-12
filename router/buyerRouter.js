const express = require("express");
const router = express.Router();
const { signUp } = require("../controller/buyerController");
const { verifyOTP } = require("../controller/otpController");

router.use(express.json());

// ******* SIGN-UP ROUTE ********
router.post("/register", signUp);

// ***** VERIFY EMAIL ROUTE *********
router.post("/verification", verifyOTP);

module.exports = router;
