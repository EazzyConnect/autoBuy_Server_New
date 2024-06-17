const Admin = require("../model/buyerSchema");
const jwt = require("jsonwebtoken");

// ******* BUSINESS OWNER MIDDLEWARE **********
module.exports.adminOnly = async (req, res, next) => {
  try {
    // Check the available token from cookies or headers
    let token;

    if (req.cookies.auth) {
      token = req.cookies.auth;
    } else if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ error: "⚠️ Session expired, please login", success: false });
    }

    // Verify the token
    const decodedData = jwt.verify(token, process.env.SECRET_KEY);
    const admin = await Admin.findById(decodedData._id);
    if (!admin) {
      return res.status(401).json({
        error: "⚠️ Authentication Failed, please log in",
        success: false,
      });
    }

    // Check if token is still valid
    const iat = decodedData.iat * 1000;
    const updated = new Date(admin.lastChangedPassword).getTime();
    if (iat < updated) {
      return res
        .status(401)
        .json({ error: "⚠️ Session expired, log in again", success: false });
    }

    // Check if user is active
    const adminRole = (await admin.role) === "admin";
    if (!adminRole) {
      return res.status(401).json({
        error: "⚠️ Access Denied!!!",
        success: false,
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.json({ error: "An error occured", success: false });
  }
};
