const crypto = require("crypto");
const { config } = require("dotenv");

config();
const secret = process.env.API_SECRET;

module.exports = async function validateHMAC(req, res, next) {
  const hmacHeader = req.headers["x-hmac-signature"];
  console.log(hmacHeader);
  if (!hmacHeader) {
    return res
      .status(401)
      .json({ error: "Access denied: HMAC signature is missing" });
  }

  const timestamp = req.headers["x-timestamp"];

  if (!timestamp) {
    return res
      .status(401)
      .json({ error: "Access denied: Timestamp is missing" });
  }

  const data = `${timestamp}/${req.protocol}://${req.get("host")}${
    req.originalUrl
  }`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");
  console.log(data, "++", signature);

  if (hmacHeader !== signature) {
    return res
      .status(401)
      .json({ error: "Access denied: Invalid HMAC signature" });
  }

  next();
};
