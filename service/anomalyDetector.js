const PageViews = require("../models/PageViewsHourly");
const UserActions = require("../models/UserActionsHourly");
const Performance = require("../models/PerformanceHourly");

function safeStats(recentSum, baselineAvg, baselineStd) {
  const diff = recentSum - baselineAvg;
  const z = baselineStd && baselineStd > 0 ? diff / baselineStd : (baselineAvg !== 0 ? (diff / baselineAvg) : 0);
  const pct = baselineAvg !== 0 ? (diff / baselineAvg) * 100 : (recentSum === 0 ? 0 : 100);
  return { z, pct };
}

function statsFromArray(arr) {
  if (!arr || arr.length === 0) return { mean: 0, std: 0, count: 0 };
  const n = arr.length;
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const variance = arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  return { mean, std, count: n };
}

async function detectAnomalies() {
  const now = new Date();
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentPVs = await PageViews.aggregate([
    { $match: { timestamp: { $gte: sixHoursAgo } } },
    {
      $group: {
        _id: {
          page: "$page",
          pageCategory: "$pageCategory",
          deviceType: "$deviceType",
          referrer: "$referrer",
          region: "$region"
        },
        recentViews: { $sum: "$pageViews" }
      }
    }
  ]).allowDiskUse(true);

  const baselineHours = await PageViews.aggregate([
    { $match: { timestamp: { $gte: twentyFourHoursAgo, $lt: sixHoursAgo } } },
    {
      $group: {
        _id: {
          page: "$page",
          pageCategory: "$pageCategory",
          deviceType: "$deviceType",
          referrer: "$referrer",
          region: "$region",
          hour: { $hour: "$timestamp" },
          day: { $dayOfYear: "$timestamp" }
        },
        hourViews: { $sum: "$pageViews" }
      }
    }
  ]).allowDiskUse(true);

  const baselineMap = new Map();
  baselineHours.forEach(b => {
    const key = JSON.stringify({
      page: b._id.page,
      pageCategory: b._id.pageCategory,
      deviceType: b._id.deviceType,
      referrer: b._id.referrer,
      region: b._id.region
    });
    if (!baselineMap.has(key)) baselineMap.set(key, []);
    baselineMap.get(key).push(b.hourViews);
  });

  const recentConv = await UserActions.aggregate([
    { $match: { timestamp: { $gte: sixHoursAgo } } },
    {
      $group: {
        _id: { page: "$page", deviceType: "$deviceType", region: "$region" },
        recentBookings: { $sum: { $ifNull: ["$bookingCompleted", { $ifNull: ["$actions.bookingCompleted", 0] }] } },
        recentCheckoutStart: { $sum: { $ifNull: ["$checkoutStart", { $ifNull: ["$actions.checkoutStart", 0] }] } }
      }
    }
  ]).allowDiskUse(true);

  const baselineConv = await UserActions.aggregate([
    { $match: { timestamp: { $gte: twentyFourHoursAgo, $lt: sixHoursAgo } } },
    {
      $group: {
        _id: { page: "$page", deviceType: "$deviceType", region: "$region", hour: { $hour: "$timestamp" }, day: { $dayOfYear: "$timestamp" } },
        hourBookings: { $sum: { $ifNull: ["$bookingCompleted", { $ifNull: ["$actions.bookingCompleted", 0] }] } },
        hourCheckoutStart: { $sum: { $ifNull: ["$checkoutStart", { $ifNull: ["$actions.checkoutStart", 0] }] } }
      }
    }
  ]).allowDiskUse(true);

  const baselineConvMap = new Map();
  baselineConv.forEach(b => {
    const key = JSON.stringify({ page: b._id.page, deviceType: b._id.deviceType, region: b._id.region });
    if (!baselineConvMap.has(key)) baselineConvMap.set(key, []);
    baselineConvMap.get(key).push(b.hourBookings);
  });

  const recentPerf = await Performance.aggregate([
    { $match: { timestamp: { $gte: sixHoursAgo } } },
    {
      $group: {
        _id: { page: "$page", deviceType: "$deviceType", region: "$region" },
        avgLoadTime: { $avg: "$loadTime" },
        avgTtfb: { $avg: "$ttfb" },
        jsErrors: { $sum: { $ifNull: ["$jsErrors", 0] } }
      }
    }
  ]).allowDiskUse(true);

  const baselinePerf = await Performance.aggregate([
    { $match: { timestamp: { $gte: twentyFourHoursAgo, $lt: sixHoursAgo } } },
    {
      $group: {
        _id: { page: "$page", deviceType: "$deviceType", region: "$region", hour: { $hour: "$timestamp" }, day: { $dayOfYear: "$timestamp" } },
        hourLoadTime: { $avg: "$loadTime" }
      }
    }
  ]).allowDiskUse(true);

  const baselinePerfMap = new Map();
  baselinePerf.forEach(b => {
    const key = JSON.stringify({ page: b._id.page, deviceType: b._id.deviceType, region: b._id.region });
    if (!baselinePerfMap.has(key)) baselinePerfMap.set(key, []);
    baselinePerfMap.get(key).push(b.hourLoadTime);
  });

  const anomalies = [];

  for (const r of recentPVs) {
    const keyObj = {
      page: r._id.page,
      pageCategory: r._id.pageCategory,
      deviceType: r._id.deviceType,
      referrer: r._id.referrer,
      region: r._id.region
    };
    const key = JSON.stringify(keyObj);

    const baselineArr = baselineMap.get(key) || [];
    const { mean: baselineMeanPerHour, std: baselineStdPerHour, count } = statsFromArray(baselineArr);

    const baselineMean6h = baselineMeanPerHour * 6;
    const baselineStd6h = Math.sqrt(6) * baselineStdPerHour;

    const recentSum = r.recentViews;

    const { z, pct } = safeStats(recentSum, baselineMean6h, baselineStd6h);

    if (baselineMean6h < 10 && recentSum < 10) continue;

    const anomalyObj = {
      key: keyObj,
      metric: "PageViews",
      recent: recentSum,
      baselineMean6h,
      baselineStd6h,
      zScore: z,
      pctChange: pct,
      baselineCountHours: count
    };

    const convKey = JSON.stringify({ page: r._id.page, deviceType: r._id.deviceType, region: r._id.region });
    const recentConvEntry = recentConv.find(e => e._id && e._id.page === r._id.page && e._id.deviceType === r._id.deviceType && e._id.region === r._id.region);
    const recentBookings = recentConvEntry ? (recentConvEntry.recentBookings || 0) : 0;

    const baselineBookingArr = baselineConvMap.get(convKey) || [];
    const baselineBookingMeanPerHour = baselineBookingArr.length ? (baselineBookingArr.reduce((s, v) => s + v, 0) / baselineBookingArr.length) : 0;
    const baselineBookings6h = baselineBookingMeanPerHour * 6;

    anomalyObj.recentBookings = recentBookings;
    anomalyObj.baselineBookings6h = baselineBookings6h;

    const perfKey = JSON.stringify({ page: r._id.page, deviceType: r._id.deviceType, region: r._id.region });
    const perfRecent = recentPerf.find(p => p._id && p._id.page === r._id.page && p._id.deviceType === r._id.deviceType && p._id.region === r._id.region);
    const recentLoadTime = perfRecent ? perfRecent.avgLoadTime : null;
    const baselineLoadArr = baselinePerfMap.get(perfKey) || [];
    const baselineLoadStats = statsFromArray(baselineLoadArr);
    anomalyObj.recentLoadTime = recentLoadTime;
    anomalyObj.baselineLoadMean = baselineLoadStats.mean;

    if (Math.abs(z) > 2.5 || Math.abs(pct) > 50) {
      anomalies.push(anomalyObj);
    }
  }

  for (const p of recentPerf) {
    const keyObj = { page: p._id.page, deviceType: p._id.deviceType, region: p._id.region };
    const key = JSON.stringify(keyObj);
    const baselineArr = baselinePerfMap.get(key) || [];
    const { mean, std } = statsFromArray(baselineArr);
    const recentLoad = p.avgLoadTime || 0;
    const baselineMean6h = mean;
    const baselineStd6h = std;
    const { z, pct } = safeStats(recentLoad, baselineMean6h, baselineStd6h);
    if ((baselineMean6h > 0 && (Math.abs(z) > 2.5 || Math.abs(pct) > 50)) || (baselineMean6h === 0 && recentLoad > 2)) {
      anomalies.push({
        key: keyObj,
        metric: "LoadTime",
        recentLoad,
        baselineMean: baselineMean6h,
        zScore: z,
        pctChange: pct
      });
    }
  }

  return anomalies;
}

module.exports = { detectAnomalies };