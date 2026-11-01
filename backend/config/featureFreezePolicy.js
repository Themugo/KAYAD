// Feature freezes ("kill switches"): the single, pure definition of WHAT each freeze stops and WHICH request it stops.
//
// Design rules (do not weaken):
//  - A freeze blocks only NEW operations of the documented kind. Reads, admin/finance reads, provider callbacks (M-Pesa result and
//    timeout URLs), refunds/releases and every other in-flight settlement path are never blocked, so a freeze cannot corrupt or strand
//    an existing record or lose a provider notification.
//  - Matching is by HTTP method + an exact, anchored route pattern on the normalised path. It is NOT a URL substring test, so
//    "/bids/admin/all" or "/payments/callback" can never be caught by accident, and a newly added route is NOT silently frozen or
//    silently unfrozen: it must be added here (and covered by the route-inventory test) to take part.
//  - Freezes are independent of maintenance. They apply under every maintenance scope as well as when maintenance is off.
//  - An absent flag means ENABLED (a freeze is only ever an explicit, persisted `false`).
import { normalizeRoutePath } from "./maintenancePolicy.js";

/** key -> persisted system_status field, human label, what is stopped. */
export const FEATURE_FREEZES = Object.freeze({
  auctions: Object.freeze({
    field: "isAuctionActive", label: "Auction Bid Gate",
    blocks: "Placing a new bid (web/app and inbound SMS bids). Auction countdowns, reads, auction closing and settlement continue.",
  }),
  payments: Object.freeze({
    field: "isPaymentsActive", label: "Financial Gateway",
    blocks: "Starting a new customer payment (STK push): general payments, auction-winner payments, bidder commitment / high-value deposit, subscription upgrade/reactivation and dealer plan upgrade. Provider callbacks, status checks, reads, refunds and escrow releases continue.",
  }),
  registrations: Object.freeze({
    field: "isRegistrationsActive", label: "User Registrations",
    blocks: "Creating a new account. Existing users, sign-in and password recovery are unaffected.",
  }),
  messaging: Object.freeze({
    field: "isMessagingActive", label: "Messaging System",
    blocks: "Starting a chat and sending a chat message. Reading existing messages, marking seen and deleting a chat continue.",
  }),
});

/** Controls that are shown in the Panic Room but have NO enforcement path, so no action is offered. Listed so the UI and tests agree. */
export const UNAVAILABLE_FREEZES = Object.freeze({
  inspection: Object.freeze({ field: "isGhostCheckActive", label: "Pre-Inspection Detection", reason: "A persisted flag exists but no request path consults it." }),
  escrows: Object.freeze({ field: null, label: "Escrow Transactions", reason: "No safe pause point: blocking release, refund or dispute would strand customer funds. Needs an owner decision." }),
});

export const FREEZE_KEYS = Object.freeze(Object.keys(FEATURE_FREEZES));

const ID = "[^/]+";
// [method, anchored pattern on the normalised path (leading /v1 removed), freeze key, providerCall]
const FREEZE_ROUTES = Object.freeze([
  ["POST", new RegExp(`^/bids/${ID}/bid$`), "auctions", false],
  ["POST", /^\/sms-bidding\/webhook\/inbound$/, "auctions", true],

  ["POST", /^\/payments\/initiate$/, "payments", false],
  ["POST", new RegExp(`^/auctions/${ID}/outcome/payment$`), "payments", false],
  ["POST", new RegExp(`^/auctions/${ID}/registration/commitment$`), "payments", false],
  ["POST", new RegExp(`^/auctions/${ID}/registration/high-value-deposit$`), "payments", false],
  ["POST", /^\/subscriptions\/upgrade$/, "payments", false],
  ["POST", /^\/subscriptions\/reactivate$/, "payments", false],
  ["POST", /^\/dealer\/upgrade$/, "payments", false],

  ["POST", /^\/auth\/register$/, "registrations", false],

  ["POST", /^\/chat$/, "messaging", false],
  ["POST", new RegExp(`^/chat/${ID}/message$`), "messaging", false],
]);

/** -> { feature, providerCall } | null for requests that are not freezable. */
export const classifyFreezeRoute = (method, path) => {
  const m = String(method || "").toUpperCase();
  const p = normalizeRoutePath(path);
  for (const [rm, re, feature, providerCall] of FREEZE_ROUTES) if (rm === m && re.test(p)) return { feature, providerCall };
  return null;
};

export const isFeatureEnabled = (settings, feature) => {
  const def = FEATURE_FREEZES[feature];
  return !def || settings?.[def.field] !== false;
};

/** -> null (not frozen) or { feature, label, providerCall } */
export const frozenFor = (settings, method, path) => {
  const c = classifyFreezeRoute(method, path);
  if (!c || isFeatureEnabled(settings, c.feature)) return null;
  return { feature: c.feature, label: FEATURE_FREEZES[c.feature].label, providerCall: c.providerCall };
};

export const FEATURE_FROZEN_CODE = "FEATURE_FROZEN";
export const frozenResponse = (feature) => ({
  success: false,
  code: FEATURE_FROZEN_CODE,
  feature,
  message: `${FEATURE_FREEZES[feature].label} is temporarily paused by the platform. Please try again later.`,
});

/** Public view of every freeze for the control plane: enabled flag per available control, plus the unavailable list. */
export const featureSwitchView = (settings) => {
  const out = {};
  for (const k of FREEZE_KEYS) out[k] = isFeatureEnabled(settings, k);
  return out;
};
