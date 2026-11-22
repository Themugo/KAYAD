// Exactly-once listing creation. The DATABASE is the authority (cars.creation_idempotency_key + uq_cars_owner_creation_key and, for
// subscription dealers, kayad_create_dealer_listing_atomic). This module only derives the owner-scoped key and a canonical request hash,
// and classifies what an existing listing with that key means for the new request.
import crypto from "node:crypto";

// Opaque client token. Printable, no whitespace, bounded: it is stored and indexed.
export const LISTING_IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:\-]{8,200}$/;

const canonical = (v) => {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])]));
  return v;
};

/**
 * @returns {null | { key: string, hash: string } | { error: string }}
 * null = the client sent no key (behaviour unchanged: every submission is a new listing).
 * The hash covers everything the client controls: the text fields and a fingerprint of each uploaded file. It is taken from the
 * request as received, before the server adds derived fields, so a retry of the same submission hashes identically.
 */
export function readListingIdempotency(req) {
  const raw = req.get?.("Idempotency-Key");
  if (raw === undefined || raw === null || raw === "") return null;
  const key = String(raw).trim();
  if (!LISTING_IDEMPOTENCY_KEY_PATTERN.test(key)) return { error: "Idempotency-Key must be 8 to 200 characters: letters, digits, '.', '_', ':' or '-'." };
  const files = (Array.isArray(req.files) ? req.files : []).map((f) => [f.originalname || "", f.mimetype || "", f.size || 0]);
  const hash = crypto.createHash("sha256").update(JSON.stringify(canonical({ body: req.body || {}, files }))).digest("hex");
  return { key, hash };
}

/** What an existing listing created under the same owner and key means for this request. */
export function classifyReplay(existing, idem) {
  if (!existing) return "new";
  if (existing.creationRequestHash !== idem.hash && existing.creation_request_hash !== idem.hash) return "conflict";
  if (existing.deletedAt || existing.deleted_at) return "gone";
  return "replay";
}

export const isCreationKeyUniqueViolation = (err) =>
  String(err?.code || "") === "23505" && /uq_cars_owner_creation_key|creation_idempotency_key/i.test(String(err?.message || err?.details || ""));
export const isKeyReusedError = (err) => /IDEMPOTENCY_KEY_REUSED/.test(String(err?.message || ""));
