// Saved public-site designs: draft CRUD (compare-and-swap on revision), publish, history, rollback.
// Publishing applies a validated snapshot to the EXISTING platform config (the source every public page already reads), then records
// the publication. If recording fails the config is restored, so "live" and "history" cannot silently diverge.
import { getSupabase } from "../utils/supabase.js";
import PlatformConfig from "../models/PlatformConfig.js";
import { auditAfterCommit } from "../utils/auditAfterCommit.js";
import { validateDesign, validateName, validateDescription, extractLive, applyDesignToConfig, designHash, STARTERS } from "../utils/siteDesign.js";

const fail = (status, code, message, extra = {}) => Object.assign(new Error(message), { status, code, ...extra });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const assertId = (id) => { if (!UUID.test(String(id))) throw fail(400, "DESIGN_ID_INVALID", "Invalid design id."); };
const db = () => getSupabase();
const check = ({ data, error }, what) => {
  if (error) {
    if (error.code === "23505") throw fail(409, "DESIGN_NAME_TAKEN", "Another design already uses that name.");
    throw fail(500, "DESIGN_STORE_ERROR", `Could not ${what}.`, { cause: error.message });
  }
  return data;
};
const view = (r, pub) => ({
  id: r.id, name: r.name, description: r.description, revision: r.revision, config: r.config,
  createdAt: r.created_at, updatedAt: r.updated_at,
  isPublished: !!pub && pub.design_id === r.id,
  hasUnpublishedChanges: !!pub && pub.design_id === r.id && designHash(r.config) !== designHash(pub.snapshot),
});
const pubView = (p) => p && ({ id: p.id, designId: p.design_id, designName: p.design_name, kind: p.kind, publishedAt: p.published_at, publishedBy: p.published_by, sourcePublicationId: p.source_publication_id ?? null });

export async function latestPublication() {
  const rows = check(await db().from("site_design_publications").select("*").order("published_at", { ascending: false }).limit(1), "read publication history");
  return rows?.[0] || null;
}
async function liveConfig() { return (await PlatformConfig.findOne()) || new PlatformConfig(); }

export async function getOverview() {
  const [designs, pub, cfg] = [check(await db().from("site_designs").select("*").order("updated_at", { ascending: false }), "list designs"), await latestPublication(), await liveConfig()];
  const live = extractLive(cfg);
  return {
    designs: designs.map((d) => { const v = view(d, pub); delete v.config; return v; }),
    starters: STARTERS.map(({ id, name, description }) => ({ id, name, description })),
    published: pub ? { ...pubView(pub), liveMatchesPublication: designHash(live) === designHash(pub.snapshot) } : null,
    live,
  };
}

export async function getDesign(id) {
  assertId(id);
  const rows = check(await db().from("site_designs").select("*").eq("id", id).limit(1), "read the design");
  if (!rows?.[0]) throw fail(404, "DESIGN_NOT_FOUND", "Design not found.");
  return view(rows[0], await latestPublication());
}

export async function createDesign({ name, description = "", from, userId }) {
  if (!validateName(name)) throw fail(400, "DESIGN_NAME_INVALID", "Name must be 1-80 characters without < or >.");
  if (!validateDescription(description)) throw fail(400, "DESIGN_DESCRIPTION_INVALID", "Description must be at most 300 characters without < or >.");
  let base;
  if (!from || from.type === "current") base = extractLive(await liveConfig());
  else if (from.type === "starter") { const s = STARTERS.find((x) => x.id === from.id); if (!s) throw fail(400, "STARTER_UNKNOWN", "Unknown starter design."); base = s.config; }
  else if (from.type === "design") base = (await getDesign(from.id)).config;
  else throw fail(400, "DESIGN_SOURCE_INVALID", "Create from current, a starter, or an existing design.");
  const checked = validateDesign(base);
  if (!checked.ok) throw fail(422, "DESIGN_SOURCE_INVALID", "The source settings are not a valid design.", { errors: checked.errors });
  const row = check(await db().from("site_designs").insert({ name: name.trim(), description, config: checked.value, created_by: userId, updated_by: userId }).select().single(), "create the design");
  return view(row, await latestPublication());
}

