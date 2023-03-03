const mongoose = require("mongoose");

const ObjectSchema = new mongoose.Schema({
  title: { type: String, required: true, min: 3, max: 20 },
  description: { type: String, required: true, min: 3, max: 250 },
  due_date: { type: Date, required: true },
  start_time: { type: String, default: "", required: false },
  end_time: { type: String, default: "", required: false },
  prioritize: { type: Boolean, default: false, required: false },
  status: {
    type: String,
    enum: ["Complete", "Incomplete"],
    default: "Incomplete",
    required: false,
  },
  date_time_finished: { type: Date, default: "", required: false },
  date_created: { type: Date, default: Date.now, required: true },
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    min: 6,
    max: 255,
  },
  email: {
    type: String,
    required: true,
    min: 6,
    max: 255,
  },
  password: {
    type: String,
    required: true,
    min: 6,
    max: 1024,
  },
  tasks: [ObjectSchema],
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("users", userSchema);
