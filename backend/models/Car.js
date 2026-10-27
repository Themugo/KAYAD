import { createModel } from "./_base.js";
import { getSupabase } from "../utils/supabase.js";

const Car = createModel("Car");

// Phase 14.7: race-safe soft delete for the dealer/staff delete endpoint. The guard is part of the UPDATE's WHERE clause, so
// PostgreSQL evaluates it against the locked row: a bid or an auction going live between a pre-check and this write cannot
// slip through (the place-bid RPC takes FOR UPDATE on the same row). Returns { modifiedCount }.
// The platform-wide Car.softDelete (used by admin routes) is unchanged.
Car.softDeleteGuarded = async function softDeleteGuarded(id, actorId = null) {
  const patch = { deleted_at: new Date().toISOString() };
  if (actorId) patch.deleted_by = String(actorId);
  const { data, error } = await getSupabase()
    .from("cars")
    .update(patch)
    .eq("id", String(id))
    .is("deleted_at", null)
    .or("status.is.null,status.not.in.(sold,reserved)")
    .or("auction_status.is.null,auction_status.not.in.(live,ended)")
    .or("bids_count.is.null,bids_count.eq.0")
    .is("highest_bidder_id", null)
    // 14.8: PostgREST evaluates an UPDATE's filters against the RETURNING column list, so every filtered column must be selected.
    // `.select("id")` made EVERY guarded delete fail with 42703 "column cars.status does not exist" on a real database (found by
    // the real-database run; the 14.7 mocks could not see it).
    .select("id,status,auction_status,bids_count,highest_bidder_id");
  if (error) throw error;
  return { modifiedCount: (data || []).length };
};

// Count of bid rows for a car (pre-check only; counters on the car row are enforced atomically above).
Car.countBidRows = async function countBidRows(id) {
  const { count, error } = await getSupabase().from("bids").select("id", { count: "exact", head: true }).eq("car_id", String(id));
  if (error) throw error;
  return count || 0;
};

export default Car;
