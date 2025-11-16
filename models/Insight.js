const mongoose = require("mongoose");

const InsightSchema = new mongoose.Schema({
  type: String,
  metric: String,
  page: String,
  pageCategory: String,
  deviceType: String,
  referrer: String,
  region: String,
  change: String,
  businessInsight: String,
  suggestedAction: String,
  impactScore: Number,
  details: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
}, { collection: "business_insights" });

module.exports = mongoose.model("BusinessInsight", InsightSchema);