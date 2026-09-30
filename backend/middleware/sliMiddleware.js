// Observe response lifecycle without replacing Express response methods.
import { recordHistogram, incrementCounter } from "../config/metrics.js";

export function sliMiddleware(req, res, next) {
  const started = process.hrtime.bigint();
  let recorded = false;
  const capture = (closedEarly = false) => {
    if (recorded) return;
    recorded = true;
    const routePath = req.route?.path || req.path;
    const tags = { method: req.method, path: routePath, status: res.statusCode };
    const duration = Number(process.hrtime.bigint() - started) / 1e6;
    recordHistogram("http_request_duration_ms", duration, tags);
    incrementCounter("http_requests_total", 1, tags);
    if (res.statusCode >= 500) incrementCounter("http_errors_5xx", 1, { method: req.method, path: routePath });
    if (closedEarly) incrementCounter("http_requests_aborted_total", 1, { method: req.method, path: routePath });
  };
  res.once("finish", () => capture());
  res.once("close", () => capture(!res.writableFinished));
  next();
}

export default sliMiddleware;
