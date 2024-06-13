const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
// const path = require("path");
const dbConnection = require("./model/dbConfig");
const buyerRouter = require("./router/buyerRouter");
const sellerRouter = require("./router/sellerRouter");
const brokerRouter = require("./router/brokerRouter");
const adminRouter = require("./router/adminRouter");
const loginRouter = require("./router/loginRouter");

const app = express();
dotenv.config();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(helmet());
// app.use(express.static(path.join(__dirname, "views", "public")));

// Use router
app.use("/buyer", buyerRouter);
app.use("/seller", sellerRouter);
app.use("/broker", brokerRouter);
app.use("/admin", adminRouter);
app.use("/users", loginRouter);

// // Render client
// app.get("*", (req, res) =>
//   res.sendFile(path.join(__dirname, "views", "public", "index.html"))
// );

// app.get("/all", (req, res) => {
//   return res.send("Hello world");
// });

const PORT = process.env.PORT || 3576;

const start = async () => {
  await dbConnection();
  app.listen(PORT, () => {
    console.log(`Server connected on ${PORT}`);
  });
};

start();
