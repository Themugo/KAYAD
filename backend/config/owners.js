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
  new Set([...parse(process.env.WEBHOIST_EMAIL), ...parse(process.env.WEBHOIST_EMAILS)])
);

// The first listed owner is the "main" / primary owner — the one that is
// protected most strictly and shown as the platform principal.
export const MAIN_OWNER_EMAIL = OWNER_EMAILS[0] || "";

export const isOwnerEmail = (email) =>
  !!email && OWNER_EMAILS.includes(String(email).toLowerCase().trim());

export const isMainOwnerEmail = (email) =>
  !!email && String(email).toLowerCase().trim() === MAIN_OWNER_EMAIL;

// A user object is an owner if its email matches an owner email.
export const isOwnerUser = (user) => isOwnerEmail(user?.email);
