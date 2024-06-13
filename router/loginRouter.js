const express = require("express");
const router = express.Router();
const usersLogin = require("../controller/login");

router.use(express.json());

// ********* LOGIN ROUTE ************
router.post("/login", usersLogin);

module.exports = router;
