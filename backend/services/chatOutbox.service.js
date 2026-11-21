// Durable delivery of chat-message side effects (see supabase/migrations/20261011100000_chat_message_outbox.sql).
//
// The message row in chats.messages stays authoritative. An outbox row (ids only) is committed atomically with it. The
// request path delivers inline (fast path) and marks the event done; this reconciler delivers any event whose inline
// attempt never completed (process crash/restart, transient notification failure) with retry + backoff.
// Delivery is at-least-once and every step is idempotent: the realtime event carries the stable message id, and the
// recipient notification is skipped when one for (recipient, message id) already exists.
import { findById } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import { getIO } from "../utils/io.js";
import { presentAttachments } from "./chatAttachments.js";
import { logError, logWarn } from "../infrastructure/logging/index.js";

const MISSING_FN = /PGRST202|42883|Could not find the function/i;
let disabledReason = null; // set when the DB has not been migrated yet (old schema): inline delivery keeps working.

const rpc = async (name, args) => {
  const { data, error } = await getSupabase().rpc(name, args);
  if (error) {
    if (MISSING_FN.test(`${error.code || ""} ${error.message || ""}`)) disabledReason = `${name} missing`;
    throw error;
  }
  return data;
};

/** The exact realtime contract used since before the outbox: newMessage { id, chatId, sender, text, message, createdAt, seen, seenBy, attachments }. */
export const buildNewMessageEvent = (chatId, m) => ({
  id: m.id, chatId, sender: m.sender, text: m.text, message: m.text, createdAt: m.createdAt,
  seen: false, seenBy: [], attachments: presentAttachments(chatId, m.attachments),
});

export const markChatOutboxResult = async (eventId, ok, error = null) => {
  if (disabledReason) return false;
  try { await rpc("kayad_finish_chat_outbox", { p_event_id: eventId, p_ok: ok, p_error: error ? String(error.message || error) : null }); return true; }
  catch (e) { logWarn("chat outbox finish failed", { eventId, error: e?.message }); return false; }
};

/** Deliver one event. Throws on any failure so the caller records a retry. Safe to run more than once. */
export const deliverChatOutboxEvent = async (row, { find = findById, io = getIO, notify, exists } = {}) => {
  const chat = await find("chats", row.chat_id);
  if (!chat) return "skipped:chat-gone";
  const message = (Array.isArray(chat.messages) ? chat.messages : []).find((m) => m?.id === row.event_id);
  if (!message) return "skipped:message-gone"; // deleted by moderation: nothing to deliver
  const recipients = (chat.participants || []).map(String).filter((p) => p !== String(row.sender_id));
  const bus = io();
  if (bus) bus.to(`chat_${row.chat_id}`).emit("newMessage", buildNewMessageEvent(row.chat_id, message));
  for (const userId of recipients) {
    if (await exists(userId, message.id)) continue; // already notified before the crash
    const created = await notify({
      userId, title: "New message", message: message.text, type: "chat", link: "/?nav=chat",
      data: { chatId: row.chat_id, messageId: message.id },
    });
    if (!created) throw new Error("notification was not created");
  }
  return "delivered";
};

export const runChatOutboxOnce = async ({ limit = 20, leaseSeconds = 60, minAgeSeconds = 30, deps = {} } = {}) => {
  if (disabledReason) return { claimed: 0, delivered: 0, failed: 0, disabled: disabledReason };
  const { sendNotification } = await import("./notification.service.js");
  const notify = deps.notify || sendNotification;
  const exists = deps.exists || (async (userId, messageId) => Boolean(await rpc("kayad_chat_notification_exists", { p_user_id: userId, p_message_id: messageId })));
  const rows = await rpc("kayad_claim_chat_outbox", { p_limit: limit, p_lease_seconds: leaseSeconds, p_min_age_seconds: minAgeSeconds });
  let delivered = 0, failed = 0;
  for (const row of rows || []) {
    try { await deliverChatOutboxEvent(row, { ...deps, notify, exists }); await markChatOutboxResult(row.event_id, true); delivered++; }
    catch (e) { failed++; logError("chat outbox delivery failed", { eventId: row.event_id, attempt: row.attempts, error: e?.message }); await markChatOutboxResult(row.event_id, false, e); }
  }
  return { claimed: (rows || []).length, delivered, failed };
};

export const getChatOutboxStats = async () => rpc("kayad_chat_outbox_stats", {});

export const startChatOutboxWorker = ({ intervalMs = 15000, minAgeSeconds = 30 } = {}) => {
  if (process.env.CHAT_OUTBOX_WORKER === "off") return { stop() {} };
  let running = false, ticks = 0;
  const tick = async () => {
    if (running) return; running = true;
    try {
      const r = await runChatOutboxOnce({ minAgeSeconds });
      if (r.disabled) { logWarn("chat outbox worker idle: schema not migrated", { reason: r.disabled }); return; }
      if (++ticks % 20 === 1) { // ~every 5 minutes: surface backlog and dead letters for alerting
        const st = await getChatOutboxStats();
        if (st.dead > 0 || st.oldestUndeliveredSeconds > 300) logWarn("chat outbox backlog", st);
      }
      if (ticks % 240 === 0) await rpc("kayad_purge_chat_outbox", { p_retention_days: 7 });
    } catch (e) { logWarn("chat outbox tick failed", { error: e?.message }); } finally { running = false; }
  };
  const timer = setInterval(tick, intervalMs); timer.unref?.();
  setTimeout(tick, 2000).unref?.();
  return { stop() { clearInterval(timer); }, tick };
};
