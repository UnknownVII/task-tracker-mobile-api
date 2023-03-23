const mongoose = require("mongoose");
const moment = require("moment");
const { number } = require("@hapi/joi");

const taskSchema = new mongoose.Schema({
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

const tokenSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "emailVerification",
      "passwordReset",
      "userAccessToken",
      "smsVerification",
    ],
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function () {
      if (this.type === "userAccessToken") {
        return moment().add(7, "days").toDate();
      } else if (this.type === "emailVerification") {
        return moment().add(1, "hour").toDate();
      } else if (this.type === "smsVerification") {
        return moment().add(5, "minutes").toDate();
      } else {
        return moment().add(5, "minutes").toDate();
      }
    },
  },
  used: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
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
  phoneNumber: {
    type: Number,
    required: true,
  },
  password: {
    type: String,
    required: true,
    min: 6,
    max: 1024,
  },
  tasks: [taskSchema],
  tokens: [tokenSchema],
  emailVerified: {
    type: Boolean,
    default: false,
  },
  smsVerified: {
    type: Boolean,
    default: false,
  },
  verificationEmailSentDate: {
    type: Date,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("users", userSchema);
