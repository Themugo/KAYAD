// Admin-configurable listing policy. Decides whether a dealer must hold an active subscription plan before publishing vehicles.
//
// DEFAULT (no row saved): subscriptionRequired = false. Approved dealers list for free so the marketplace can be populated;
// plans/packages stay optional and are granted or sold only when an admin chooses (Admin > Settings > Listing & Plans).
// Storage: public.system_settings, key "dealer_listing_policy" (no schema change). A single boolean, so writes are a plain upsert.
// If the store cannot be read the DEFAULT (free) applies and the failure is logged; the admin "locked listings" switch still applies.
import * as supabaseModule from "../utils/supabase.js";
import * as loggerModule from "../infrastructure/logging/index.js";

const getSupabase = () => supabaseModule.getSupabase();
const logError = (...a) => { try { loggerModule.logError?.(...a); } catch { /* logging must not throw */ } };

export const DEALER_LISTING_POLICY_KEY = "dealer_listing_policy";
export const DEFAULT_LISTING_POLICY = Object.freeze({ subscriptionRequired: false });

let testOverride = null;
export function __setDealerListingPolicyForTests(policy) {
  if (process.env.NODE_ENV !== "test") throw new Error("test seam is only available in NODE_ENV=test");
  testOverride = policy === null ? null : { ...DEFAULT_LISTING_POLICY, ...policy };
}

/** @returns {{subscriptionRequired: boolean, source: "default"|"database"|"unavailable", updatedAt: string|null, updatedBy: string|null}} */
export async function getDealerListingPolicy() {
  if (testOverride && process.env.NODE_ENV === "test") return { ...testOverride, source: "database", updatedAt: null, updatedBy: null };
  try {
    const { data, error } = await getSupabase().from("system_settings").select("value").eq("key", DEALER_LISTING_POLICY_KEY).maybeSingle();
    if (error) throw error;
    if (!data) return { ...DEFAULT_LISTING_POLICY, source: "default", updatedAt: null, updatedBy: null };
    const v = data.value && typeof data.value === "object" ? data.value : {};
    return {
      subscriptionRequired: v.subscriptionRequired === true,
      source: "database",
      updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : null,
      updatedBy: typeof v.updatedBy === "string" ? v.updatedBy : null,
    };
  } catch (err) {
    logError("Dealer listing policy read failed; defaulting to free listing", { error: err?.message || String(err), code: "DEALER_LISTING_POLICY_READ_FAILED" });
    return { ...DEFAULT_LISTING_POLICY, source: "unavailable", updatedAt: null, updatedBy: null };
  }
}

export async function updateDealerListingPolicy({ subscriptionRequired, actorId }) {
  if (typeof subscriptionRequired !== "boolean") {
    throw Object.assign(new Error("subscriptionRequired must be true or false"), { code: "DEALER_LISTING_POLICY_INVALID", status: 400 });
  }
  const before = await getDealerListingPolicy();
  const stamp = new Date().toISOString();
  const value = { schemaVersion: 1, subscriptionRequired, updatedAt: stamp, updatedBy: actorId ? String(actorId) : null };
  const { error } = await getSupabase().from("system_settings").upsert(
    { key: DEALER_LISTING_POLICY_KEY, value, description: "Admin-configured dealer listing policy (is a subscription required to list)", updated_at: stamp },
    { onConflict: "key" },
  );
  if (error) {
    logError("Dealer listing policy write failed", { error: error.message, code: "DEALER_LISTING_POLICY_WRITE_FAILED" });
    throw Object.assign(new Error("Could not save the listing policy"), { code: "DEALER_LISTING_POLICY_WRITE_FAILED", status: 500 });
  }
  return { before: { subscriptionRequired: before.subscriptionRequired }, after: { subscriptionRequired, updatedAt: stamp, updatedBy: value.updatedBy } };
}
