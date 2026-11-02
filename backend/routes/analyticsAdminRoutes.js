// Super Admin traffic analytics: aggregate-only reports. No row-level browsing history, no identifiers, no IPs are ever returned.
import express from "express";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/role.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { buildReport, liveActivity, exportCsv, EXPORT_KINDS, RANGES, METRIC_DEFINITIONS } from "../services/analyticsReport.service.js";
import { getAnalyticsSettings, purgeExpired } from "../services/analytics.service.js";
import { findAll, count } from "../db/index.js";
import { logActionFromReq } from "../utils/securityLogger.js";

const router = express.Router();
router.use(protect, authorize("admin", "superadmin"));

const newAccounts = async (from, to) => count("users", { createdAt: { $gte: from.toISOString(), $lt: to.toISOString() } });

async function withListingTitles(report) {
  if (!report.topListings?.length) return report;
  try {
    const ids = report.topListings.map((l) => l.listingId);
    const cars = await findAll("cars", { filters: { id: { $in: ids } }, select: "id, make, model, year, title" });
    const byId = new Map((cars || []).map((c) => [String(c.id), c]));
    report.topListings = report.topListings.map((l) => { const c = byId.get(String(l.listingId)); return { ...l, title: c ? (c.title || [c.year, c.make, c.model].filter(Boolean).join(" ")) || null : null }; });
  } catch { /* titles are a convenience; ids still shown */ }
  return report;
}

const params = (q) => ({ range: q.range || "7d", from: q.from, to: q.to });
const bad = (res, r) => res.status(400).json({ success: false, code: r.code, message: r.message });

router.get("/summary", asyncHandler(async (req, res) => {
  const r = await buildReport(params(req.query), { newAccountsCounter: newAccounts });
  if (!r.ok) return bad(res, r);
  res.set("Cache-Control", "no-store");
  res.json({ success: true, ranges: RANGES, settings: await getAnalyticsSettings(), ...(await withListingTitles(r)) });
}));

router.get("/live", asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ success: true, ...(await liveActivity()) });
}));

router.get("/definitions", (req, res) => res.json({ success: true, definitions: METRIC_DEFINITIONS }));

router.get("/export", asyncHandler(async (req, res) => {
  const kind = String(req.query.kind || "summary");
  if (!EXPORT_KINDS.includes(kind)) return res.status(400).json({ success: false, code: "ANALYTICS_EXPORT_KIND_INVALID", message: `kind must be one of: ${EXPORT_KINDS.join(", ")}` });
  const r = await buildReport(params(req.query), { newAccountsCounter: newAccounts });
  if (!r.ok) return bad(res, r);
  await logActionFromReq(req, "analytics_report_exported", { target: kind, targetModel: "Analytics", details: { kind, range: r.range.key, from: r.range.from, to: r.range.to } });
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="kayad-traffic-${kind}-${r.range.from.slice(0, 10)}_${r.range.to.slice(0, 10)}.csv"`);
  res.set("Cache-Control", "no-store");
  res.send(exportCsv(r, kind));
}));

// Retention: superadmin only; deletes data older than the configured window and records the action.
router.post("/purge", authorize("superadmin"), asyncHandler(async (req, res) => {
  const out = await purgeExpired();
  await logActionFromReq(req, "analytics_retention_purge", { target: "analytics", targetModel: "Analytics", details: out });
  res.json({ success: true, ...out });
}));

export default router;
