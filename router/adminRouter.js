const express = require("express");
const { signUp, adminProfile } = require("../controller/adminController");
const { adminOnly } = require("../middleware/adminMiddleware");
const router = express.Router();

router.use(express.json());

// ****** SIGN-UP ********
router.post("/register", signUp);

// ***** PROFILE ******
router.get("/profile", adminOnly, adminProfile);

module.exports = router;
