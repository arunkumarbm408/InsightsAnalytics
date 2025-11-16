const mongoose = require("mongoose");

const PerformanceHourlySchema = new mongoose.Schema({
  page: String,
  deviceType: String,
  region: String,
  loadTime: Number,
  ttfb: Number,
  jsErrors: Number,
  crashCount: Number,
  timestamp: Date
}, { collection: "performance_hourly" });

module.exports = mongoose.model("PerformanceHourly", PerformanceHourlySchema);