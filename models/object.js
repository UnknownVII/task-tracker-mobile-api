const mongoose = require("mongoose");

const ObjectSchema = new mongoose.Schema({
  color: { type: String, required: true, min: 3, max: 255 },
  first_name: { type: String, required: true, min: 3, max: 255 },
  last_name: { type: String, required: true, min: 3, max: 255 },
  age: { type: String, required: true, min: 1, max: 3 },
  course: { type: String, required: true, min: 3, max: 255 },
  year_level: { type: String, required: true, min: 3, max: 255 },
  subjects: { type: [String], required: true, min: 8, max: 13 },
});

module.exports = mongoose.model("students", ObjectSchema);
