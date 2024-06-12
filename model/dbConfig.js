const { connect } = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const DB = process.env.LOCAL_URL;

const dbConnection = async () => {
  try {
    await connect(DB).then(() => {
      console.log("Database connected");
    });
  } catch (error) {
    console.error(error);
  }
};

module.exports = dbConnection;
