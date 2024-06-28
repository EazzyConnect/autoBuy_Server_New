const { Seller } = require("../model/sellerSchema");
const jwt = require("jsonwebtoken");

// ******* BUSINESS OWNER MIDDLEWARE **********
module.exports.authorizedSeller = async (req, res, next) => {
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
    const seller = await Seller.findById(decodedData._id);
    if (!seller) {
      return res.status(401).json({
        error: "⚠️ Authentication Failed, please log in",
        success: false,
      });
    }

    // Check if token is still valid
    const iat = decodedData.iat * 1000;
    const updated = new Date(seller.lastChangedPassword).getTime();
    if (iat < updated) {
      return res
        .status(401)
        .json({ error: "⚠️ Session expired, log in again", success: false });
    }

    // Check if user is active
    const activeSeller = (await seller.active) === true;
    if (!activeSeller) {
      return res.status(401).json({
        error:
          "⚠️ Your account has been deactivated. Please contact customer support",
        success: false,
      });
    }

    req.seller = seller;
    next();
  } catch (error) {
    return res.json({ error: error.message, success: false });
  }
};
