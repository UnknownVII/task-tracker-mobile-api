const mongoose = require("mongoose");

const ObjectSchema = new mongoose.Schema({
  title: { type: String, required: true, min: 3, max: 20 },
  description: { type: String, required: true, min: 3, max: 250 },
  due_date: { type: Date, required: true },
  start_time: { type: String, default: "", required: false },
  end_time: { type: String, default: "", required: false },
  prioritize: { type: Boolean, default: false, required: false },
  completed: { type: Boolean, default: false, required: false },
  date_finished: { type: Date, default: "", required: false },
  time_finished: { type: Date, default: "", required: false },
  date_created: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model("tasks", ObjectSchema);
