const express = require("express");
const router = express.Router();

router.use(express.json());

const { signUp, login } = require("../controller/sellerController");
const { verifyOTP } = require("../controller/otpController");

router.use(express.json());

// ******* SIGN-UP ROUTE ********
router.post("/register", signUp);

// ***** VERIFY EMAIL ROUTE *********
router.post("/verification", verifyOTP);

// ********* LOGIN ROUTE ************
router.post("/login", login);

module.exports = router;
