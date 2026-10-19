// backend/config/owners.js
// ─────────────────────────────────────────────────────────────────────────
// Single source of truth for who the platform OWNERS (webhosts) are.
//
// STAGE 5B: ownership is DATABASE-BACKED (owner_memberships, keyed by users.id) and managed by the owners themselves from
// the admin console. WEBHOIST_EMAIL(S) is now only the list of DESIGNATED initial owner identities: it reserves those
// addresses against public sign-up and bounds who the one-time bootstrap / emergency-recovery procedures may invite.
// Until the owner-governance migration is applied (store "not installed") the Stage 5A rule still applies: a listed
// address that is VERIFIED is the owner. See runbooks/stage5b-owner-governance-20261019/.
//
// Every owner gets the virtual "webhoist" role (bypasses ordinary role checks, never ownership/ledger/audit checks) and
// is immutable to ordinary admins: they cannot edit, delete, re-role or re-email an owner account.
// ─────────────────────────────────────────────────────────────────────────

const parse = (raw) =>
  String(raw || "")
    .split(",")
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);

// Accept WEBHOIST_EMAIL (comma-separated) plus optional WEBHOIST_EMAILS alias.
// STAGE 5B: these addresses are the DESIGNATED initial owner identities. Once the owner-governance store is installed they
// no longer GRANT privilege by themselves: they only (a) reserve the address against public sign-up, (b) say who the
// controlled bootstrap / emergency-recovery procedures may invite. Privilege then comes from an active, verified row in
// owner_memberships (services/ownerRegistry.service.js). While the store is not installed (migration not yet applied) the
// Stage 5A behaviour below applies unchanged, so shipping this code cannot lock anyone out.
export const OWNER_EMAILS = Array.from(
  new Set([...parse(process.env.WEBHOIST_EMAIL), ...parse(process.env.WEBHOIST_EMAILS)]),
);

// The first listed owner is the "main" / primary owner — the one that is
// protected most strictly and shown as the platform principal.
export const MAIN_OWNER_EMAIL = OWNER_EMAILS[0] || "";

// One canonical normalisation for every owner comparison (NFKC folds full-width look-alikes, then trim + lower-case).
export const normalizeOwnerEmail = (email) => String(email ?? "").normalize("NFKC").trim().toLowerCase();

// The registry installs a provider that returns the current snapshot, or null when the database store is not installed
// (legacy / Stage 5A behaviour). Snapshot shape: { owners: Map<email, userId>, active: Set<email>, pending: Set<email> }.
let snapshotProvider = () => null;
export const __setOwnerSnapshotProvider = (fn) => { snapshotProvider = typeof fn === "function" ? fn : () => null; };

/** Is this one of the designated initial owner identities (configuration only; grants nothing by itself in database mode)? */
export const isDesignatedOwnerEmail = (email) => { const e = normalizeOwnerEmail(email); return !!e && OWNER_EMAILS.includes(e); };

/** Does this address currently hold usable owner privilege? Database mode: active verified membership. Legacy mode: designated list. */
export const isOwnerEmail = (email) => {
  const e = normalizeOwnerEmail(email);
  if (!e) return false;
  const snap = snapshotProvider();
  return snap ? snap.owners.has(e) : OWNER_EMAILS.includes(e);
};

export const isMainOwnerEmail = (email) => !!email && normalizeOwnerEmail(email) === MAIN_OWNER_EMAIL;

const idOf = (user) => { const v = user?.id ?? user?._id; return v === undefined || v === null ? "" : String(v); };

// A user is an owner if its email holds owner privilege AND (database mode) the row is the very identity the membership
// was granted to: a different user id carrying the same address (or an address that was changed) gets nothing.
export const isOwnerUser = (user) => {
  const e = normalizeOwnerEmail(user?.email);
  if (!e) return false;
  const snap = snapshotProvider();
  if (!snap) return OWNER_EMAILS.includes(e);
  const bound = snap.owners.get(e);
  if (bound === undefined) return false;
  const id = idOf(user);
  return !id || id === bound;
};

/** Addresses that must never be created by public sign-up: designated + current owners + pending invitations. */
export const isReservedOwnerEmail = (email) => {
  const e = normalizeOwnerEmail(email);
  if (!e) return false;
  if (OWNER_EMAILS.includes(e)) return true;
  const snap = snapshotProvider();
  return !!snap && (snap.active.has(e) || snap.pending.has(e));
};

// STAGE 5A (Gate A): an owner identity is only honoured when the mailbox was actually verified. The owner is
// provisioned out of band (backend/seed.js writes email_verified=true); a row that merely carries an owner email
// (for example one created by public sign-up before this gate existed) must not receive owner privilege.
// Strict `=== true`: truthy strings/numbers are not verification.
export const isUnverifiedOwner = (user) => {
  const e = normalizeOwnerEmail(user?.email);
  if (!e || user?.emailVerified === true) return false;
  if (OWNER_EMAILS.includes(e)) return true; // designated address: never honoured unverified (Stage 5A, unchanged)
  const snap = snapshotProvider();
  return !!snap && snap.active.has(e); // STAGE 5B: an active-membership address whose row lost its verification
};

export const OWNER_IDENTITY_UNVERIFIED_CODE = "OWNER_IDENTITY_UNVERIFIED";
export const OWNER_IDENTITY_UNVERIFIED_RESPONSE = Object.freeze({
  success: false,
  code: OWNER_IDENTITY_UNVERIFIED_CODE,
  retryable: false,
  message:
    "The platform-owner account is not verified. Use \"Resend verification email\" for the owner address and open the link, or follow the approved owner-recovery runbook (runbooks/identity-staging/01_OWNER_RECOVERY_GATE.md); then sign in again.",
});
