const Broker = require("../model/brokerSchema");
const jwt = require("jsonwebtoken");

// ******* BUSINESS OWNER MIDDLEWARE **********
module.exports.authorizedBroker = async (req, res, next) => {
  try {
    // Check the available token
    const token = req.cookies.auth;
    if (!token) {
      return res
        .status(401)
        .json({ error: "⚠️ Session expired, please login", success: false });
    }

    // Verify the token
    const decodedData = jwt.verify(token, process.env.SECRET_KEY);
    const broker = await Broker.findById(decodedData._id);
    if (!broker) {
      return res.status(401).json({
        error: "⚠️ Authentication Failed, please log in",
        success: false,
      });
    }

    // Check if token is still valid
    const iat = decodedData.iat * 1000;
    const updated = new Date(broker.lastChangedPassword).getTime();
    if (iat < updated) {
      return res
        .status(401)
        .json({ error: "⚠️ Session expired, log in again", success: false });
    }

    // Check if user is active
    const activeBroker = (await broker.active) === true;
    if (!activeBroker) {
      return res.status(401).json({
        error:
          "⚠️ Your account has been deactivated. Please contact customer support",
        success: false,
      });
    }

    req.broker = broker;
    next();
  } catch (error) {
    return res.json({ error: "An error occured", success: false });
  }
};
