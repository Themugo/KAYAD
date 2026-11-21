import crypto from "crypto";

// AES-256-GCM for dealer payment credentials. Fails closed: no key configured = no encryption = no storage.
const keyFromEnv = () => {
  const raw = process.env.PAYMENT_ACCOUNT_ENCRYPTION_KEY || "";
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw Object.assign(new Error("PAYMENT_ACCOUNT_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64)"), { status: 503, code: "ENCRYPTION_NOT_CONFIGURED" });
  }
  return buf;
};

export function encryptJson(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFromEnv(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(obj), "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${enc.toString("base64")}`;
}

export function decryptJson(token) {
  const [v, iv, tag, data] = String(token || "").split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Invalid encrypted payload");
  const d = crypto.createDecipheriv("aes-256-gcm", keyFromEnv(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8"));
}
