// Phase 13F — public by-ID listing guard.
// `GET /api/cars/:id/{price-history,insights,valuation}` are anonymous, cached endpoints that previously answered for ANY car id,
// including hidden (private-seller suspension/revocation), pending, draft and soft-deleted listings. This guard runs BEFORE the
// response cache so a non-public listing is never served (and never cached), whatever the caller's identity. Owners and staff use
// the authenticated listing endpoints. It fails closed: a lookup error is passed to the error handler, never treated as "public".
import { getSupabase } from "../utils/supabase.js";

const PUBLIC_STATUSES = new Set(["available", "sold"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Same guard for routes whose id parameter is not called `id` (Phase 13I: /api/valuation/:vehicleId, /api/ai/decision/vehicles/:vehicleId). */
export const requirePublicListingParam = (name = "id") => async (req, res, next) => {
  try {
    const id = req.params[name];
    if (!UUID_RE.test(String(id || ""))) return res.status(404).json({ success: false, message: "Car not found" });
    const { data, error } = await getSupabase().from("cars").select("id,status,deleted_at").eq("id", id).maybeSingle();
    if (error) return next(error);
    if (!data || data.deleted_at || !PUBLIC_STATUSES.has(data.status)) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requirePublicListing = requirePublicListingParam("id");
