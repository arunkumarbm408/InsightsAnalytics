# Insight Engine

This project implements a Business Insight Engine for travel/experience analytics.
It detects anomalies from hourly aggregated collections in MongoDB and generates business-friendly insights.

## Structure
- `index.js` - server entry
- `config/db.js` - MongoDB connection
- `models/` - Mongoose models for hourly collections and insights
- `cache/memoryCache.js` - simple in-memory TTL cache
- `service/` - data fetching, anomaly detection, insight generation
- `routes/` - Express routes: analytics insert + insights endpoints

## Install
```bash
npm install
```

## Environment
Create a `.env` or set `MONGODB_URI` env var. Example:
```
MONGODB_URI=mongodb://127.0.0.1:27017/insightsdb
PORT=5000
```

## Run
```bash
npm start
```

## Endpoints
- `POST /api/analytics/insert` — insert hourly data. Body JSON:
  ```
  { "type": "pageview"|"useraction"|"performance", "data": { ... } }
  ```
- `POST /api/insights/generate` — force generate insights and cache
- `GET /api/insights/business` — get cached/top 5 insights (computed if cache miss)

## Notes & Assumptions
- Collections: `pageviews_hourly`, `useractions_hourly`, `performance_hourly`.
- Timestamps must be Date and in UTC.
- Field names expected by models are described in models/*.js.
- Thresholds and heuristics are implemented in `service/*` and can be tuned.