// ============================================================
//  PHASE 13I — saved-search notification job (gated, consent-aware, idempotent, auditable).
//
//  Replaces the body of the old 10-minute cron tick. The old tick (a) had no on/off control, (b) matched against EVERY new car
//  including pending / hidden / deleted ones, (c) wrote `saved_searches.last_notified_at`, a column that does not exist (every
//  matching tick failed with 42703 before sending), (d) sent all channels in one call so one user's disabled channel preference
//  threw and aborted the whole run for every other user, and (e) left no durable record of what a run did.
//
//  Safety layers (ALL must pass before any external message can leave the process):
//    1. SAVED_SEARCH_JOB_MODE      off (default) | dry_run | enabled     — anything else is treated as `off`.
//    2. SAVED_SEARCH_EXTERNAL_DELIVERY=enabled                           — otherwise only the in-app channel is used.
//    3. NODE_ENV=test                                                    — external delivery is forced off.
//    4. communication_preferences (existing model)                       — enforced by communicationGateway.deliver().
//    5. communication_event_controls / communication_channel_controls    — fail-closed admin rollout, enforced by the gateway.
//    6. provider credentials                                             — enforced by the gateway.
//  The job introduces NO new preference model and NO schema change: `saved_searches.notify_on_new_match` is the per-search
//  consent, the delivery ledger (`communication_deliveries`) is the dedupe/audit record, `audit_logs` records each run.
//
//  Never touches payment, escrow, bidding, auction or ledger code.
// ============================================================
import crypto from "crypto";
import { findAll, findById } from "../db/index.js";
import { emitCommunication, COMMUNICATION_EVENTS } from "./communicationEvents.service.js";
import { matches } from "./savedSearchMatching.js";
import { acquireLock, releaseLock } from "../middleware/distributedLock.js";
import { auditAfterCommit } from "../utils/auditAfterCommit.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

