// PUBLIC visitor-analytics collection. Guests and signed-in users post here; no login is required. The endpoint never returns data.
import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { z } from "zod";
import { optionalAuth } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { recordEvent, EVENT_TYPES } from "../services/analytics.service.js";

const router = express.Router();
const uuid = z.string().uuid();
const collectSchema = z.object({
  visitorId: uuid,
  sessionId: uuid,
  eventId: uuid,
  type: z.enum(EVENT_TYPES),
  path: z.string().min(1).max(400),
  listingId: uuid.optional(),
  referrer: z.string().max(400).optional(),
  utm: z.object({ source: z.string().max(60).optional(), medium: z.string().max(60).optional(), campaign: z.string().max(60).optional() }).optional(),
}).strict();

// Per visitor+network key, generous enough for heartbeats and fast navigation, tight enough to blunt event flooding.
const limiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.ANALYTICS_RATE_LIMIT_PER_MIN || 90),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip || "")}|${String(req.body?.visitorId || "").slice(0, 36)}`,
  handler: (req, res) => res.status(202).json({ success: true, counted: false, reason: "rate_limited" }),
});

router.post("/collect", optionalAuth, limiter, asyncHandler(async (req, res) => {
  const parsed = collectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: "ANALYTICS_EVENT_INVALID", message: "Invalid analytics event." });
  try {
    const out = await recordEvent(req, parsed.data);
    res.set("Cache-Control", "no-store");
    // 202 for every outcome: the browser must not learn (or retry on) why an event was ignored.
    return res.status(202).json({ success: true, counted: out.counted });
  } catch (err) {
    if (err?.code === "ANALYTICS_NOT_CONFIGURED") return res.status(202).json({ success: true, counted: false });
    throw err;
  }
}));

export default router;
