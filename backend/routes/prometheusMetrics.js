// backend/routes/prometheusMetrics.js
// ─────────────────────────────────────────────────────────────
// Prometheus Metrics Endpoint
// Exports metrics in Prometheus format for scraping
// ─────────────────────────────────────────────────────────────

import express from "express";
import { getAllMetrics } from "../config/metrics.js";

const router = express.Router();

/**
 * Convert metrics to Prometheus format
 * Prometheus expects metrics in the format:
 * metric_name{label1="value1",label2="value2"} value timestamp
 */
const convertToPrometheusFormat = (metrics) => {
  let prometheusOutput = "";

  // Process counters
  for (const [key, value] of Object.entries(metrics.counters)) {
    const [name, tagsStr] = key.split(":");
    const tags = tagsStr ? JSON.parse(tagsStr) : {};
    const labelString = Object.entries(tags)
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");
    prometheusOutput += `${name}{${labelString}} ${value}\n`;
  }

  // Process gauges
  for (const [key, value] of Object.entries(metrics.gauges)) {
    const [name, tagsStr] = key.split(":");
    const tags = tagsStr ? JSON.parse(tagsStr) : {};
    const labelString = Object.entries(tags)
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");
    prometheusOutput += `${name}{${labelString}} ${value}\n`;
  }

  // Process histograms
  for (const [key, histogram] of Object.entries(metrics.histograms)) {
    const [name, tagsStr] = key.split(":");
    const tags = tagsStr ? JSON.parse(tagsStr) : {};
    const labelString = Object.entries(tags)
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");

    const sortedValues = [...histogram].sort((a, b) => a - b);
    const count = sortedValues.length;
    const sum = sortedValues.reduce((a, b) => a + b, 0);

    if (count === 0) continue;

    // Add count metric
    prometheusOutput += `${name}_count{${labelString}} ${count}\n`;
    // Add sum metric
    prometheusOutput += `${name}_sum{${labelString}} ${sum}\n`;

    // Add bucket metrics (standard Prometheus histogram buckets)
    const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
    for (const bucket of buckets) {
      const bucketCount = sortedValues.filter((v) => v <= bucket * 1000).length; // Convert to ms
      prometheusOutput += `${name}_bucket{${labelString},le="${bucket}"} ${bucketCount}\n`;
    }
    // Add +Inf bucket
    prometheusOutput += `${name}_bucket{${labelString},le="+Inf"} ${count}\n`;
  }

  return prometheusOutput;
};

// Prometheus metrics endpoint (for scraping)
router.get("/", async (req, res) => {
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