export const JOB_MODES = Object.freeze(["off", "dry_run", "enabled"]);
export const EXTERNAL_CHANNELS = Object.freeze(["email", "sms", "whatsapp"]);
const LOCK_RESOURCE = "saved-search-notification-job";
const LOCK_TTL_MS = 5 * 60 * 1000;
const CAR_SELECT = "id,title,brand,model,price,year,mileage,fuel,transmission,bodyType,color,city,auctionStatus,allowBid,isVerifiedDealer,createdAt,status,dealer";
const clampInt = (value, min, max, fallback) => {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Pure: resolve the operational gate from an environment object. Absent or invalid values fail SAFE (off / in-app only). */
export const resolveSavedSearchConfig = (env = process.env) => {
  const rawMode = String(env?.SAVED_SEARCH_JOB_MODE ?? "").trim().toLowerCase();
  const modeValid = rawMode === "" || JOB_MODES.includes(rawMode);
  const mode = JOB_MODES.includes(rawMode) ? rawMode : "off";
  const externalRequested = String(env?.SAVED_SEARCH_EXTERNAL_DELIVERY ?? "").trim().toLowerCase() === "enabled";
  const isTestRuntime = String(env?.NODE_ENV ?? "").toLowerCase() === "test";
  return {
    mode,
    modeValid,
    rawMode,
    externalRequested,
    // External delivery needs: job really enabled, explicit external opt-in, and not a test runtime.
    externalDelivery: mode === "enabled" && externalRequested && !isTestRuntime,
    lookbackHours: clampInt(env?.SAVED_SEARCH_LOOKBACK_HOURS, 1, 168, 24),
    maxSearchesPerRun: clampInt(env?.SAVED_SEARCH_MAX_SEARCHES_PER_RUN, 1, 5000, 1000),
    maxMessagesPerRun: clampInt(env?.SAVED_SEARCH_MAX_MESSAGES_PER_RUN, 1, 2000, 200),
  };
};

/** Pure: a listing is eligible for a "new match" notice only if it is publicly listed right now. */
export const isNotifiableListing = (car) =>
  Boolean(car) && String(car.status || "") === "available" && !(car.deletedAt ?? car.deleted_at);

const idList = (value) => (Array.isArray(value) ? value.map(String) : []);
const batchKey = (searchId, carIds) =>
  `ss:${searchId}:${crypto.createHash("sha256").update([...carIds].map(String).sort().join(",")).digest("hex").slice(0, 24)}`;

const recipientBlockedReason = (user) => {
  if (!user) return "recipient_missing";
  if (user.isBanned) return "recipient_banned";
  if (user.deactivatedAt) return "recipient_deactivated";
  if (String(user.status || "") === "suspended") return "recipient_suspended";
  return null;
};

/** Build the (searchId -> already-notified car ids) map from the delivery ledger (in-app rows are always recorded). */
const loadNotifiedMap = async (since, deps) => {
  const rows = await deps.findAll("communication_deliveries", {
    filters: { eventType: COMMUNICATION_EVENTS.SAVED_SEARCH_MATCH, channel: "in_app", createdAt: { $gte: since } },
    select: "metadata,createdAt",
    limit: 10000,
  });
  const map = new Map();
  for (const row of rows) {
    const md = row?.metadata || {};
    if (!md.savedSearchId) continue;
    const set = map.get(String(md.savedSearchId)) || new Set();
    for (const id of idList(md.carIds)) set.add(id);
    map.set(String(md.savedSearchId), set);
  }
  return map;
};

const classify = (error) => (/is disabled for/i.test(String(error?.message || "")) ? "skipped_preference" : "failed");

/**
 * Run one pass. `deps` allows controlled test doubles (emit, findAll, findById, lock, audit, now). With mode=dry_run or off
 * the injected/real `emit` is never called.
 */
export const runSavedSearchNotificationJob = async ({ env = process.env, deps: injected = {} } = {}) => {
  const deps = {
    emit: emitCommunication, findAll, findById, audit: auditAfterCommit,
    acquireLock, releaseLock, now: () => Date.now(), ...injected,
  };
  const cfg = resolveSavedSearchConfig(env);
  const summary = {
    runId: crypto.randomUUID(), mode: cfg.mode, externalDelivery: cfg.externalDelivery, startedAt: new Date(deps.now()).toISOString(),
    searchesConsidered: 0, candidateListings: 0, searchesMatched: 0, notificationsPlanned: 0,
    delivered: 0, skippedPreference: 0, suppressed: 0, failed: 0, skippedRecipient: 0, deduplicated: 0,
    truncated: false, lockSkipped: false, errors: [],
  };
  if (cfg.mode === "off") { summary.finishedAt = new Date(deps.now()).toISOString(); return summary; }

  let lock = null;
  try {
    lock = await deps.acquireLock(LOCK_RESOURCE, LOCK_TTL_MS);
    if (!lock?.acquired) { summary.lockSkipped = true; summary.finishedAt = new Date(deps.now()).toISOString(); return summary; }
  } catch (error) {
    // Fail closed: without the cross-instance lock two instances could both notify. Nothing is sent.
    summary.lockSkipped = true; summary.errors.push(`lock_unavailable: ${error?.message || error}`);
    summary.finishedAt = new Date(deps.now()).toISOString();
    logWarn("SavedSearchJob skipped: lock unavailable", { error: error?.message });
    return summary;
  }

  try {
    const since = new Date(deps.now() - cfg.lookbackHours * 3600 * 1000).toISOString();
    const searches = await deps.findAll("saved_searches", { filters: { notify: true }, orderBy: "createdAt", ascending: true, limit: cfg.maxSearchesPerRun });
    summary.searchesConsidered = searches.length;
    if (searches.length) {
      const candidates = (await deps.findAll("cars", {
        filters: { status: "available", deletedAt: { $exists: false }, createdAt: { $gte: since } }, select: CAR_SELECT, orderBy: "createdAt", ascending: true, limit: 2000,
      })).filter(isNotifiableListing);
      summary.candidateListings = candidates.length;
      if (candidates.length) {
        const notified = await loadNotifiedMap(since, deps);
        const userCache = new Map();
        for (const search of searches) {
          const owner = String(search.user ?? search.userId ?? "");
          if (!owner) continue;
          const already = notified.get(String(search.id)) || new Set();
          const fresh = candidates.filter((c) => String(c.dealer ?? "") !== owner && !already.has(String(c.id)) && matches(c, search.filters));
          const matchedTotal = candidates.filter((c) => matches(c, search.filters)).length;
          if (matchedTotal > fresh.length) summary.deduplicated += matchedTotal - fresh.length;
          if (!fresh.length) continue;
          summary.searchesMatched += 1;
          if (summary.notificationsPlanned >= cfg.maxMessagesPerRun) { summary.truncated = true; break; }
          if (!userCache.has(owner)) userCache.set(owner, await deps.findById("users", owner, "id,status,isBanned,deactivatedAt"));
          const blocked = recipientBlockedReason(userCache.get(owner));
          if (blocked) { summary.skippedRecipient += 1; continue; }
          summary.notificationsPlanned += 1;
          if (cfg.mode === "dry_run") continue; // test mode: planned, never emitted, never written to the delivery ledger

          const carIds = fresh.map((c) => String(c.id));
          const titles = fresh.slice(0, 3).map((c) => c.title || `${c.brand || ""} ${c.year || ""}`.trim()).join(", ");
          const rest = fresh.length > 3 ? ` and ${fresh.length - 3} more` : "";
          const payload = {
            userId: owner, eventType: COMMUNICATION_EVENTS.SAVED_SEARCH_MATCH, category: "marketing",
            title: `New matching vehicles: ${search.name}`, subject: `New vehicles matching ${search.name}`,
            message: `${fresh.length} vehicle${fresh.length > 1 ? "s" : ""} added: ${titles}${rest}. View: https://www.kayad.space/saved-searches`,
            metadata: { savedSearchId: String(search.id), count: fresh.length, carIds: carIds.slice(0, 50), idempotencyKey: batchKey(search.id, carIds), vehicles: fresh.slice(0, 10).map((c) => ({ id: c.id, title: c.title })) },
          };
          // in-app first: it is the ledger entry that deduplicates future runs. Each channel is isolated so one user's disabled
          // channel (the gateway throws) can never abort another channel, another search or another user.
          const channels = ["in_app", ...(cfg.externalDelivery ? EXTERNAL_CHANNELS : [])];
          for (const channel of channels) {
            try {
              const result = await deps.emit({ ...payload, channels: [channel] });
              const row = Array.isArray(result) ? result[0] : result;
              if (row === null || row === undefined || (Array.isArray(result) && result.length === 0)) summary.suppressed += 1;
              else summary.delivered += 1;
            } catch (error) {
              const kind = classify(error);
              if (kind === "skipped_preference") summary.skippedPreference += 1; else { summary.failed += 1; summary.errors.push(`${channel}: ${String(error?.message || error).slice(0, 160)}`); }
            }
          }
        }
      }
    }
  } catch (error) {
    summary.failed += 1; summary.errors.push(String(error?.message || error).slice(0, 200));
    logError("SavedSearchJob run failed", error);
  } finally {
    try { await deps.releaseLock(LOCK_RESOURCE, lock.id); } catch (e) { logWarn("SavedSearchJob lock release failed", { error: e?.message }); }
  }
  summary.finishedAt = new Date(deps.now()).toISOString();
  summary.errors = summary.errors.slice(0, 20);
  if (summary.notificationsPlanned > 0 || summary.failed > 0) {
    await deps.audit({ action: "Saved-search job run", admin: "system:saved-search-job", details: { ...summary } });
  }
  logInfo("SavedSearchJob run complete", { runId: summary.runId, mode: summary.mode, planned: summary.notificationsPlanned, delivered: summary.delivered, failed: summary.failed });
  return summary;
};
