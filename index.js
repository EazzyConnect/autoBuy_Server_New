const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const dbConnection = require("./model/dbConfig");
const buyerRouter = require("./router/buyerRouter");
const sellerRouter = require("./router/sellerRouter");
const brokerRouter = require("./router/brokerRouter");
const adminRouter = require("./router/adminRouter");

const app = express();
dotenv.config();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(helmet());

// Use router
app.use("/buyer", buyerRouter);
app.use("/seller", sellerRouter);
app.use("/broker", brokerRouter);
app.use("/admin", adminRouter);

const PORT = process.env.PORT || 4000;

const start = async () => {
  await dbConnection();
  app.listen(PORT, () => {
    console.log(`Server connected on ${PORT}`);
  });
};

start();
