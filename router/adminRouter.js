const express = require("express");
const { signUp } = require("../controller/adminController");
const router = express.Router();

router.use(express.json());

router.post("/register", signUp);

module.exports = router;
