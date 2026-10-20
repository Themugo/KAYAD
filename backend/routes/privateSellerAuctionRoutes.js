// Stage 5F.10 — private-seller auction verification & custody API.
// Three audiences, three mount points; the mount point (never the request body) decides the capacity being claimed,
// and the database verifies that the authenticated user really holds it. All mutations are idempotent (Idempotency-Key).
import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { requirePermission, requireRole, PERMISSIONS } from "../middleware/rbac.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import {
  createProposal, applyEvent, applyCapabilityAction, requireIdempotencyKey,
  listSellerProposals, getSellerProposalDetail, listProviderProposals, listAdminQueue, getAdminProposalDetail,
} from "../services/privateSellerAuctionProposal.service.js";

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validId = (req, res, next) => (UUID_RE.test(req.params.id || req.params.providerId || "") ? next() : res.status(400).json({ success: false, message: "Invalid identifier" }));

const run = (actorRole, { audit = true } = {}) => asyncHandler(async (req, res) => {
  const idem = requireIdempotencyKey(req);
  const event = String(req.params.event || "");
  const result = await applyEvent({ proposalId: req.params.id, event, actorUserId: req.user.id, actorRole, payload: req.body?.payload ?? req.body ?? {}, idem });
  if (audit) await logActionFromReq(req, `private_seller_auction_${event}`, { target: req.params.id, targetModel: "PrivateSellerAuctionProposal", details: { actorRole, idempotent: Boolean(result?.idempotent) } }).catch(() => {});
  res.status(200).json({ success: true, result });
});

// ---- seller -------------------------------------------------------------------------------------------------------------------
router.post("/seller/proposals", protect, asyncHandler(async (req, res) => {
  const idem = requireIdempotencyKey(req);
  const result = await createProposal({ carId: req.body?.carId, sellerUserId: req.user.id, idem });
  await logActionFromReq(req, "private_seller_auction_proposal_created", { target: req.body?.carId, targetModel: "Car", details: { idempotent: Boolean(result?.idempotent) } }).catch(() => {});
  res.status(201).json({ success: true, result });
}));
router.get("/seller/proposals", protect, asyncHandler(async (req, res) => res.json({ success: true, proposals: await listSellerProposals(req.user.id) })));
router.get("/seller/proposals/:id", protect, validId, asyncHandler(async (req, res) => {
  const d = await getSellerProposalDetail({ proposalId: req.params.id, sellerUserId: req.user.id });
  if (!d) return res.status(404).json({ success: false, message: "Proposal not found" });
  res.json({ success: true, ...d });
}));
router.post("/seller/proposals/:id/events/:event", protect, validId, run("seller"));

// ---- inspection / custody partner (garage or dealer) ----------------------------------------------------------------------------
router.get("/provider/proposals", protect, asyncHandler(async (req, res) => res.json({ success: true, proposals: await listProviderProposals(req.user.id) })));
router.post("/provider/proposals/:id/events/:event", protect, validId, run("provider"));
router.post("/provider/capabilities/:providerId/request", protect, validId, asyncHandler(async (req, res) => {
  const result = await applyCapabilityAction({ providerId: req.params.providerId, providerKind: String(req.body?.providerKind || ""), action: "request", actorUserId: req.user.id, actorRole: "provider", payload: req.body?.payload ?? {} });
  await logActionFromReq(req, "custody_capability_requested", { target: req.params.providerId, targetModel: "VehicleCustodyCapability", details: {} }).catch(() => {});
  res.json({ success: true, result });
}));

// ---- admin ------------------------------------------------------------------------------------------------------------------------
router.get("/admin/proposals", protect, requireRole("admin", "superadmin"), requirePermission(PERMISSIONS.MANAGE_AUCTIONS), asyncHandler(async (req, res) => res.json({ success: true, proposals: await listAdminQueue({ status: req.query.status ? String(req.query.status) : undefined }) })));
router.get("/admin/proposals/:id", protect, requireRole("admin", "superadmin"), requirePermission(PERMISSIONS.MANAGE_AUCTIONS), validId, asyncHandler(async (req, res) => {
  const d = await getAdminProposalDetail(req.params.id);
  if (!d) return res.status(404).json({ success: false, message: "Proposal not found" });
  res.json({ success: true, ...d });
}));
router.post("/admin/proposals/:id/events/:event", protect, requireRole("admin", "superadmin"), requirePermission(PERMISSIONS.MANAGE_AUCTIONS), validId, run("admin"));
router.post("/admin/capabilities/:providerId/:action", protect, requireRole("admin", "superadmin"), requirePermission(PERMISSIONS.MANAGE_AUCTIONS), validId, asyncHandler(async (req, res) => {
  const result = await applyCapabilityAction({ providerId: req.params.providerId, providerKind: String(req.body?.providerKind || ""), action: req.params.action, actorUserId: req.user.id, actorRole: "admin", payload: req.body?.payload ?? {} });
  await logActionFromReq(req, `custody_capability_${req.params.action}`, { target: req.params.providerId, targetModel: "VehicleCustodyCapability", details: {} }).catch(() => {});
  res.json({ success: true, result });
}));

export default router;
