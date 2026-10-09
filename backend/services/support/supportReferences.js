// Server-side ownership verification for "related to" links. A reference the caller cannot prove a stake in
// is dropped (the case is still created) and reported as referenceLinked:false -> no existence oracle.
import { getSupabase } from "../../utils/supabase.js";
import { isUuid } from "./supportPolicy.js";

const PUBLIC_VEHICLE_STATUSES = new Set(["available", "reserved", "sold"]);

async function one(table, columns, filters) {
  let q = getSupabase().from(table).select(columns);
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
}

const checks = {
  async vehicle(id, userId) {
    const car = await one("cars", "id,dealer_id,status", { id });
    if (!car) return null;
    return car.dealer_id === userId || PUBLIC_VEHICLE_STATUSES.has(car.status) ? { related_car: id } : null;
  },
  async escrow(id, userId) {
    const e = await one("escrows", "id,buyer,seller", { id });
    return e && (e.buyer === userId || e.seller === userId) ? { related_escrow: id } : null;
  },
  async payment(id, userId) {
    const p = await one("payments", "id,user_id", { id });
    return p && p.user_id === userId ? { related_payment: id } : null;
  },
  async inspection(id, userId) {
    const b = await one("inspection_bookings", "id,customer_id", { id });
    if (b && b.customer_id === userId) return { related_inspection: id };
    const v = await one("vehicle_inspections", "id,requester_id", { id });
    return v && v.requester_id === userId ? { related_inspection: id } : null;
  },
  async auction(id, userId) {
    const car = await one("cars", "id,dealer_id", { id });
    if (!car) return null;
    if (car.dealer_id === userId) return { related_auction: id };
    const bid = await one("bids", "id", { car_id: id, user_id: userId });
    return bid ? { related_auction: id } : null;
  },
};

export async function resolveReference(reference, userId) {
  if (!reference) return { linked: null, columns: {} };
  if (!isUuid(reference.id) || !checks[reference.kind]) return { linked: false, columns: {} };
  try {
    const cols = await checks[reference.kind](reference.id, String(userId));
    return cols ? { linked: true, columns: cols } : { linked: false, columns: {} };
  } catch {
    return { linked: false, columns: {} };
  }
}

export function relatedForRpc(columns = {}) {
  return {
    car: columns.related_car || null,
    escrow: columns.related_escrow || null,
    payment: columns.related_payment || null,
    inspection: columns.related_inspection || null,
    auction: columns.related_auction || null,
  };
}
