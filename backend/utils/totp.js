// Phase 16 - RFC 6238 TOTP (HMAC-SHA1, 6 digits, 30 s) built on node:crypto. No third-party dependency; verified against the RFC test vectors.
import crypto from "node:crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const base32Encode = (buf) => {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
};
export const base32Decode = (str) => {
  const clean = String(str || "").toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0, value = 0; const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error("invalid base32");
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
};

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;
export const generateSecret = (bytes = 20) => base32Encode(crypto.randomBytes(bytes));

export function hotp(secretBuf, counter, digits = TOTP_DIGITS) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", secretBuf).update(msg).digest();
  const off = h[h.length - 1] & 0xf;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}
export const stepAt = (nowMs = Date.now()) => Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
export const totpAt = (secretBase32, nowMs = Date.now(), digits = TOTP_DIGITS) => hotp(base32Decode(secretBase32), stepAt(nowMs), digits);

/** Returns the matching time step (so the caller can reject replays), or null. Accepts +/- `window` steps of clock drift. */
export function verifyTotp(secretBase32, code, { nowMs = Date.now(), window = 1 } = {}) {
  const c = String(code ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  const secret = base32Decode(secretBase32);
  const cur = stepAt(nowMs);
  const want = Buffer.from(c);
  let hit = null;
  for (let s = Math.max(0, cur - window); s <= cur + window; s++) { // constant-time compare for every candidate; no early exit
    const cand = Buffer.from(hotp(secret, s));
    if (crypto.timingSafeEqual(cand, want) && hit === null) hit = s;
  }
  return hit;
}

export const otpauthUri = ({ secret, account, issuer = "KAYAD KE" }) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
