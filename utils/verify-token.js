const jwt = require("jsonwebtoken");
const User = require("../models/user_model");

module.exports = async function (req, res, next) {
  const token = req.header("auth-token");
  if (!token) return res.status(401).json({ error: "Access Denied" });

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    req.user = decoded;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const userAccessToken = user.tokens.find(
      (token) => token.type === "userAccessToken"
    );
    if (!userAccessToken) {
      return res.status(401).json({ error: "User access token not found" });
    }
    if (userAccessToken.token !== token) {
      return res.status(401).json({ error: "Invalid access token" });
    }
    if (decoded._id !== req.params.id) {
      return res.status(401).json({ error: "Unauthorized access" });
    }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Access token has expired" });
    }
    res.status(400).json({ error: err.message });
  }
};
