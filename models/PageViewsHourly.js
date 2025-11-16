const mongoose = require("mongoose");

const PageViewsHourlySchema = new mongoose.Schema({
  page: String,
  pageCategory: String,
  pageViews: Number,
  referrer: String,
  deviceType: String,
  region: String,
  timestamp: Date
}, { collection: "pageviews_hourly" });

module.exports = mongoose.model("PageViewsHourly", PageViewsHourlySchema);