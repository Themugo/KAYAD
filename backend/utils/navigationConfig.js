// ============================================================
// KAYAD navigation authority (Stage 14A).
//
// The navigation DESIGN and DESTINATIONS are code-owned
// (src/components/navigation/navConfig.ts). The admin controls only
// PRESENTATION STATE of destinations that already exist:
//   - primary item visible / hidden
//   - primary item order
//   - dropdown on / off (off => direct link, children not shown)
//   - child visible / hidden
//   - child order
//
// This registry mirrors the ids in navConfig.ts. scripts/
// validate-navigation-convergence.mjs fails if the two drift.
// It is NOT a route list and creates no destination. It is NOT a
// security boundary either: protected destinations stay gated by
// App.tsx and backend authorization.
// ============================================================

export const NAVIGATION_REGISTRY = Object.freeze({
  marketplace: ["browse", "saved", "financing"],
  auction: ["live", "scheduled", "ended", "saved"],
  inspection: ["request", "providers"],
  escrow: ["journey", "deals", "create"],
  support: [],
});

// Never hideable: discovery and the help path must always exist, so a
// mistaken or hostile config can never produce an empty header.
export const NAVIGATION_LOCKED_VISIBLE = Object.freeze(["marketplace", "support"]);

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Lenient normaliser used for anything read back (public projection) and by
 * the strict validator. Drops unknown ids, duplicates and malformed entries;
 * never throws. Returns { items: [...] } or { items: [] } (= use defaults).
 */
export function normalizeNavigation(raw) {
  const out = [];
  if (!isPlainObject(raw) || !Array.isArray(raw.items)) return { items: out };
  const seen = new Set();
  for (const entry of raw.items) {
    if (!isPlainObject(entry)) continue;
    const id = entry.id;
    if (typeof id !== "string" || !Object.prototype.hasOwnProperty.call(NAVIGATION_REGISTRY, id) || seen.has(id)) continue;
    seen.add(id);
    const locked = NAVIGATION_LOCKED_VISIBLE.includes(id);
    const item = {
      id,
      visible: locked ? true : entry.visible !== false,
    };
    if (NAVIGATION_REGISTRY[id].length > 0) {
      item.dropdown = entry.dropdown !== false;
      const kids = [];
      const seenKids = new Set();
      if (Array.isArray(entry.children)) {
        for (const c of entry.children) {
          if (!isPlainObject(c) || typeof c.id !== "string") continue;
          if (!NAVIGATION_REGISTRY[id].includes(c.id) || seenKids.has(c.id)) continue;
          seenKids.add(c.id);
          kids.push({ id: c.id, visible: c.visible !== false });
        }
      }
      item.children = kids;
    }
    out.push(item);
  }
  return { items: out };
}

/**
 * Strict validator for admin writes. Returns { ok: true, value } or
 * { ok: false, errors: [...] }. The body replaces the stored value whole
 * (an unhide must be expressible), so no shallow merge is involved.
 */
export function validateNavigationInput(raw) {
  const errors = [];
  if (!isPlainObject(raw)) return { ok: false, errors: ["navigation must be an object"] };
  const keys = Object.keys(raw);
  // `{}` / `{ items: [] }` is the "no override" state: it is what an
  // untouched platform_config row stores, so whole-config round-trips from
  // other admin screens (which echo the stored value back) must stay valid.
  if (keys.length === 0 || (keys.length === 1 && Array.isArray(raw.items) && raw.items.length === 0)) {
    return { ok: true, value: { items: [] } };
  }
  for (const k of keys) if (k !== "items") errors.push(`unknown field "${k}"`);
  if (!Array.isArray(raw.items)) {
    errors.push("navigation.items must be an array");
    return { ok: false, errors };
  }
  if (raw.items.length > Object.keys(NAVIGATION_REGISTRY).length) errors.push("too many items");
  const seen = new Set();
  for (const [i, entry] of raw.items.entries()) {
    if (!isPlainObject(entry)) { errors.push(`items[${i}] must be an object`); continue; }
    for (const k of Object.keys(entry)) {
      if (!["id", "visible", "dropdown", "children"].includes(k)) errors.push(`items[${i}]: unknown field "${k}"`);
    }
    const id = entry.id;
    if (typeof id !== "string" || !Object.prototype.hasOwnProperty.call(NAVIGATION_REGISTRY, id)) {
      errors.push(`items[${i}]: unknown id`);
      continue;
    }
    if (seen.has(id)) errors.push(`items[${i}]: duplicate id "${id}"`);
    seen.add(id);
    if (entry.visible !== undefined && typeof entry.visible !== "boolean") errors.push(`${id}.visible must be boolean`);
    if (entry.visible === false && NAVIGATION_LOCKED_VISIBLE.includes(id)) errors.push(`${id} cannot be hidden`);
    if (entry.dropdown !== undefined && typeof entry.dropdown !== "boolean") errors.push(`${id}.dropdown must be boolean`);
    if (entry.children !== undefined) {
      if (!Array.isArray(entry.children)) { errors.push(`${id}.children must be an array`); continue; }
      const seenKids = new Set();
      for (const [j, c] of entry.children.entries()) {
        if (!isPlainObject(c)) { errors.push(`${id}.children[${j}] must be an object`); continue; }
        for (const k of Object.keys(c)) if (!["id", "visible"].includes(k)) errors.push(`${id}.children[${j}]: unknown field "${k}"`);
        if (typeof c.id !== "string" || !NAVIGATION_REGISTRY[id].includes(c.id)) { errors.push(`${id}.children[${j}]: unknown id`); continue; }
        if (seenKids.has(c.id)) errors.push(`${id}.children[${j}]: duplicate id`);
        seenKids.add(c.id);
        if (c.visible !== undefined && typeof c.visible !== "boolean") errors.push(`${id}.${c.id}.visible must be boolean`);
      }
    }
  }
  if (errors.length) return { ok: false, errors };
  const value = normalizeNavigation(raw);
  if (!value.items.some((it) => it.visible)) return { ok: false, errors: ["at least one navigation item must remain visible"] };
  return { ok: true, value };
}
