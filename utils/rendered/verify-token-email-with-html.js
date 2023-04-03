const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const tokenValue = req.params.token.replace(/\*/g, ".");
  try {
    const decoded = jwt.verify(tokenValue, process.env.TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    
    if (err.name === "TokenExpiredError") {
      return res.render("layouts/main", {
        pageTitle: "Error",
        appTitle: "Task Tracker",
        cardTitle: "Invalid Access",
        cardContent: "Access token has expired",
        contentState: "error",
      });
    }

    return res.render("layouts/main", {
      pageTitle: "Error",
      appTitle: "Task Tracker",
      cardTitle: "Invalid Access",
      cardContent: `Something went wrong`,
      contentState: "error",
    });
  }
};
