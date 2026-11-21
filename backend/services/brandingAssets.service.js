// Built-in storage for the platform logo, used when the external image host (Cloudinary) is not configured or refuses the upload.
// WHY: the logo upload used to depend entirely on Cloudinary credentials. Without them every upload ended in an error, the control looked
// dead, and no logo could ever be set. Storage here is the established key/value control plane (public.system_settings, no schema change):
// the validated bytes are kept, served from a public cache-friendly URL, and the saved branding references that URL.
import crypto from "crypto";
import { getSupabase } from "../utils/supabase.js";
import { uploadImage } from "../config/cloudinary.js";
import { isAllowedLogoUrl } from "../utils/brandingValidation.js";
import { logWarn } from "../utils/logger.js";

export const LOGO_ASSET_KEY = "branding_logo_assets";
export const MAX_BUILTIN_LOGO_BYTES = 1024 * 1024; // keep the settings row small; larger files need the external image host
const KEEP = 6; // current + recent logos, so a saved design or rollback that references an earlier logo still renders
const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

export class LogoStorageError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}

export const logoUrlFor = (hash, ext) => `/api/admin/public/logo/${hash}.${ext}`;
export const LOGO_URL_PATTERN = /^\/api\/admin\/public\/logo\/[0-9a-f]{16}\.(png|jpg|webp)$/;

const readItems = async () => {
  const { data, error } = await getSupabase().from("system_settings").select("value").eq("key", LOGO_ASSET_KEY).maybeSingle();
  if (error) throw new LogoStorageError("LOGO_STORAGE_UNAVAILABLE", "The logo store could not be read.", 503);
  return Array.isArray(data?.value?.items) ? data.value.items : [];
};

/** Store validated bytes. The caller has already checked the file signature (upload middleware); size and type are re-checked here. */
export async function storeLogo({ buffer, mimetype }, actorId = null) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new LogoStorageError("LOGO_FILE_EMPTY", "The uploaded file is empty.");
  const ext = EXT[mimetype];
  if (!ext) throw new LogoStorageError("LOGO_TYPE_UNSUPPORTED", "Logo must be a PNG, JPEG or WebP image.");
  if (buffer.length > MAX_BUILTIN_LOGO_BYTES) {
    throw new LogoStorageError("LOGO_TOO_LARGE_FOR_BUILTIN_STORAGE", "Logo must be 1 MB or smaller. Export a smaller PNG or WebP, or ask the platform owner to connect the image host.", 413);
  }
  const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const items = (await readItems()).filter((i) => i.hash !== hash);
  items.unshift({ hash, ext, mime: mimetype, size: buffer.length, b64: buffer.toString("base64"), uploadedAt: new Date().toISOString(), uploadedBy: actorId });
  const value = { items: items.slice(0, KEEP) };
  const sb = getSupabase();
  const { error } = await sb.from("system_settings").upsert({ key: LOGO_ASSET_KEY, value, description: "Built-in platform logo files (served at /api/admin/public/logo/)", updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new LogoStorageError("LOGO_STORAGE_UNAVAILABLE", "The logo could not be saved. Nothing was changed.", 503);
  return { url: logoUrlFor(hash, ext), hash, size: buffer.length, storage: "database" };
}

/** @returns {{buffer:Buffer,mime:string}|null} */
export async function readLogo(file) {
  const m = /^([0-9a-f]{16})\.(png|jpg|webp)$/.exec(String(file || ""));
  if (!m) return null;
  const item = (await readItems()).find((i) => i.hash === m[1] && i.ext === m[2]);
  if (!item || MIME[item.ext] !== item.mime) return null;
  return { buffer: Buffer.from(item.b64, "base64"), mime: item.mime };
}

/**
 * Keep an uploaded logo: the external image host when configured and accepting, otherwise the built-in store.
 * Resolves { url, thumb?, storage } or throws LogoStorageError (nothing is ever half-saved: the caller changes settings only after this resolves).
 */
export async function keepLogoFile(file, actorId = null) {
  const externalConfigured = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  if (externalConfigured) {
    try {
      const up = await uploadImage(file, "kayad/branding", { generateVariants: true, preserveOriginal: true });
      if (up?.url && typeof up.url === "string" && isAllowedLogoUrl(up.url)) return { url: up.url, thumb: up.thumb, storage: "external" };
      logWarn("Logo host returned an unusable URL; using built-in storage", { code: "LOGO_UPLOAD_INVALID_RESPONSE" });
    } catch (err) {
      // Provider text is not echoed (may carry account details).
      logWarn("Logo upload to image host failed; using built-in storage", { code: "LOGO_UPLOAD_FAILED", error: err?.message });
    }
  }
  try {
    const stored = await storeLogo({ buffer: file.buffer, mimetype: file.mimetype }, actorId);
    return { url: stored.url, storage: stored.storage };
  } catch (err) {
    if (err instanceof LogoStorageError) throw err;
    logWarn("Built-in logo storage failed", { error: err?.message });
    throw new LogoStorageError("LOGO_UPLOAD_FAILED", "The logo could not be stored.", 502);
  }
}
