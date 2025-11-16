const DEFAULT_REVENUE_PER_CONV = process.env.REV_PER_CONV ? Number(process.env.REV_PER_CONV) : 100;

function estimateImpact(anom) {
  let impact = 0;
  if (anom.metric === "PageViews") {
    const baselineConv = anom.baselineBookings6h || 0;
    const recentConv = anom.recentBookings || 0;
    const lostConversions = Math.max(0, baselineConv - recentConv);
    impact += lostConversions * DEFAULT_REVENUE_PER_CONV * 2;
    const viewDelta = Math.max(0, anom.recent - (anom.baselineMean6h || 0));
    impact += Math.min(viewDelta, 10000) * 0.01;
  } else if (anom.metric === "LoadTime") {
    const baseline = anom.baselineMean || 0;
    const recent = anom.recentLoad || anom.recentLoadTime || 0;
    const extraSec = Math.max(0, recent - baseline);
    const estConvSensitive = 5;
    impact += extraSec * 0.02 * estConvSensitive * DEFAULT_REVENUE_PER_CONV * 10;
  }

  const score = Math.min(Math.round(100 * Math.tanh(impact / 5000)), 100);
  return { impact, impactScore: score };
}

function generateNaturalText(anom) {
  const key = anom.key || {};
  const page = key.page || "unknown page";
  const device = key.deviceType || "all devices";
  const region = key.region || "all regions";
  const referrer = key.referrer || "unknown referrer";

  if (anom.metric === "PageViews") {
    const change = anom.pctChange ? (anom.pctChange > 0 ? `+${anom.pctChange.toFixed(1)}%` : `${anom.pctChange.toFixed(1)}%`) : "N/A";
    const bs = `Page views for ${page} (${device}, ${region}) changed ${change} vs baseline. Top referrer: ${referrer}.`;
    let insight = "";
    let action = "";
    if (referrer && /instagram|facebook|tiktok|social|twitter/i.test(referrer)) {
      insight = "Organic/social traffic spike likely driven by a social post or campaign.";
      action = `Confirm campaign or influencer activity on ${referrer}; consider increasing ad spend for ${region} or ensure landing pages are healthy.`;
    } else if (anom.recentBookings < anom.baselineBookings6h) {
      insight = "Traffic increase but conversions fell — possible funnel or checkout issue.";
      action = "Check payment gateway logs, checkout changes, or form validation errors; run A/B test rollback if needed.";
    } else {
      insight = "Traffic change observed; conversions roughly stable.";
      action = "Monitor conversions; if sustained, allocate more marketing budget or prepare operations for increased demand.";
    }
    return { businessInsight: insight, suggestedAction: action, change };
  }

  if (anom.metric === "LoadTime") {
    const pct = anom.pctChange ? anom.pctChange.toFixed(1) : "N/A";
    const insight = `Load time for ${page} on ${device} increased by ${pct}% vs baseline.`;
    const action = "Run Lighthouse for the page, audit images & third-party scripts, verify CDN and backend health. Prioritize mobile optimizations.";
    return { businessInsight: insight, suggestedAction: action, change: `${pct}%` };
  }

  return { businessInsight: "Anomaly detected", suggestedAction: "Investigate further", change: "N/A" };
}

function buildInsightObject(anom) {
  const { impact, impactScore } = estimateImpact(anom);
  const nat = generateNaturalText(anom);

  const key = anom.key || {};
  return {
    type: anom.metric === "PageViews" ? "Traffic Anomaly" : anom.metric === "LoadTime" ? "Performance Regression" : "Anomaly",
    metric: anom.metric,
    page: key.page || null,
    pageCategory: key.pageCategory || null,
    deviceType: key.deviceType || null,
    referrer: key.referrer || null,
    region: key.region || null,
    change: nat.change,
    businessInsight: nat.businessInsight,
    suggestedAction: nat.suggestedAction,
    impactScore,
    details: anom
  };
}

module.exports = { buildInsightObject };