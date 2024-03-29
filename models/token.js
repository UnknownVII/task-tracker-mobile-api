const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
  access_token: { type: String },
  expires_in: { type: Date },
  updated_at: { type: Date },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("tokens", tokenSchema);
