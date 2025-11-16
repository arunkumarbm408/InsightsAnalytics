const express = require("express");
const router = express.Router();
const Pageviews = require("../models/PageViewsHourly");
const UserActions = require("../models/UserActionsHourly");
const Performance = require("../models/PerformanceHourly");

router.post("/insert", async (req, res) => {
      /*
        #swagger.summary = 'Insert analytics data'
        #swagger.description = 'Insert hourly analytics data (pageviews, user actions, or performance)'
        #swagger.parameters['body'] = {
            in: 'body',
            required: true,
            schema: {
                type: "useraction",
                data: {
                    timestamp: "2025-11-15T10:00:00Z",
                    page: "/coorg-adventure-trek",
                    deviceType: "mobile",
                    region: "South India",
                    bookingCompleted: 1,
                    checkoutStart: 10
                }
            }
        }
        #swagger.responses[200] = {
            description: "Data inserted successfully"
        }
    */
  try {
    const { type, data } = req.body;
    if (!type || !data) return res.status(400).json({ message: "type and data required" });

    let saved;
    if (type === "pageview") saved = await Pageviews.create(data);
    else if (type === "useraction") saved = await UserActions.create(data);
    else if (type === "performance") saved = await Performance.create(data);
    else return res.status(400).json({ message: "Invalid type" });

    return res.json({ message: "Inserted successfully", record: saved });
  } catch (err) {
    console.error("Insert error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;