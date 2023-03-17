const RateLimiter = require("../models/rate_limit");

const WINDOW_SIZE = 60000; // 1 minute
const MAX_REQUESTS = 120;

const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const timestamp = Date.now();

  RateLimiter.findOne({ ip }, (err, doc) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }

    const now = new Date();

    if (!doc) {
      const newDoc = new RateLimiter({
        ip,
        requests: 1,
        windowStart: now,
        windowEnd: new Date(now.getTime() + WINDOW_SIZE),
        url,
        timestamp,
      });
      newDoc.save((err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Internal server error" });
        }
        return next();
      });
    } else {
      if (now.getTime() > doc.windowEnd.getTime()) {
        doc.requests = 1;
        doc.windowStart = now;
        doc.windowEnd = new Date(now.getTime() + WINDOW_SIZE);
      } else {
        if (doc.requests >= MAX_REQUESTS) {
          return res.status(429).send("Too Many Requests");
        }

        // Check if the current request is similar to the previous request
        if (doc.url === url && now.getTime() - doc.timestamp.getTime() < 1000) {
          return res.status(400).send("Bad Request");
        }

        doc.requests += 1;
      }

      doc.url = url;
      doc.timestamp = timestamp;

      doc.save((err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Internal server error" });
        }
        return next();
      });
    }
  });
};

module.exports = { rateLimiter };
