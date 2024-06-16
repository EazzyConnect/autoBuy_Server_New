const express = require("express");
const router = express.Router();
const { usersLogin, usersLogout } = require("../controller/login_logout");
const {
  resendOTP,
  forgotPassword,
  changePasswordOTP,
} = require("../controller/otpController");

router.use(express.json());

// ********* LOGIN ROUTE ************
router.post("/login", usersLogin);

// ******** LOGOUT ********
router.post("/logout", usersLogout);

// ******** RESEND OTP *************
router.get("/resendotp", resendOTP);

// ******** FORGOT PASSWORD *************
router.post("/forgotpassword", forgotPassword);

// ******** CHANGE PASSWORD (AFTER RECOVERY) *************
router.post("/changepassword", changePasswordOTP);

module.exports = router;
