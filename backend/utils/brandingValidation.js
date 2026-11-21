// Server-side validation of the platform branding object (PUT /api/admin/config -> branding, and the logo upload route).
// The browser validates for convenience; this is the authority. A logo URL is rendered into <img src> on every public page, so it
// must be a bundled path, a built-in logo URL or an https URL on the configured image host, never an arbitrary string.
const LOGO_TYPES = ["icon", "text", "image"];
const COLOR = /^(#[0-9A-Fa-f]{6}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\))$/;
const COLOR_FIELDS = ["primaryColor", "primaryLight", "primaryDark", "primaryGlow", "accentColor", "backgroundColor", "surfaceColor", "cardColor", "textColor", "textMutedColor", "textDimColor", "borderColor", "successColor", "dangerColor", "warningColor", "infoColor"];
// Optional surface colours: empty string means "use the built-in look".
const OPTIONAL_COLOR_FIELDS = ["navbarBg", "navbarText", "navbarNavBg", "footerBg", "footerText", "footerAccent"];
const TEXT_LIMITS = { logoText: 40, brandTagline: 80 };

export const isAllowedLogoUrl = (value, env = process.env) => {
  if (value === "" || value == null) return true;
  if (typeof value !== "string" || value.length > 500) return false;
  if (/^\/branding\/[A-Za-z0-9._\-/]+$/.test(value) && !value.includes("..")) return true;
  if (/^\/api\/admin\/public\/logo\/[0-9a-f]{16}\.(png|jpg|webp)$/.test(value)) return true; // built-in logo store (services/brandingAssets.service.js)
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
  if (branding.countryBadgeShow !== undefined && typeof branding.countryBadgeShow !== "boolean") return { ok: false, message: "countryBadgeShow must be true or false." };
  if (branding.countryBadgeText !== undefined && (typeof branding.countryBadgeText !== "string" || !/^[A-Za-z0-9]{1,4}$/.test(branding.countryBadgeText))) return { ok: false, message: "The country badge label must be 1 to 4 letters or digits." };
  for (const k of COLOR_FIELDS) {
    if (branding[k] !== undefined && (typeof branding[k] !== "string" || !COLOR.test(branding[k].trim()))) return { ok: false, message: `${k} must be a hex colour (#RRGGBB) or rgb()/rgba() value.` };
  }
  for (const k of OPTIONAL_COLOR_FIELDS) {
    const v = branding[k];
    if (v !== undefined && v !== "" && (typeof v !== "string" || !COLOR.test(v.trim()))) return { ok: false, message: `${k} must be empty (default) or a hex colour (#RRGGBB) or rgb()/rgba() value.` };
  }
  return { ok: true };
}
