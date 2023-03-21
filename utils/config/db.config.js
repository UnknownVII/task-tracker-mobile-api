const { connect, connection } = require("mongoose");
const { config } = require("dotenv");

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
        `[\x1b[36mDatabase\x1b[0m] Connection estabislished with MongoDB Successfully`
      );
    })
    .catch((error) => console.error(error.message));

  connection.on("connected", () => {
    console.log(`[\x1b[36mDatabase\x1b[0m] Mongoose connected to DB Cluster [ \x1b[2m${dbName}\x1b[0m ]`);
  });

  connection.on("error", (error) => {
    console.error(`\x1b[41m\x1b[30mError\x1b[0m ] ${error.message}`);
  });

  connection.on("disconnected", () => {
    console.log(`[\x1b[43m\x1b[31mWarning\x1b[0m ] Mongoose Disconnected`);
  });
  process.on("SIGINT", () => {
    connection.close(() => {
      console.log(
        `[\x1b[43m\x1b[31mWarning\x1b[0m ] Mongoose connection closed on Application Timeout`
      );
      process.exit(0);
    });
  });
};
