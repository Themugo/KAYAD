// backend/config/owners.js
// ─────────────────────────────────────────────────────────────────────────
// Single source of truth for who the platform OWNERS (webhosts) are.
//
// Owners are identified purely by email (env-driven), never by a database
// flag — so an owner can never be demoted, deleted, or impersonated by
// editing the database. Set WEBHOIST_EMAIL to a comma-separated list to have
// more than one owner identity, e.g.:
//
//   WEBHOIST_EMAIL=jimmythemugo@gmail.com,webhost@kayad.space
//
// Every owner email gets the virtual "webhoist" role (bypasses all checks)
// AND is treated as immutable: other admins/superadmins cannot edit, delete,
// re-role, or change the email of an owner account. Only an owner may modify
// an owner account (and even then the routes block changing an owner's role
// or email away from owner status).
// ─────────────────────────────────────────────────────────────────────────

const parse = (raw) =>
  String(raw || "")
    .split(",")
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);

// Accept WEBHOIST_EMAIL (comma-separated) plus optional WEBHOIST_EMAILS alias.
export const OWNER_EMAILS = Array.from(
  new Set([...parse(process.env.WEBHOIST_EMAIL), ...parse(process.env.WEBHOIST_EMAILS)]),
);

// The first listed owner is the "main" / primary owner — the one that is
// protected most strictly and shown as the platform principal.
export const MAIN_OWNER_EMAIL = OWNER_EMAILS[0] || "";

export const isOwnerEmail = (email) => !!email && OWNER_EMAILS.includes(String(email).toLowerCase().trim());

export const isMainOwnerEmail = (email) => !!email && String(email).toLowerCase().trim() === MAIN_OWNER_EMAIL;

// A user object is an owner if its email matches an owner email.
export const isOwnerUser = (user) => isOwnerEmail(user?.email);

// STAGE 5A (Gate A): an owner identity is only honoured when the mailbox was actually verified. The owner is
// provisioned out of band (backend/seed.js writes email_verified=true); a row that merely carries an owner email
// (for example one created by public sign-up before this gate existed) must not receive owner privilege.
// Strict `=== true`: truthy strings/numbers are not verification.
export const isUnverifiedOwner = (user) => isOwnerEmail(user?.email) && user?.emailVerified !== true;

export const OWNER_IDENTITY_UNVERIFIED_CODE = "OWNER_IDENTITY_UNVERIFIED";
export const OWNER_IDENTITY_UNVERIFIED_RESPONSE = Object.freeze({
  success: false,
  code: OWNER_IDENTITY_UNVERIFIED_CODE,
  retryable: false,
  message:
    "The platform-owner account is not verified. Use \"Resend verification email\" for the owner address and open the link, or follow the approved owner-recovery runbook (runbooks/identity-staging/01_OWNER_RECOVERY_GATE.md); then sign in again.",
});
