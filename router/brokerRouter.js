const express = require("express");
const { signUp, brokerProfile } = require("../controller/brokerController");
const { verifyBrokerOTP } = require("../controller/otpController");
const { authorizedBroker } = require("../middleware/brokerMiddleware");
const router = express.Router();

router.use(express.json());

// ****** SIGN-UP ROUTE ********
router.post("/register", signUp);

// ***** VERIFY EMAIL ROUTE *********
router.post("/verification", verifyBrokerOTP);

// ***** PROFILE ******
router.get("/profile", authorizedBroker, brokerProfile);

module.exports = router;
