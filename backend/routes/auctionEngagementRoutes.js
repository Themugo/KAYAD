import express from "express";
import { protect, optionalAuth } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import { getEngagement, recordVisit, setFollow, setLike, listComments, addComment, removeComment, getInsights, reportComment, listReportedComments } from "../services/auctionEngagement.service.js";

const router = express.Router();

router.get("/:id/engagement", validateObjectId, optionalAuth, asyncHandler(async (req, res) =>
  res.json({ success: true, engagement: await getEngagement({ auctionId: req.params.id, userId: req.user?.id || null }) })));

// Anonymous-friendly: counted once per visitor per day for "unique", every call for "visits". No raw IP is stored.
router.post("/:id/visit", validateObjectId, optionalAuth, asyncHandler(async (req, res) =>
  res.json({ success: true, ...(await recordVisit({ auctionId: req.params.id, userId: req.user?.id || null, ip: req.ip, ua: req.get("user-agent") })) })));

router.post("/:id/follow", validateObjectId, protect, asyncHandler(async (req, res) => res.json({ success: true, engagement: await setFollow({ auctionId: req.params.id, userId: req.user.id, on: true }) })));
router.delete("/:id/follow", validateObjectId, protect, asyncHandler(async (req, res) => res.json({ success: true, engagement: await setFollow({ auctionId: req.params.id, userId: req.user.id, on: false }) })));
router.post("/:id/like", validateObjectId, protect, asyncHandler(async (req, res) => res.json({ success: true, engagement: await setLike({ auctionId: req.params.id, userId: req.user.id, on: true }) })));
router.delete("/:id/like", validateObjectId, protect, asyncHandler(async (req, res) => res.json({ success: true, engagement: await setLike({ auctionId: req.params.id, userId: req.user.id, on: false }) })));

router.get("/:id/comments", validateObjectId, asyncHandler(async (req, res) =>
  res.json({ success: true, ...(await listComments({ auctionId: req.params.id, before: req.query.before || null })) })));
router.post("/:id/comments", validateObjectId, protect, asyncHandler(async (req, res) =>
  res.status(201).json({ success: true, comment: await addComment({ auctionId: req.params.id, user: req.user, body: req.body?.body }) })));
router.delete("/:id/comments/:commentId", validateObjectId, protect, asyncHandler(async (req, res) =>
  res.json({ success: true, ...(await removeComment({ auctionId: req.params.id, commentId: req.params.commentId, user: req.user })) })));

router.post("/:id/comments/:commentId/report", validateObjectId, protect, asyncHandler(async (req, res) => res.json({ success: true, ...(await reportComment({ auctionId: req.params.id, commentId: req.params.commentId, user: req.user, reason: req.body?.reason })) })));
router.get("/admin/reported-comments", protect, asyncHandler(async (req, res) => res.json({ success: true, comments: await listReportedComments({ user: req.user }) })));

router.get("/:id/insights", validateObjectId, protect, asyncHandler(async (req, res) => res.json({ success: true, insights: await getInsights({ auctionId: req.params.id, user: req.user }) })));

export default router;
