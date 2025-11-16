const express = require("express");
const router = express.Router();
const cache = require("../cache/memoryCache");
const { detectAnomalies } = require("../service/anomalyDetector");
const { buildInsightObject } = require("../service/insightGenerator");
const InsightModel = require("../models/Insight");

const CACHE_TTL = process.env.INSIGHTS_CACHE_TTL_SECONDS ? Number(process.env.INSIGHTS_CACHE_TTL_SECONDS) : 600;

router.get("/business", async (req, res) => {
  try {
    const cached = cache.get("business_insights_top5");
    if (cached) {
      return res.json({ source: "cache", generatedAt: new Date().toISOString(), insights: cached });
    }

    const anomalies = await detectAnomalies();
    const insights = anomalies.map(a => buildInsightObject(a));
    const sorted = insights.sort((a,b) => (b.impactScore||0) - (a.impactScore||0)).slice(0,5);

    // persist top insights (optional)
    try {
      if (sorted && sorted.length) {
        await InsightModel.insertMany(sorted.map(s => ({ ...s, createdAt: new Date() })));
      }
    } catch (e) {
      console.warn("Failed to persist insights:", e.message);
    }

    cache.set("business_insights_top5", sorted, CACHE_TTL);
    return res.json({ source: "computed", generatedAt: new Date().toISOString(), insights: sorted });
  } catch (err) {
    console.error("GET /api/insights/business error:", err);
    return res.status(500).json({ error: "Failed to compute insights" });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const anomalies = await detectAnomalies();
    const insights = anomalies.map(a => buildInsightObject(a));
    const sorted = insights.sort((a,b) => (b.impactScore||0) - (a.impactScore||0));

    cache.set("business_insights_top5", sorted.slice(0,5), CACHE_TTL);
    cache.set("business_insights_all", sorted, CACHE_TTL);

    // persist
    try {
      if (sorted && sorted.length) {
        await InsightModel.insertMany(sorted.map(s => ({ ...s, createdAt: new Date() })));
      }
    } catch (e) {
      console.warn("Failed to persist insights:", e.message);
    }

    return res.json({ message: "Insights generated & cached", count: sorted.length, insights: sorted.slice(0,5) });
  } catch (err) {
    console.error("POST /api/insights/generate error:", err);
    return res.status(500).json({ error: "Failed to generate insights" });
  }
});

module.exports = router;