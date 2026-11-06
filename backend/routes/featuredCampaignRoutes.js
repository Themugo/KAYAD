// Homepage featured-vehicle campaigns.
//  - default export: ADMIN API (administrators only; every change audited; destructive actions need confirm:true)
//  - publicRouter:   GET /current -> vehicle ids to feature right now (no login; never errors the homepage)
import express from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/role.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import * as svc from "../services/featuredCampaigns.service.js";

export const isStoreMissing = (e) => /featured_vehicle_campaign|42P01|PGRST205|schema cache|does not exist/i.test(`${e?.cause || ""} ${e?.message || ""}`);

const router = express.Router();
router.use(protect, authorize("admin", "superadmin"));

const handle = (fn) => asyncHandler(async (req, res) => {
  try { await fn(req, res); }
  catch (e) {
    if (e?.status && e.status < 500) return res.status(e.status).json({ success: false, code: e.code, message: e.message });
    if (isStoreMissing(e)) return res.status(503).json({ success: false, code: "FEATURED_CAMPAIGNS_NOT_SET_UP", message: "Featured campaigns are not set up yet. Ask the platform owner to run the featured-campaigns migration." });
    throw e;
  }
});
const uid = (req) => req.user.id;
const needConfirm = (req, res) => {
  if (req.body?.confirm !== true) { res.status(400).json({ success: false, code: "CONFIRMATION_REQUIRED", message: "This action needs explicit confirmation (confirm: true)." }); return false; }
  return true;
};

router.get("/", handle(async (req, res) => { res.set("Cache-Control", "no-store"); res.json({ success: true, ...(await svc.listCampaigns()) }); }));
router.get("/history", handle(async (req, res) => { res.set("Cache-Control", "no-store"); res.json({ success: true, history: await svc.listHistory(req.query.limit) }); }));
router.get("/vehicles", handle(async (req, res) => { res.set("Cache-Control", "no-store"); res.json({ success: true, vehicles: await svc.searchVehicles(req.query.q, { limit: req.query.limit }) }); }));

const body = z.object({ carId: z.string(), startsAt: z.string(), endsAt: z.string(), displayOrder: z.union([z.number(), z.string()]).optional() }).strict();
router.post("/", handle(async (req, res) => {
  const p = body.safeParse(req.body); if (!p.success) return res.status(400).json({ success: false, code: "CAMPAIGN_REQUEST_INVALID", message: "Choose a vehicle, a start and an end." });
  const c = await svc.createCampaign({ ...p.data, userId: uid(req) });
  await logActionFromReq(req, "featured_campaign_created", { target: c.id, targetModel: "FeaturedCampaign", details: { carId: c.carId, startsAt: c.startsAt, endsAt: c.endsAt } });
  res.status(201).json({ success: true, campaign: c });
}));

const patch = z.object({ startsAt: z.string().optional(), endsAt: z.string().optional(), displayOrder: z.union([z.number(), z.string()]).optional() }).strict();
router.put("/:id", handle(async (req, res) => {
  const p = patch.safeParse(req.body); if (!p.success) return res.status(400).json({ success: false, code: "CAMPAIGN_REQUEST_INVALID", message: "Invalid request." });
  const c = await svc.updateCampaign(req.params.id, { ...p.data, userId: uid(req) });
  await logActionFromReq(req, "featured_campaign_updated", { target: c.id, targetModel: "FeaturedCampaign", details: { startsAt: c.startsAt, endsAt: c.endsAt, displayOrder: c.displayOrder } });
  res.json({ success: true, campaign: c });
}));
router.post("/:id/pause", handle(async (req, res) => {
  const c = await svc.setPaused(req.params.id, true, { userId: uid(req) });
  await logActionFromReq(req, "featured_campaign_paused", { target: c.id, targetModel: "FeaturedCampaign" });
  res.json({ success: true, campaign: c });
}));
router.post("/:id/resume", handle(async (req, res) => {
  const c = await svc.setPaused(req.params.id, false, { userId: uid(req) });
  await logActionFromReq(req, "featured_campaign_resumed", { target: c.id, targetModel: "FeaturedCampaign" });
  res.json({ success: true, campaign: c });
}));
router.post("/:id/end", handle(async (req, res) => {
  if (!needConfirm(req, res)) return;
  const c = await svc.endNow(req.params.id, { userId: uid(req) });
  await logActionFromReq(req, "featured_campaign_ended", { target: c.id, targetModel: "FeaturedCampaign" });
  res.json({ success: true, campaign: c });
}));
router.delete("/:id", handle(async (req, res) => {
  if (!needConfirm(req, res)) return;
  const r = await svc.deleteCampaign(req.params.id, { userId: uid(req) });
  await logActionFromReq(req, "featured_campaign_deleted", { target: r.id, targetModel: "FeaturedCampaign" });
  res.json({ success: true, deleted: r });
}));

export const publicRouter = express.Router();
publicRouter.get("/current", async (req, res) => {
  try {
    const r = await svc.currentPublic();
    res.set("Cache-Control", "public, max-age=30");
    res.json({ success: true, ...r });
  } catch {
    // The homepage must keep working when campaigns are not set up or the store is briefly unavailable.
    res.set("Cache-Control", "no-store");
    res.json({ success: true, carIds: [], serverTime: new Date().toISOString() });
  }
});

export default router;
