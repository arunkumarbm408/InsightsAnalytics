const mongoose = require("mongoose");

const UserActionsHourlySchema = new mongoose.Schema({
  page: String,
  deviceType: String,
  region: String,
  addToCart: { type: Number, default: 0 },
  checkoutStart: { type: Number, default: 0 },
  bookingCompleted: { type: Number, default: 0 },
  actions: { type: Object, default: {} },
  timestamp: Date
}, { collection: "useractions_hourly" });

module.exports = mongoose.model("UserActionsHourly", UserActionsHourlySchema);