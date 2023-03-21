const os = require("os");
const net = require("net");

module.exports = function isRunningLocally(port) {
  // Get the IP address of the host
  const host = os.hostname();
  // Create a new TCP socket
  const socket = new net.Socket();

  return new Promise((resolve, reject) => {
    // Try to connect to the host on the specified port
    socket.connect(port, host, () => {
      // If the connection is successful, we're running locally
      socket.end();
      resolve(true);
    });

    // If the connection fails, we're not running locally
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
};
