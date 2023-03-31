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
      "passwordResetToken",
      "passwordResetDigit",
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
        return moment().add(15, "minutes").toDate();
      } else if (this.type === "passwordResetToken") {
        return moment().add(10, "minutes").toDate();
      } else {
        return moment().add(10, "minutes").toDate();
      }
    },
  },
  used: {
    type: Boolean,
    default: false,
  },
  usedDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

const verificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["emailVerification", "smsVerification"],
    required: true,
  },
  verificationSentDate: {
    type: Date,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  verifiedDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

const locationSchema = new mongoose.Schema({
  ip: { type: String, required: true },
  countryCode: { type: String, required: true },
  countryName: { type: String, required: true },
  cityName: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  zipCode: { type: String, required: true },
  isProxy: { type: Boolean, required: true },
  date: {
    type: Date,
    default: Date.now,
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
  verifications: [verificationSchema],
  lastLoginIPGeoLocations: [locationSchema],
  isLocked: {
    type: Boolean,
    default: false,
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lastLogin: {
    type: Date,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("users", userSchema);
