const os = require("os");
const net = require("net");
const { config } = require("dotenv");
config();

module.exports = function isRunningLocally() {
  // Get the IP address of the host
  const host = os.hostname();
  // Create a new TCP socket
  const socket = new net.Socket();

  return new Promise((resolve, reject) => {
    // Try to connect to the host on the specified port
    socket.connect(process.env.PORT, host, () => {
      // If the connection is successful, we're running locally
      socket.end();
      resolve(true);
    });

    // If the connection fails, we're not running locally
    socket.on("error", (err) => {
      // If the error is a connection refused error, we're not running locally
      if (err.code === "ECONNREFUSED") {
        resolve(false);
      } else {
        // Otherwise, reject the promise with the error
        console.reject(err);
      }
      socket.destroy();
    });
  });
};
