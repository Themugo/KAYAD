import { z } from "zod";

// A common write-boundary schema for legacy operational routes that have not
// yet been migrated to a dedicated domain schema. Domain controllers continue
// to enforce required fields and business rules. This middleware guarantees a
// bounded JSON object, rejects prototype-pollution keys and malformed nested
// values, and validates route parameters before any mutation handler runs.
const payloadSchema = z.record(z.string(), z.unknown());
const MAX_BODY_BYTES = 256 * 1024;
const MAX_DEPTH = 8;
const MAX_ARRAY_ITEMS = 500;
const MAX_STRING_LENGTH = 20_000;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function inspectValue(value, depth = 0) {
  if (depth > MAX_DEPTH) return "Request payload nesting is too deep";
  if (typeof value === "string" && value.length > MAX_STRING_LENGTH) return "A text field exceeds the maximum length";
  if (typeof value === "number" && !Number.isFinite(value)) return "Numeric values must be finite";
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) return "An array exceeds the maximum number of items";
    for (const item of value) {
      const error = inspectValue(item, depth + 1);
      if (error) return error;
    }
    return null;
  }
  if (value && typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      return "Only plain JSON objects are accepted";
    }
    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key)) return "Payload contains a prohibited property";
      const error = inspectValue(nested, depth + 1);
      if (error) return error;
    }
  }
  return null;
}

export function validateWritePayload(req, res, next) {
  const declaredLength = Number(req.get?.("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return res.status(413).json({ success: false, message: "Request payload is too large" });
  }

  const body = req.body == null ? {} : req.body;
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Request body must be a JSON object" });
  }
  const issue = inspectValue(parsed.data);
  if (issue) return res.status(400).json({ success: false, message: issue });

  for (const [key, value] of Object.entries(req.params || {})) {
    if (typeof value !== "string" || value.length === 0 || value.length > 128 || /[\u0000-\u001f]/.test(value)) {
      return res.status(400).json({ success: false, message: `Invalid route parameter: ${key}` });
    }
  }
  req.body = parsed.data;
  return next();
}

export default validateWritePayload;
