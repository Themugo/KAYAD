// Stage 5F.10 — application-layer view of the PostgreSQL private-seller auction gate.
//
// The ONLY eligibility definition is the database function kayad_private_seller_gate().
// The same function is evaluated *inside* the bid/start/settle transactions (with the car row
// locked), so this module is a fail-closed PRE-CHECK and a PUBLIC PROJECTION helper, never the
// authority. If the gate cannot be evaluated the answer is "not eligible" (503), never "eligible".
import { getSupabase } from "../utils/supabase.js";

export const ELIGIBILITY_CODE = "PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE";
export const ELIGIBILITY_UNAVAILABLE = "ELIGIBILITY_UNAVAILABLE";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const carIdOf = (carOrId) => {
  if (carOrId && typeof carOrId === "object") return String(carOrId.id ?? carOrId._id ?? "");
  return carOrId == null ? "" : String(carOrId);
};

const normalise = (gate, carId) => {
  const eligible = gate?.eligible === true;
  const blockers = Array.isArray(gate?.blockers) ? gate.blockers : [];
  return {
    eligible,
    scope: gate?.scope || (eligible ? "not_private_seller" : "private_seller_proposal"),
    carId,
    proposalId: gate?.proposal_id ?? null,
    proposalVersion: gate?.proposal_version ?? null,
    evidenceVersion: gate?.evidence_version ?? null,
    blockers,
    code: eligible ? "ELIGIBLE" : ELIGIBILITY_CODE,
  };
};

const unavailable = (cause) =>
  Object.assign(new Error("Auction eligibility could not be verified. Please try again shortly."), {
    status: 503,
    code: ELIGIBILITY_UNAVAILABLE,
    cause,
  });

/** Non-locking read of the DB gate for one vehicle. Throws 503 if the gate cannot be evaluated. */
export async function evaluatePrivateSellerAuctionEligibility(carOrId) {
  const carId = carIdOf(carOrId);
  if (!UUID_RE.test(carId)) return { eligible: false, scope: "unknown", carId, blockers: ["Vehicle not found"], code: "VEHICLE_NOT_FOUND" };
  const { data, error } = await getSupabase().rpc("kayad_private_seller_gate", { p_car_id: carId, p_lock: false });
  if (error || data == null) throw unavailable(error);
  return normalise(data, carId);
}

/** Pre-check used before any money moves or a lifecycle call is made. 409 when blocked, 503 when unknown. */
export async function assertPrivateSellerAuctionEligible(carOrId) {
  const result = await evaluatePrivateSellerAuctionEligibility(carOrId);
  if (!result.eligible) {
    throw Object.assign(
      new Error("Private-seller auction is blocked until payment, verification, custody and approval requirements are satisfied"),
      { status: result.code === "VEHICLE_NOT_FOUND" ? 404 : 409, code: result.code, details: result },
    );
  }
  return result;
}

/** Batch (non-locking) evaluation for public projection. Map<carId, result>. Throws 503 on failure. */
export async function evaluateEligibilityBatch(carIds) {
  const ids = [...new Set((carIds || []).map(carIdOf).filter((id) => UUID_RE.test(id)))];
  const out = new Map();
  if (!ids.length) return out;
  const { data, error } = await getSupabase().rpc("kayad_private_seller_gate_batch", { p_car_ids: ids });
  if (error || !Array.isArray(data)) throw unavailable(error);
  for (const row of data) out.set(String(row.car_id), normalise({ eligible: row.eligible, scope: row.scope, blockers: row.blockers }, String(row.car_id)));
  return out;
}

/**
 * Public exposure filter: keeps only rows whose vehicle passes the gate. Fail-closed — any gate failure
 * hides every private-seller-capable row rather than showing an unverified live auction.
 * `idOf` extracts the car id from a row.
 */
export async function filterPubliclyEligible(rows, idOf = (r) => r?.id ?? r?._id) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return list;
  const verdicts = await evaluateEligibilityBatch(list.map(idOf));
  return list.filter((row) => verdicts.get(carIdOf(idOf(row)))?.eligible === true);
}

/** True when a DB error raised by an atomic RPC is the gate refusing the mutation. */
export const isGateRefusal = (err) =>
  Boolean(err) && (String(err.message || err.details || "").includes(ELIGIBILITY_CODE) || err.code === ELIGIBILITY_CODE);

export function toGateConflict(err) {
  return Object.assign(new Error("Private-seller auction is blocked until payment, verification, custody and approval requirements are satisfied"), {
    status: 409,
    code: ELIGIBILITY_CODE,
    details: { eligible: false, blockers: String(err?.details || "").split(";").map((s) => s.trim()).filter(Boolean) },
  });
}
