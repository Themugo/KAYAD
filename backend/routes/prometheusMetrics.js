// backend/routes/prometheusMetrics.js
// ─────────────────────────────────────────────────────────────
// Prometheus Metrics Endpoint
// Exports metrics in Prometheus format for scraping
// ─────────────────────────────────────────────────────────────

import express from "express";
import { getAllMetrics } from "../config/metrics.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

/**
 * Convert metrics to Prometheus format
 * Prometheus expects metrics in the format:
 * metric_name{label1="value1",label2="value2"} value timestamp
 */
// Metric keys are `${name}:${JSON.stringify(tags)}` (config/metrics.js). The JSON itself contains ":", so splitting on
// every ":" truncated the tags and JSON.parse threw — the endpoint answered 500 as soon as any tagged metric existed.
const splitKey = (key) => {
  const i = key.indexOf(":");
  if (i < 0) return [key, {}];
  try { return [key.slice(0, i), JSON.parse(key.slice(i + 1)) || {}]; } catch { return [key.slice(0, i), {}]; }
};
const esc = (v) => String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

const convertToPrometheusFormat = (metrics) => {
  let prometheusOutput = "";

  // Process counters
  for (const [key, value] of Object.entries(metrics.counters)) {
    const [name, tags] = splitKey(key);
    const labelString = Object.entries(tags)
      .map(([k, v]) => `${k}="${esc(v)}"`)
      .join(",");
    prometheusOutput += `${name}{${labelString}} ${value}\n`;
  }

  // Process gauges
  for (const [key, value] of Object.entries(metrics.gauges)) {
    const [name, tags] = splitKey(key);
    const labelString = Object.entries(tags)
      .map(([k, v]) => `${k}="${esc(v)}"`)
      .join(",");
    prometheusOutput += `${name}{${labelString}} ${value}\n`;
  }

  // Process histograms. getAllMetrics() returns per-series SUMMARIES ({count,sum,p50,p95,p99,...}) — not raw sample
  // arrays — so they are exported as a Prometheus summary (quantiles + _sum + _count). Spreading the summary object as
  // if it were an array threw and turned the whole endpoint into a 500.
  for (const [key, h] of Object.entries(metrics.histograms)) {
    const [name, tags] = splitKey(key);
    if (!h || !Number(h.count)) continue;
    const labels = Object.entries(tags).map(([k, v]) => `${k}="${esc(v)}"`);
    const withQ = (q) => `{${[...labels, `quantile="${q}"`].join(",")}}`;
    const plain = `{${labels.join(",")}}`;
    prometheusOutput += `${name}${withQ("0.5")} ${h.p50}\n`;
    prometheusOutput += `${name}${withQ("0.95")} ${h.p95}\n`;
    prometheusOutput += `${name}${withQ("0.99")} ${h.p99}\n`;
    prometheusOutput += `${name}_sum${plain} ${h.sum}\n`;
    prometheusOutput += `${name}_count${plain} ${h.count}\n`;
  }

  return prometheusOutput;
};

// Prometheus metrics endpoint (for scraping) — protected by admin auth
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const metrics = getAllMetrics();
    const prometheusOutput = convertToPrometheusFormat(metrics);

    res.set("Content-Type", "text/plain");
    res.send(prometheusOutput);
  } catch (error) {
    res.status(500).send("# Error generating metrics\n");
  }
});

export default router;
