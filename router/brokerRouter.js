const express = require("express");
const { signUp } = require("../controller/brokerController");
const { verifyBrokerOTP } = require("../controller/otpController");
const router = express.Router();

router.use(express.json());

// ****** SIGN-UP ROUTE ********
router.post("/register", signUp);

// ***** VERIFY EMAIL ROUTE *********
router.post("/verification", verifyBrokerOTP);

module.exports = router;
