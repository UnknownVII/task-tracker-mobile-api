const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const tokenValue = req.params.token.replace(/\*/g, ".");
  try {
    const decoded = jwt.verify(tokenValue, process.env.TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Access token has expired" });
    }
    res.status(400).json({ error: err.message });
  }
};
