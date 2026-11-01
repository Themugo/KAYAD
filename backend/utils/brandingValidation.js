// Server-side validation of the platform branding object (PUT /api/admin/config -> branding, and the logo upload route).
// The browser validates for convenience; this is the authority. A logo URL is rendered into <img src> on every public page, so it
// must be a bundled path or an https URL on the configured image host, never an arbitrary string.
const LOGO_TYPES = ["icon", "text", "image"];
const COLOR = /^(#[0-9A-Fa-f]{6}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\))$/;
const COLOR_FIELDS = ["primaryColor", "primaryLight", "primaryDark", "primaryGlow", "accentColor", "backgroundColor", "surfaceColor", "cardColor", "textColor", "textMutedColor", "textDimColor", "borderColor", "successColor", "dangerColor", "warningColor", "infoColor"];
const TEXT_LIMITS = { logoText: 40, brandTagline: 80 };

export const isAllowedLogoUrl = (value, env = process.env) => {
  if (value === "" || value == null) return true;
  if (typeof value !== "string" || value.length > 500) return false;
  if (/^\/branding\/[A-Za-z0-9._\-/]+$/.test(value) && !value.includes("..")) return true;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password) return false;
    if (u.hostname !== "res.cloudinary.com") return false;
    // Only this deployment's own cloud when it is configured.
    if (env.CLOUDINARY_CLOUD_NAME && !u.pathname.startsWith(`/${env.CLOUDINARY_CLOUD_NAME}/`)) return false;
    return true;
  } catch { return false; }
};

/** @returns {{ok:true}|{ok:false,message:string}} */
export function validateBranding(branding, env = process.env) {
  if (!branding || typeof branding !== "object" || Array.isArray(branding)) return { ok: false, message: "Invalid branding settings." };
  if (branding.logoType !== undefined && !LOGO_TYPES.includes(branding.logoType)) return { ok: false, message: "Logo type must be icon, text or image." };
  if (branding.logoUrl !== undefined && !isAllowedLogoUrl(branding.logoUrl, env)) return { ok: false, message: "Logo URL must be a bundled /branding/ file or an image uploaded through the platform." };
  for (const [k, max] of Object.entries(TEXT_LIMITS)) {
    if (branding[k] !== undefined && (typeof branding[k] !== "string" || branding[k].length > max)) return { ok: false, message: `${k} must be text of at most ${max} characters.` };
  }
  for (const k of COLOR_FIELDS) {
    if (branding[k] !== undefined && (typeof branding[k] !== "string" || !COLOR.test(branding[k].trim()))) return { ok: false, message: `${k} must be a hex colour (#RRGGBB) or rgb()/rgba() value.` };
  }
  return { ok: true };
}
