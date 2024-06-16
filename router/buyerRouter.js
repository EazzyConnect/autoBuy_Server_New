const express = require("express");
const router = express.Router();
const { signUp, buyerProfile } = require("../controller/buyerController");
const { verifyBuyerOTP } = require("../controller/otpController");
const { authorizedBuyer } = require("../middleware/buyerMiddleware");

router.use(express.json());

// ******* SIGN-UP ROUTE ********
router.post("/register", signUp);

// ***** VERIFY EMAIL ROUTE *********
router.post("/verification", verifyBuyerOTP);

// ***** PROFILE ******
router.get("/profile", authorizedBuyer, buyerProfile);

module.exports = router;
