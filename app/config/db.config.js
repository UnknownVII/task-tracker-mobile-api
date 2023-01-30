const { connect, connection } = require("mongoose");
const { config } = require("dotenv");
const jwt = require('jsonwebtoken');

module.exports = () => {
  config();
  const uri = process.env.DB_URI || "";
  const dbName = process.env.DB_NAME || "";
  connect(uri, {
    dbName,
    user: process.env.DB_USER || "",
    pass: process.env.DB_PASSWORD || "",
    
  })
    .then(() => {
      console.log(
        "[Finished] Connection estabislished with MongoDB Successfully"
      );
      //CREATE AND ASSIGN TOKEN
      // const token = jwt.sign( "tempID" ,
      //   process.env.TOKEN_SECRET
      // );
      // console.log(
      //   "[Token   ]", token
      // );
    })
    .catch((error) => console.error(error.message));

  connection.on("connected", () => {
    console.log("[Database] Mongoose connected to DB Cluster [", dbName, "]");
  });

  connection.on("error", (error) => {
    console.error(error.message);
  });

  connection.on("disconnected", () => {
    console.log("[Warning ] Mongoose Disconnected");
  });
  process.on("SIGINT", () => {
    connection.close(() => {
      console.log(
        "[Warning ] Mongoose connection closed on Application Timeout"
      );
      process.exit(0);
    });
  });
};
