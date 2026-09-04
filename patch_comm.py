from pathlib import Path
p=Path('/mnt/data/p4')
# notification controller
(p/'backend/controllers/notificationController.js').write_text(r'''// backend/controllers/notificationController.js
import { findAll, count, create, updateMany, removeMany, findById } from "../db/index.js";
import { getIO } from "../utils/io.js";
import { logError, logInfo } from "../utils/logger.js";

const mapNotification = (n) => ({
  ...n,
  _id: n.id,
  createdAt: n.createdAt || n.created_at,
  read: Boolean(n.read),
});

export const getNotifications = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const offset = (page - 1) * limit;
    const [notifications, total, unread] = await Promise.all([
      findAll("notifications", { filters: { user: req.user.id, }, orderBy: "createdAt", ascending: false, limit, offset }),
      count("notifications", { user: req.user.id }),
      count("notifications", { user: req.user.id, read: false }),
    ]);
    res.json({ success: true, notifications: notifications.map(mapNotification), unreadCount: unread || 0, pagination: { total: total || 0, page, limit, pages: Math.ceil((total || 0) / limit) } });
  } catch (err) {
    logError("getNotifications error:", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

export const createReminder = async (req, res) => {
  try {
    const { type, targetId, remindAt } = req.body;
    const reminder = await create("notifications", {
      user: req.user.id,
      title: "Reminder",
      message: `Reminder for ${type}`,
      type: "info",
      read: false,
      data: { type, targetId, remindAt: remindAt || new Date().toISOString() },
    });
    logInfo("Reminder created", { userId: req.user.id, type, targetId });
    res.status(201).json({ success: true, reminder: mapNotification(reminder) });
  } catch (err) {
    logError("createReminder error:", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to create reminder" });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await findById("notifications", req.params.id);
    if (!notification || String(notification.user) !== String(req.user.id)) return res.status(404).json({ success: false, message: "Notification not found" });
    await updateMany("notifications", { id: req.params.id, user: req.user.id }, { read: true });
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    logError("markAsRead error:", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await updateMany("notifications", { user: req.user.id, read: false }, { read: true });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    logError("markAllAsRead error:", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to mark all notifications as read" });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const notification = await findById("notifications", req.params.id);
    if (!notification || String(notification.user) !== String(req.user.id)) return res.status(404).json({ success: false, message: "Notification not found" });
    await removeMany("notifications", { id: req.params.id, user: req.user.id });
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    logError("deleteNotification error:", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to delete notification" });
  }
};

export const createNotification = async ({ user, title, message, type = "info", data = {}, link }) => {
  try {
    const notif = await create("notifications", { user, title, message, type, read: false, data, link });
    const payload = mapNotification(notif);
    const io = getIO();
    if (io) {
      io.to(`user_${user}`).emit("notification", payload);
      io.to(String(user)).emit("notification", payload);
    }
    return notif;
  } catch (err) {
    logError("Failed to create notification:", { error: err.message, user });
    return null;
  }
};
''')
# notification service
(p/'backend/services/notification.service.js').write_text(r'''import { create, findById } from "../db/index.js";
import { sendRawEmail } from "./email.service.js";
import { sendSMS } from "../utils/sms.js";
import { withRetry } from "../utils/retry.js";
import { getIO } from "../utils/io.js";

const VALID_TYPES = new Set(["bid", "auction", "payment", "escrow", "chat", "system", "info", "referral", "price_alert", "dispute", "inspection"]);

export const sendNotification = async ({ userId, title, message, type = "info", email, phone, link, data = {} }) => {
  if (!userId) return null;
  try {
    const normalizedType = VALID_TYPES.has(type) ? type : "info";
    const notification = await withRetry(() => create("notifications", { user: userId, title, message, type: normalizedType, read: false, link, data }), { retries: 1, baseDelayMs: 200 });
    const payload = { ...notification, _id: notification.id, createdAt: notification.createdAt || notification.created_at, read: false };
    if (getIO()) {
      getIO().to(String(userId)).emit("notification", payload);
      getIO().to(`user_${String(userId)}`).emit("notification", payload);
    }

    // Delivery channels are opt-in and read from the same authoritative user record.
    // Callers may still provide explicit contact details for transactional sends.
    let user = null;
    try { user = await findById("users", userId, "id,email,phone"); } catch { /* in-app notification remains authoritative */ }
    if (email || user?.email) {
      const safeTitle = String(title).replace(/[<>]/g, "");
      const safeMessage = String(message).replace(/[<>]/g, "");
      sendRawEmail({ to: email || user.email, subject: safeTitle, html: `<p>${safeMessage}</p>` }).catch((e) => console.warn("Notification email failed:", e.message));
    }
    if (phone || user?.phone) {
      sendSMS(phone || user.phone, `${title}: ${message}`).catch((e) => console.warn("Notification SMS failed:", e.message));
    }
    return notification;
  } catch (err) {
    console.error("NOTIFICATION ERROR:", err);
    return null;
  }
};
''')
# prefs controller rewrite
(p/'backend/controllers/userPreferenceController.js').write_text(r'''import { findOne, create, update } from "../db/index.js";
import asyncHandler from "../middleware/asyncHandler.js";

const defaults = {
  theme: "system", language: "en", locale: "en", notifications: {}, privacy: {}, display: {},
  bidding: {}, search: { recentSearches: [] }, accessibility: {}, lastSeen: {},
};

async function getOrCreatePreferences(userId) {
  let preferences = await findOne("user_preferences", { user: userId });
  if (!preferences) preferences = await create("user_preferences", { user: userId, ...defaults });
  return preferences;
}

export const getUserPreferences = asyncHandler(async (req, res) => res.json({ success: true, data: await getOrCreatePreferences(req.user.id) }));

export const updateUserPreferences = asyncHandler(async (req, res) => {
  const current = await getOrCreatePreferences(req.user.id);
  const allowed = ["theme","themeColor","language","locale","timezone","dateFormat","currency","notifications","privacy","display","bidding","search","accessibility"];
  const updates = {};
  for (const field of allowed) if (req.body[field] !== undefined) {
    const value = req.body[field];
    updates[field] = value && typeof value === "object" && !Array.isArray(value) ? { ...(current[field] || {}), ...value } : value;
  }
  const data = Object.keys(updates).length ? await update("user_preferences", current.id, updates) : current;
  res.json({ success: true, data });
});

export const setTheme = asyncHandler(async (req, res) => {
  if (!["light","dark","system"].includes(req.body.theme)) return res.status(400).json({ success:false, message:"Invalid theme. Use 'light', 'dark', or 'system'" });
  const current = await getOrCreatePreferences(req.user.id); const data = await update("user_preferences", current.id, { theme: req.body.theme });
  res.json({ success:true, data:{ theme:data.theme, isDarkMode:data.theme === "dark" } });
});

export const toggleDarkMode = asyncHandler(async (req, res) => {
  const current = await getOrCreatePreferences(req.user.id); const theme = current.theme === "dark" ? "light" : current.theme === "light" ? "system" : "dark";
  const data = await update("user_preferences", current.id, { theme }); res.json({ success:true, data:{ theme:data.theme, previousTheme:current.theme, isDarkMode:data.theme === "dark" } });
});

export const setLanguage = asyncHandler(async (req, res) => {
  if (!["en","sw","ar","zh","de","fr","es","pt"].includes(req.body.language)) return res.status(400).json({ success:false, message:"Invalid language code" });
  const current = await getOrCreatePreferences(req.user.id); const data = await update("user_preferences", current.id, { language:req.body.language, locale:req.body.language });
  res.json({ success:true, data:{ language:data.language, locale:data.locale } });
});

export const updateNotificationSettings = asyncHandler(async (req, res) => {
  if (!["email","push","sms"].includes(req.body.channel)) return res.status(400).json({ success:false, message:"Invalid notification channel" });
  const current = await getOrCreatePreferences(req.user.id);
  const notifications = { ...(current.notifications || {}), [req.body.channel]: req.body.settings || {} };
  const data = await update("user_preferences", current.id, { notifications }); res.json({ success:true, data:data.notifications });
});

export const addRecentSearch = asyncHandler(async (req, res) => {
  if (!req.body.query) return res.status(400).json({ success:false, message:"Query is required" });
  const current = await getOrCreatePreferences(req.user.id); const recent = Array.isArray(current.search?.recentSearches) ? current.search.recentSearches : [];
  const recentSearches = [req.body.query, ...recent.filter(q => q !== req.body.query)].slice(0, 20);
  const data = await update("user_preferences", current.id, { search:{ ...(current.search || {}), recentSearches } }); res.json({ success:true, data:{ recentSearches:data.search.recentSearches } });
});

export const clearRecentSearches = asyncHandler(async (req, res) => { const c=await getOrCreatePreferences(req.user.id); const d=await update("user_preferences", c.id,{search:{...(c.search||{}),recentSearches:[]}}); res.json({success:true,data:{recentSearches:d.search.recentSearches}}); });

export const updateAccessibility = asyncHandler(async (req,res)=>{ const c=await getOrCreatePreferences(req.user.id); const a={...(c.accessibility||{})}; for(const k of ["reducedMotion","highContrast","fontSize","screenReader"]) if(req.body[k]!==undefined)a[k]=req.body[k]; const d=await update("user_preferences",c.id,{accessibility:a}); res.json({success:true,data:d.accessibility}); });

export const updateLastSeen = asyncHandler(async (req,res)=>{ const c=await getOrCreatePreferences(req.user.id); const platform=req.body.platform === "mobile" ? "mobile" : "web"; const lastSeen={...(c.lastSeen||{}),[platform]:new Date().toISOString()}; const d=await update("user_preferences",c.id,{lastSeen}); res.json({success:true,data:{lastSeen:d.lastSeen}}); });

export const getPreferenceStats = asyncHandler(async (_req,res)=>res.status(501).json({success:false,code:"PREFERENCE_STATS_UNAVAILABLE",message:"Preference statistics are not part of the canonical user-preference contract."}));
''')
# chat schema
(p/'backend/validation/chat.schema.js').write_text('''import { z } from "zod";\n\nexport const createChatSchema = z.object({\n  recipientId: z.string().uuid("Recipient ID must be a UUID"),\n  carId: z.string().uuid("Car ID must be a UUID").optional(),\n  message: z.string().min(1).max(5000).optional(),\n});\n\nexport const sendMessageSchema = z.object({\n  content: z.string().min(1).max(5000).optional(),\n  text: z.string().min(1).max(5000).optional(),\n  message: z.string().min(1).max(5000).optional(),\n  attachments: z.array(z.union([z.string(), z.object({ url: z.string().url(), type: z.string().max(50).optional() })])).max(10).optional(),\n}).refine(v => Boolean(v.content || v.text || v.message), { message: "Message content is required" });\n''')
# chat controller targeted patches
f=p/'backend/controllers/chatController.js'; s=f.read_text()
s=s.replace('const participants = [req.user.id, participantId].sort();','const participants = [req.user.id, participantId].sort();\n    if (String(participantId) === String(req.user.id)) return res.status(400).json({ success: false, message: "Cannot start a chat with yourself" });')
s=s.replace('const { data: existing } = await query;','const { data: existing } = await query;\n    if (existing?.some((c) => c.isBlocked)) return res.status(423).json({ success: false, code: "CHAT_BLOCKED", message: "This conversation is blocked" });',1)
s=s.replace('if (!chat.participants.some((p) => p.toString() === req.user.id)) {','if (chat.isBlocked) {\n      return res.status(423).json({ success: false, code: "CHAT_BLOCKED", message: "This conversation is blocked" });\n    }\n\n    if (!chat.participants.some((p) => p.toString() === req.user.id)) {',1)
# second occurrence in getMessages: add blocked check too, using exact occurrence now
needle='const chat = await findById("chats", chatId);\n    if (!chat) {\n      return res.status(404, json({ success: false, message: "Chat not found" }));'
# don't use malformed replacement; handle all remaining checks via insert before authorization occurrences after getMessages/markSeen
s=s.replace('if (!chat.participants.some((p) => p.toString() === req.user.id)) {\n      return res.status(403).json({ success: false, message: "Not authorized" });\n    }\n\n    const sb = getSupabase();','if (chat.isBlocked) return res.status(423).json({ success: false, code: "CHAT_BLOCKED", message: "This conversation is blocked" });\n\n    if (!chat.participants.some((p) => p.toString() === req.user.id)) {\n      return res.status(403).json({ success: false, message: "Not authorized" });\n    }\n\n    const sb = getSupabase();',1)
# send notification after IO block before email comment
marker='    // 📧 Email + 📱 SMS (fire-and-forget)'
insert='''    try {\n      const { sendNotification } = await import("../services/notification.service.js");\n      const otherUserId = chat.participants.find((p) => String(p) !== String(req.user.id));\n      if (otherUserId) await sendNotification({ userId: otherUserId, title: "New message", message: msgText, type: "chat", data: { chatId, messageId } });\n    } catch (notificationError) {\n      console.warn("New message in-app notification failed:", notificationError.message);\n    }\n\n'''
s=s.replace(marker,insert+marker)
# remove old direct email/SMS block to avoid duplicate external notifications
start=s.find('    // 📧 Email + 📱 SMS (fire-and-forget)')
end=s.find('    res.status(201).json({', start)
if start!=-1 and end!=-1: s=s[:start]+s[end:]
# markSeen authorization + blocked
old='export const markAsSeen = async (req, res) => {\n  try {\n    const { chatId } = req.params;\n\n    const chat = await findById("chats", chatId);'
new='export const markAsSeen = async (req, res) => {\n  try {\n    const { chatId } = req.params;\n\n    const chat = await findById("chats", chatId);'
s=s.replace(old,new)
# insert block/authorization before messages mapping in markAsSeen
needle='    const messages = (chat.messages || []).map((m) => {'
s=s.replace(needle,'    if (!chat.participants.some((p) => String(p) === String(req.user.id))) return res.status(403).json({ success: false, message: "Not authorized" });\n\n'+needle,1)
f.write_text(s)
# frontend NotificationContext: eliminate synthetic domain notifications and use authoritative refresh
f=p/'src/context/NotificationContext.tsx'; s=f.read_text()
old_start=s.find("  // Socket listener for 'notification' event")
old_end=s.find("  const markAsRead", old_start)
replacement='''  // Socket events are wake-up signals only. Notification rows are authoritative\n  // in the backend, so domain events always trigger a fresh read instead of\n  // manufacturing local notification IDs/messages.\n  useEffect(() => {\n    if (!isAuth || !on) return;\n    const off = on('notification', () => { void fetchNotifications(); });\n    const refreshEvents = ['escrowReleased', 'escrowRefunded', 'escrowDisputed', 'paymentSuccess'];\n    const offs = refreshEvents.map(event => on(event, () => { void fetchNotifications(); }));\n    return () => { off(); offs.forEach(unsub => unsub()); };\n  }, [isAuth, on, fetchNotifications]);\n\n'''
if old_start!=-1 and old_end!=-1: s=s[:old_start]+replacement+s[old_end:]
f.write_text(s)
# Unified hub polling for real updates
f=p/'src/features/UnifiedCommunicationHub.tsx'; s=f.read_text()
anchor='  // Filter & Search State'
poll='''  // Keep inbox and active conversation synchronized with the authoritative API.\n  // This is deliberately polling rather than a second local event store because\n  // the current custom-auth stack does not expose Supabase Auth-scoped realtime.\n  useEffect(() => {\n    if (!user) return;\n    const timer = window.setInterval(async () => {\n      try {\n        const chats = await getMyChats();\n        const mapped = chats.map((c) => mapBackendChatToThread(c, user.id));\n        setThreads(prev => mapped.map(next => {\n          const existing = prev.find(t => t.id === next.id);\n          return existing && existing.id === selectedThreadId ? { ...next, messages: existing.messages } : next;\n        }));\n      } catch { /* keep the last authoritative snapshot on transient failures */ }\n    }, 10000);\n    return () => window.clearInterval(timer);\n  }, [user, selectedThreadId]);\n\n'''
s=s.replace(anchor,poll+anchor)
f.write_text(s)
