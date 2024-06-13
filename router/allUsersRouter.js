const express = require("express");
const router = express.Router();
const usersLogin = require("../controller/login");
const {
  resendOTP,
  forgotPassword,
  changePasswordOTP,
} = require("../controller/otpController");

router.use(express.json());

// ********* LOGIN ROUTE ************
router.post("/login", usersLogin);

// ******** RESEND OTP *************
router.post("/resendotp", resendOTP);

// ******** FORGOT PASSWORD *************
router.post("/forgotpassword", forgotPassword);

// ******** CHANGE PASSWORD (AFTER RECOVERY) *************
router.post("/changepassword", changePasswordOTP);

module.exports = router;