export async function saveDesign(id, { expectedRevision, config, name, description, userId }) {
  assertId(id);
  if (!Number.isInteger(expectedRevision)) throw fail(400, "EXPECTED_REVISION_REQUIRED", "expectedRevision is required.");
  const patch = { updated_by: userId, updated_at: new Date().toISOString(), revision: expectedRevision + 1 };
  if (config !== undefined) { const c = validateDesign(config); if (!c.ok) throw fail(422, "DESIGN_INVALID", "The design has invalid settings.", { errors: c.errors }); patch.config = c.value; }
  if (name !== undefined) { if (!validateName(name)) throw fail(400, "DESIGN_NAME_INVALID", "Name must be 1-80 characters without < or >."); patch.name = name.trim(); }
  if (description !== undefined) { if (!validateDescription(description)) throw fail(400, "DESIGN_DESCRIPTION_INVALID", "Description must be at most 300 characters."); patch.description = description; }
  const rows = check(await db().from("site_designs").update(patch).eq("id", id).eq("revision", expectedRevision).select(), "save the design");
  if (!rows?.length) {
    const exists = check(await db().from("site_designs").select("id").eq("id", id).limit(1), "read the design");
    if (!exists?.length) throw fail(404, "DESIGN_NOT_FOUND", "Design not found.");
    throw fail(409, "DESIGN_REVISION_CONFLICT", "This design was changed elsewhere. Reload it before saving.");
  }
  return view(rows[0], await latestPublication());
}

export async function duplicateDesign(id, { name, userId }) {
  const src = await getDesign(id);
  let candidate = name?.trim() || `${src.name} (copy)`;
  return createDesign({ name: candidate, description: src.description, from: { type: "design", id }, userId });
}

export async function deleteDesign(id) {
  assertId(id);
  const d = await getDesign(id);
  if (d.isPublished) throw fail(409, "DESIGN_IS_PUBLISHED", "This design is the one currently live. Publish a different design first.");
  check(await db().from("site_designs").delete().eq("id", id), "delete the design");
  return { id, name: d.name };
}

async function applyAndRecord({ design, kind, designId, designName, sourcePublicationId, userId, admin }) {
  const cfg = await liveConfig();
  const previous = extractLive(cfg);
  const before = { branding: cfg.branding, fontDisplay: cfg.fontDisplay, fontBody: cfg.fontBody, heroPresentation: cfg.heroPresentation };
  applyDesignToConfig(cfg, design);
  await cfg.save();
  let pub;
  try {
    pub = check(await db().from("site_design_publications").insert({ design_id: designId, design_name: designName, kind, snapshot: design, previous_snapshot: previous, source_publication_id: sourcePublicationId ?? null, published_by: userId }).select().single(), "record the publication");
  } catch (e) {
    Object.assign(cfg, before); // restore: the site must not show a design that history does not know about
    try { await cfg.save(); } catch { /* surfaced below */ }
    throw fail(500, "PUBLISH_NOT_RECORDED", "The design could not be recorded, so the live site was left unchanged.", { cause: e.message });
  }
  await auditAfterCommit({ action: kind === "rollback" ? "Public site design rolled back" : "Public site design published", admin: admin?.name || admin?.email, adminId: userId, details: { designId, designName, publicationId: pub.id, sourcePublicationId: sourcePublicationId ?? null } });
  return pubView(pub);
}

export async function publishDesign(id, { expectedRevision, userId, admin }) {
  const d = await getDesign(id);
  if (Number.isInteger(expectedRevision) && expectedRevision !== d.revision) throw fail(409, "DESIGN_REVISION_CONFLICT", "The design changed since you reviewed it. Reload and review before publishing.");
  const c = validateDesign(d.config);
  if (!c.ok) throw fail(422, "DESIGN_INVALID", "The design has invalid settings and cannot be published.", { errors: c.errors });
  return applyAndRecord({ design: c.value, kind: "publish", designId: d.id, designName: d.name, userId, admin });
}

export async function listHistory(limit = 30) {
  const rows = check(await db().from("site_design_publications").select("id,design_id,design_name,kind,published_at,published_by,source_publication_id").order("published_at", { ascending: false }).limit(Math.min(100, Math.max(1, Number(limit) || 30))), "read publication history");
  return rows.map(pubView);
}

export async function rollbackTo(publicationId, { userId, admin }) {
  assertId(publicationId);
  const rows = check(await db().from("site_design_publications").select("*").eq("id", publicationId).limit(1), "read the publication");
  const p = rows?.[0];
  if (!p) throw fail(404, "PUBLICATION_NOT_FOUND", "That publication was not found.");
  const latest = await latestPublication();
  if (latest?.id === p.id) throw fail(409, "ALREADY_LIVE", "That version is already live.");
  const c = validateDesign(p.snapshot);
  if (!c.ok) throw fail(422, "SNAPSHOT_INVALID", "That version can no longer be restored because it contains settings that are no longer supported.", { errors: c.errors });
  return applyAndRecord({ design: c.value, kind: "rollback", designId: p.design_id, designName: p.design_name, sourcePublicationId: p.id, userId, admin });
}
