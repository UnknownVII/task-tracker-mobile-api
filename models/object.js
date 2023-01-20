const mongoose = require("mongoose");

const ObjectSchema = new mongoose.Schema({
  text: { type: String, required: true, min: 3, max: 255 },
  day: { type: String, required: true, min: 3, max: 255 },
  reminder: { type: Boolean },
});

module.exports = mongoose.model("tasks", ObjectSchema);
