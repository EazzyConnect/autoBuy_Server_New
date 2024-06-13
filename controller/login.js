const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Buyer = require("../model/buyerSchema");
const Seller = require("../model/sellerSchema");
const Broker = require("../model/brokerSchema");
const Admin = require("../model/adminSchema");

const usersLogin = async (req, res) => {
  const { email, password } = req.body;

  // Check if expected user details are provided
  if (!email || !password) {
    return res
      .status(406)
      .json({ error: "⚠️ Provide all fields", success: false });
  }

  // Check if user is a BUYER or SELLER or BROKER or ADMIN
  try {
    // Check for the buyer in the db
    const buyer = await Buyer.findOne({ email });
    if (!buyer) {
      // Check for seller if no buyer
      const seller = await Seller.findOne({ email });
      if (!seller) {
        // Check for broker if no seller
        const broker = await Broker.findOne({ email });
        if (!broker) {
          // Check for admin if no broker
          const admin = await Admin.findOne({ email });
          if (!admin) {
            return res
              .status(401)
              .json({ error: "⚠️ Authentication Failed", success: false });
          } else {
            if (admin.role === "Admin") {
              // Check if admin password is correct
              const checkPassword = await bcrypt.compare(
                password,
                admin.password
              );
              if (!checkPassword) {
                return res
                  .status(401)
                  .json({ error: "⚠️ Authentication Failed", success: false });
              }

              // Assign token and redirect to profile page
              const expireDate = new Date(Date.now() + 3600000); // 1-hour
              const token = jwt.sign(
                { _id: admin._id },
                process.env.SECRET_KEY,
                {
                  expiresIn: "1h",
                }
              );
              res.cookie("auth", token, {
                expires: expireDate,
                secure: true,
                httpOnly: true,
              });
              // res.redirect("/user/profile");
              const {
                password: hashedPassword,
                _id,
                __v,
                active,
                approved,
                createdAt,
                updatedAt,
                lastChangedPassword,
                ...others
              } = admin._doc;
              return res.status(200).json({ data: others, success: true });
            }
          }
        } else {
          if (broker.role === "Broker") {
            // Check if broker password is correct
            const checkPassword = await bcrypt.compare(
              password,
              broker.password
            );
            if (!checkPassword) {
              return res
                .status(401)
                .json({ error: "⚠️ Authentication Failed", success: false });
            }

            // Check if broker is approved
            const approvedBroker = (await broker.approved) === true;
            if (!approvedBroker) {
              return res.status(401).json({
                error: "⚠️ Please verify your email.",
                success: false,
              });
            }

            // Check if broker is active
            const activeBroker = (await broker.active) === true;
            if (!activeBroker) {
              return res.status(401).json({
                error:
                  "⚠️ Your account has been deactivated. Please contact customer support",
                success: false,
              });
            }

            // Assign token and redirect to profile page
            const expireDate = new Date(Date.now() + 3600000); // 1-hour
            const token = jwt.sign(
              { _id: broker._id },
              process.env.SECRET_KEY,
              {
                expiresIn: "1h",
              }
            );
            res.cookie("auth", token, {
              expires: expireDate,
              secure: true,
              httpOnly: true,
            });
            // res.redirect("/user/profile");
            const {
              password: hashedPassword,
              _id,
              __v,
              active,
              approved,
              createdAt,
              updatedAt,
              lastChangedPassword,
              ...others
            } = broker._doc;
            return res.status(200).json({ data: others, success: true });
          }
        }
      } else {
        if (seller.role === "Seller") {
          // Check if seller password is correct
          const checkPassword = await bcrypt.compare(password, seller.password);
          if (!checkPassword) {
            return res
              .status(401)
              .json({ error: "⚠️ Authentication Failed", success: false });
          }

          // Check if seller is approved
          const approvedSeller = (await seller.approved) === true;
          if (!approvedSeller) {
            return res.status(401).json({
              error: "⚠️ Please verify your email.",
              success: false,
            });
          }

          // Check if seller is active
          const activeSeller = (await seller.active) === true;
          if (!activeSeller) {
            return res.status(401).json({
              error:
                "⚠️ Your account has been deactivated. Please contact customer support",
              success: false,
            });
          }

          // Assign token and redirect to profile page
          const expireDate = new Date(Date.now() + 3600000); // 1-hour
          const token = jwt.sign({ _id: seller._id }, process.env.SECRET_KEY, {
            expiresIn: "1h",
          });
          res.cookie("auth", token, {
            expires: expireDate,
            secure: true,
            httpOnly: true,
          });
          // res.redirect("/user/profile");
          const {
            password: hashedPassword,
            _id,
            __v,
            active,
            approved,
            createdAt,
            updatedAt,
            lastChangedPassword,
            ...others
          } = seller._doc;
          return res.status(200).json({ data: others, success: true });
        }
      }
    } else {
      if (buyer.role === "Buyer") {
        // Check if buyer password is correct
        const checkPassword = await bcrypt.compare(password, buyer.password);
        if (!checkPassword) {
          return res
            .status(401)
            .json({ error: "⚠️ Authentication Failed", success: false });
        }

        // Check if buyer is approved
        const approvedBuyer = (await buyer.approved) === true;
        if (!approvedBuyer) {
          return res.status(401).json({
            error: "⚠️ Please verify your email.",
            success: false,
          });
        }

        // Check if buyer is active
        const activeBuyer = (await buyer.active) === true;
        if (!activeBuyer) {
          return res.status(401).json({
            error:
              "⚠️ Your account has been deactivated. Please contact customer support",
            success: false,
          });
        }

        // Assign token and redirect to profile page
        const expireDate = new Date(Date.now() + 3600000); // 1-hour
        const token = jwt.sign({ _id: buyer._id }, process.env.SECRET_KEY, {
          expiresIn: "1h",
        });
        res.cookie("auth", token, {
          expires: expireDate,
          secure: true,
          httpOnly: true,
        });
        // res.redirect("/user/profile");
        const {
          password: hashedPassword,
          _id,
          __v,
          active,
          approved,
          createdAt,
          updatedAt,
          lastChangedPassword,
          ...others
        } = buyer._doc;
        return res.status(200).json({ data: others, success: true });
      }
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occured", success: false });
  }
};

module.exports = usersLogin;
