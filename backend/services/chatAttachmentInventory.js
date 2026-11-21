// Legacy chat-attachment inventory (pure functions; no network, no database).
//
// Classifies every attachment entry persisted in chats.messages[].attachments and cross-references the Cloudinary public
// ids with the ones used by vehicle listings (cars.images), so that a later, asset-specific migration never touches an
// asset that another feature still serves publicly. Used by backend/scripts/chat-attachment-inventory.mjs.
//
// Classes:
//   reference              new-style { uploadId } entry: already private + server-authorised (nothing to do)
//   legacy_public_chat     https://res.cloudinary.com/<cloud>/image/upload/.../kayad/chat/<id>  -> migration candidate
//   legacy_authenticated   .../image/authenticated/s--sig--/...  (signed, permanent URL; asset already private-type)
//   legacy_public_other    public Cloudinary asset OUTSIDE kayad/chat (e.g. a vehicle photo pasted into chat) -> never migrate
//   legacy_external        any other https URL (not ours)                                                   -> never migrate
//   legacy_unsafe          non-https / javascript: / data: / malformed (already hidden by presentAttachments)
const CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/(upload|authenticated|private)\/(.*)$/i;
const TRANSFORM_OR_SIG = /^(?:s--[^/]+--|v\d+|[a-z]{1,3}_[^/]*)$/i;

/** Extract { cloud, deliveryType, publicId } from a Cloudinary delivery URL (version/transform/signature segments removed). */
export const parseCloudinaryUrl = (url) => {
  const m = CLOUDINARY.exec(String(url || "").split("?")[0]);
  if (!m) return null;
  const segs = m[3].split("/");
  while (segs.length > 1 && TRANSFORM_OR_SIG.test(segs[0])) segs.shift();
  const publicId = segs.join("/").replace(/\.[a-z0-9]{2,5}$/i, "");
  return { cloud: m[1], deliveryType: m[2].toLowerCase(), publicId };
};

const urlOf = (att) => (typeof att === "string" ? att : att && typeof att === "object" ? att.url : null);

export const classifyAttachment = (att) => {
  if (att && typeof att === "object" && typeof att.uploadId === "string") return { class: "reference", uploadId: att.uploadId };
  const url = urlOf(att);
  if (typeof url !== "string") return { class: "legacy_unsafe" };
  let u;
  try { u = new URL(url); } catch { return { class: "legacy_unsafe" }; }
  if (u.protocol !== "https:") return { class: "legacy_unsafe" };
  const c = parseCloudinaryUrl(url);
  if (!c) return { class: "legacy_external", host: u.host };
  if (c.deliveryType !== "upload") return { class: "legacy_authenticated", publicId: c.publicId, cloud: c.cloud };
  if (/^kayad\/chat\//.test(c.publicId)) return { class: "legacy_public_chat", publicId: c.publicId, cloud: c.cloud };
  return { class: "legacy_public_other", publicId: c.publicId, cloud: c.cloud };
};

/** Collect Cloudinary public ids referenced by vehicle listings (cars.images is jsonb: strings or {url|secure_url|public_id}). */
export const vehiclePublicIds = (cars) => {
  const ids = new Set();
  for (const car of cars || []) {
    for (const img of Array.isArray(car?.images) ? car.images : []) {
      const url = typeof img === "string" ? img : img?.secure_url || img?.url;
      const parsed = url ? parseCloudinaryUrl(url) : null;
      if (parsed) ids.add(parsed.publicId);
      if (img && typeof img === "object" && typeof img.public_id === "string") ids.add(img.public_id);
    }
  }
  return ids;
};

/**
 * Build the inventory. Returns counts, the migration candidate list (public chat assets not shared with any vehicle) and
 * the exclusions with reasons. Message text is never copied into the inventory.
 */
export const buildInventory = (chats, cars = []) => {
  const shared = vehiclePublicIds(cars);
  const counts = {};
  const assets = new Map(); // publicId -> { publicId, cloud, class, chats:Set, messages }
  for (const chat of chats || []) {
    for (const msg of Array.isArray(chat?.messages) ? chat.messages : []) {
      for (const att of Array.isArray(msg?.attachments) ? msg.attachments : []) {
        const c = classifyAttachment(att);
        counts[c.class] = (counts[c.class] || 0) + 1;
        if (!c.publicId) continue;
        const a = assets.get(c.publicId) || { publicId: c.publicId, cloud: c.cloud, class: c.class, chats: new Set(), messages: 0 };
        a.chats.add(chat.id); a.messages += 1; assets.set(c.publicId, a);
      }
    }
  }
  const candidates = [], excluded = [];
  for (const a of assets.values()) {
    const entry = { publicId: a.publicId, cloud: a.cloud, chats: a.chats.size, messages: a.messages };
    if (a.class !== "legacy_public_chat") excluded.push({ ...entry, reason: a.class });
    else if (shared.has(a.publicId)) excluded.push({ ...entry, reason: "shared_with_vehicle_listing" });
    else candidates.push(entry);
  }
  candidates.sort((x, y) => x.publicId.localeCompare(y.publicId));
  excluded.sort((x, y) => x.publicId.localeCompare(y.publicId));
  return { counts, assets: assets.size, candidates, excluded };
};
