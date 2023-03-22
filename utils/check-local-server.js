const os = require("os");
const net = require("net");
const { config } = require("dotenv");
config();

// Define a global variable to keep track of whether the code is running locally
global.isLocal = false;

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
      global.isLocal = true;
      resolve(true);
    });

    // If the connection fails, we're not running locally
    socket.on("error", () => {
      socket.destroy();
      global.isLocal = false;
      resolve(false);
    });
  });
};
