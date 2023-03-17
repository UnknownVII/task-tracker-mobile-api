const mongoose = require("mongoose");

const rateLimiterSchema = new mongoose.Schema({
  ip: String,
  requests: {
    type: Number,
    default: 0,
  },
  windowStart: Date,
  windowEnd: Date,
  url: String,
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model("rate_limiter_ips", rateLimiterSchema);
