// Admin API for the no-code public-site design editor. Administrators only; every state change is audited; destructive actions need confirm:true.
import express from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/role.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { uploadMemory, handleUploadError } from "../middleware/upload.js";
import { uploadImage } from "../config/cloudinary.js";
import { isAllowedLogoUrl } from "../utils/brandingValidation.js";
import { logWarn } from "../utils/logger.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import * as svc from "../services/siteDesign.service.js";
import { FONT_CHOICES, TRANSITIONS, DIRECTIONS, COLOR_KEYS, STARTERS } from "../utils/siteDesign.js";

const router = express.Router();
router.use(protect, authorize("admin", "superadmin"));

const handle = (fn) => asyncHandler(async (req, res) => {
  try { await fn(req, res); }
  catch (e) {
    if (e?.status) return res.status(e.status).json({ success: false, code: e.code, message: e.message, ...(e.errors ? { errors: e.errors } : {}) });
    throw e;
  }
});
const uid = (req) => req.user.id;
const confirmed = z.object({ confirm: z.literal(true) });
const needConfirm = (req, res) => { if (!confirmed.safeParse(req.body).success) { res.status(400).json({ success: false, code: "CONFIRMATION_REQUIRED", message: "This action needs explicit confirmation (confirm: true)." }); return false; } return true; };

router.get("/", handle(async (req, res) => { res.set("Cache-Control", "no-store"); res.json({ success: true, ...(await svc.getOverview()),
  limits: { fonts: FONT_CHOICES, transitions: TRANSITIONS, directions: DIRECTIONS, colorKeys: COLOR_KEYS, starters: STARTERS.map((s) => s.id) } }); }));

router.get("/history", handle(async (req, res) => { res.set("Cache-Control", "no-store"); res.json({ success: true, history: await svc.listHistory(req.query.limit) }); }));

router.post("/assets/logo", uploadMemory.single("logo"), handleUploadError, handle(async (req, res) => {
  // Stores the image and returns its URL ONLY. The live logo is untouched until a design containing this URL is published.
  if (!req.file) return res.status(400).json({ success: false, code: "LOGO_FILE_MISSING", message: "No image file was received. Choose a PNG, JPEG or WebP file and try again." });
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return res.status(503).json({ success: false, code: "LOGO_STORAGE_NOT_CONFIGURED", message: "Image storage is not configured on the server. Nothing was uploaded." });
  let result;
  try { result = await uploadImage(req.file, "kayad/branding", { generateVariants: true, preserveOriginal: true }); }
  catch (err) { logWarn("Design asset upload failed", { error: err?.message }); return res.status(502).json({ success: false, code: "LOGO_UPLOAD_FAILED", message: "The image storage service did not accept the upload. Nothing was changed." }); }
  if (!result?.url || !isAllowedLogoUrl(result.url)) return res.status(502).json({ success: false, code: "LOGO_UPLOAD_INVALID_RESPONSE", message: "The image storage provider did not return a usable URL. Nothing was changed." });
  res.status(201).json({ success: true, url: result.url, thumb: result.thumb });
}));

router.post("/rollback/:publicationId", handle(async (req, res) => {
  if (!needConfirm(req, res)) return;
  const pub = await svc.rollbackTo(req.params.publicationId, { userId: uid(req), admin: req.user });
  await logActionFromReq(req, "site_design_rollback", { target: req.params.publicationId, targetModel: "SiteDesign", details: { publicationId: pub.id } });
  res.json({ success: true, publication: pub });
}));

const createSchema = z.object({ name: z.string(), description: z.string().optional(), from: z.object({ type: z.enum(["current", "starter", "design"]), id: z.string().optional() }).optional() }).strict();
router.post("/", handle(async (req, res) => {
  const p = createSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ success: false, code: "DESIGN_REQUEST_INVALID", message: "Invalid request." });
  const d = await svc.createDesign({ ...p.data, userId: uid(req) });
  await logActionFromReq(req, "site_design_created", { target: d.id, targetModel: "SiteDesign", details: { name: d.name } });
  res.status(201).json({ success: true, design: d });
}));

router.get("/:id", handle(async (req, res) => { res.set("Cache-Control", "no-store"); res.json({ success: true, design: await svc.getDesign(req.params.id) }); }));

const saveSchema = z.object({ expectedRevision: z.number().int(), config: z.any().optional(), name: z.string().optional(), description: z.string().optional() }).strict();
router.put("/:id", handle(async (req, res) => {
  const p = saveSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ success: false, code: "DESIGN_REQUEST_INVALID", message: "Invalid request." });
  const d = await svc.saveDesign(req.params.id, { ...p.data, userId: uid(req) });
  await logActionFromReq(req, "site_design_saved", { target: d.id, targetModel: "SiteDesign", details: { revision: d.revision } });
  res.json({ success: true, design: d });
}));

router.post("/:id/duplicate", handle(async (req, res) => {
  const d = await svc.duplicateDesign(req.params.id, { name: typeof req.body?.name === "string" ? req.body.name : undefined, userId: uid(req) });
  await logActionFromReq(req, "site_design_duplicated", { target: d.id, targetModel: "SiteDesign", details: { from: req.params.id } });
  res.status(201).json({ success: true, design: d });
}));

router.delete("/:id", handle(async (req, res) => {
  if (!needConfirm(req, res)) return;
  const r = await svc.deleteDesign(req.params.id);
  await logActionFromReq(req, "site_design_deleted", { target: r.id, targetModel: "SiteDesign", details: { name: r.name } });
  res.json({ success: true, deleted: r });
}));

router.post("/:id/publish", handle(async (req, res) => {
  if (!needConfirm(req, res)) return;
  const pub = await svc.publishDesign(req.params.id, { expectedRevision: Number.isInteger(req.body?.expectedRevision) ? req.body.expectedRevision : undefined, userId: uid(req), admin: req.user });
  await logActionFromReq(req, "site_design_published", { target: req.params.id, targetModel: "SiteDesign", details: { publicationId: pub.id } });
  res.json({ success: true, publication: pub });
}));

export default router;
