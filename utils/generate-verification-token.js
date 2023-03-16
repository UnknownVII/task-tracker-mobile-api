const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const generateVerificationToken = async () => {
  const token = crypto.randomBytes(50).toString("hex");
  const hashedToken = await bcrypt.hash(token, 10);
  return hashedToken;
};

module.exports.generateVerificationToken = generateVerificationToken;

