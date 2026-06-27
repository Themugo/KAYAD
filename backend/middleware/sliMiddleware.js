// backend/middleware/sliMiddleware.js
// Captures per-request SLI data (latency, status, route info)

import { recordHistogram, incrementCounter, startTimer, stopTimer } from "../config/metrics.js";

export function sliMiddleware(req, res, next) {
  const timerKey = `http_request_${req.method}_${req.route?.path || req.path}`;
  startTimer("http_request_duration_ms", {
    method: req.method,
    path: req.route?.path || req.path,
  });

  const originalEnd = res.end;
  const originalJson = res.json;

  res.end = function (...args) {
    captureSliData(req, res);
    return originalEnd.apply(this, args);
  };

  res.json = function (body) {
    captureSliData(req, res);
    return originalJson.call(this, body);
  };

  next();
}

function captureSliData(req, res) {
  if (res._sliCaptured) return;
  res._sliCaptured = true;

  const routePath = req.route?.path || req.path;
  const duration = stopTimer("http_request_duration_ms", {
    method: req.method,
    path: routePath,
  });

  recordHistogram("http_request_duration_ms", duration || 0, {
    method: req.method,
    path: routePath,
    status: res.statusCode,
  });

  incrementCounter("http_requests_total", 1, {
    method: req.method,
    path: routePath,
    status: res.statusCode,
  });

  if (res.statusCode >= 500) {
    incrementCounter("http_errors_5xx", 1, {
      method: req.method,
      path: routePath,
    });
  }
}

export default sliMiddleware;
