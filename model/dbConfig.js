const { connect } = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const DB = process.env.LOCAL_URL;

const CLOUD_DB = process.env.MONGODB_URL;

const dbConnection = async () => {
  try {
    await connect(CLOUD_DB).then(() => {
      console.log("Database connected");
    });
  } catch (error) {
    console.error(error);
  }
};

module.exports = dbConnection;
