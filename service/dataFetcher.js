const PageViews = require("../models/PageViewsHourly");
const UserActions = require("../models/UserActionsHourly");
const Performance = require("../models/PerformanceHourly");

async function fetchAggregatedData() {
  const now = new Date();
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentPageViews = await PageViews.find({ timestamp: { $gte: sixHoursAgo } }).lean();
  const recentActions = await UserActions.find({ timestamp: { $gte: sixHoursAgo } }).lean();
  const recentPerf = await Performance.find({ timestamp: { $gte: sixHoursAgo } }).lean();

  const baselinePageViews = await PageViews.find({ timestamp: { $gte: twentyFourHoursAgo, $lt: sixHoursAgo } }).lean();
  const baselineActions = await UserActions.find({ timestamp: { $gte: twentyFourHoursAgo, $lt: sixHoursAgo } }).lean();
  const baselinePerf = await Performance.find({ timestamp: { $gte: twentyFourHoursAgo, $lt: sixHoursAgo } }).lean();

  return {
    recent: { pageViews: recentPageViews, actions: recentActions, perf: recentPerf },
    baseline: { pageViews: baselinePageViews, actions: baselineActions, perf: baselinePerf }
  };
}

module.exports = { fetchAggregatedData };