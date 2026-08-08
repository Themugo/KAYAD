import { createModel } from "./_base.js";

const IdempotencyKey = createModel("IdempotencyKey");

// middleware/idempotency.js - real, live infrastructure guarding every
// payment/escrow-release/escrow-refund/escrow-confirm/escrow-dispute
// operation in the app - calls 2 static methods that don't exist
// anywhere, same class of gap as Bid/Car/User/RefreshToken this
// session. getCachedResponse's call site (line 193 of that file) is
// NOT wrapped in a try/catch the way most of the rest of that file's
// IdempotencyKey/IdempotencyAuditLog calls are - meaning every single
// request through this middleware would have thrown uncaught before
// even reaching real payment logic. This is very likely the deeper
// root cause behind several of the payment/escrow-flow issues found
// earlier this session.

// Returns the cached response for a given idempotency key, or null if
// none exists or it's expired. 24h TTL matches this file's own
// IDEMPOTENCY_TTL constant, which was defined but never actually
// enforced anywhere before this - added here rather than left as a
// dead constant.
IdempotencyKey.getCachedResponse = async (key) => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const found = await IdempotencyKey.findOne({ key });
  if (!found || !found.createdAt || new Date(found.createdAt) < new Date(cutoff)) return null;
  return found;
};

// Records (or overwrites) the cached response for an idempotency key.
// Used both for the initial "attempted" write and the final response-
// caching write in middleware/idempotency.js, so this needs to work as
// an upsert, not a plain create that would fail on a duplicate key.
IdempotencyKey.record = async (data) => {
  const existing = data.key ? await IdempotencyKey.findOne({ key: data.key }) : null;
  if (existing) return IdempotencyKey.findByIdAndUpdate(existing.id, data);
  return IdempotencyKey.create(data);
};

export default IdempotencyKey;
