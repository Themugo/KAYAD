import { z } from "zod";

// POST /api/leads (manual lead creation by the owning dealer).
// The lead's dealer is ALWAYS the authenticated caller (req.user.id); a client-supplied dealer id is never read and
// unknown keys are stripped by zod. Lengths follow the canonical dealer-platform note contract (1–4000 characters).
const optionalUuid = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.string().uuid("vehicleId must be a UUID").optional(),
);

export const createLeadSchema = z.object({
  buyerId: z.string({ error: "buyerId is required" }).uuid("buyerId must be a UUID"),
  vehicleId: optionalUuid,
  source: z.string({ error: "source is required" }).trim().min(1, "source is required").max(50),
  notes: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().min(1).max(4000).optional(),
  ),
});

export const leadNoteSchema = z.object({
  note: z.string({ error: "note is required" }).trim().min(1, "note is required").max(4000),
});
