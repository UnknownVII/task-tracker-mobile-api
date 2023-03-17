module.exports = function setProtocol(req, res, next) {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  req.protocol = protocol;
  res.locals.protocol = protocol;
  next();
};
