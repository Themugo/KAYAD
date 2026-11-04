import crypto from "crypto";
import { findById, findOne } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import { bidderNumber } from "../utils/bidderIdentity.js";
import { getIO } from "../utils/io.js";
import { emitCommunication, COMMUNICATION_EVENTS } from "./communicationEvents.service.js";

const BOT_RE = /bot|crawler|spider|preview|monitor|headless|lighthouse|curl|wget/i;
const ZERO = { follows: 0, likes: 0, comments: 0, visits: 0, uniqueVisitors: 0 };
const fail = (status, message, code) => Object.assign(new Error(message), { status, code });
const sb = () => getSupabase();

const counts = (c) => c ? { follows: Number(c.follows || 0), likes: Number(c.likes || 0), comments: Number(c.comments || 0), visits: Number(c.visits || 0), uniqueVisitors: Number(c.unique_visitors || 0) } : { ...ZERO };

/** Only published auctions have a public audience. */
export async function assertPublicAuction(auctionId) {
  const [car, setup] = await Promise.all([findById("cars", auctionId), findOne("auction_setups", { car_id: auctionId })]);
  if (!car || car.deletedAt || !setup || setup.publicationStatus !== "published") throw fail(404, "Auction not found");
  return { car, setup };
}

// ── Live presence (Socket.IO room size) ──────────────────────
export const liveWatchers = (auctionId) => { try { return getIO()?.sockets?.adapter?.rooms?.get(`car_${auctionId}`)?.size || 0; } catch { return 0; } };
const lastPeakWrite = new Map();
export async function broadcastWatchers(auctionId) {
  const watchers = liveWatchers(auctionId);
  try { getIO()?.to(`car_${auctionId}`).emit("auctionWatchers", { carId: String(auctionId), watchers }); } catch { /* realtime is best effort */ }
  const last = lastPeakWrite.get(auctionId) || { at: 0, v: 0 };
  if (watchers > last.v && Date.now() - last.at > 15000) {
    lastPeakWrite.set(auctionId, { at: Date.now(), v: watchers });
    await sb().rpc("kayad_record_auction_watch_peak", { p_auction_id: auctionId, p_watchers: watchers }).catch(() => {});
  }
  return watchers;
}

// ── Visits (privacy-safe, bots excluded) ─────────────────────
export const visitorHash = ({ auctionId, userId, ip, ua }) =>
  crypto.createHash("sha256").update(`${process.env.VISITOR_HASH_SALT || process.env.JWT_SECRET || "kayad"}|${auctionId}|${userId || `${ip}|${ua}`}`).digest("hex").slice(0, 32);

export async function recordVisit({ auctionId, userId, ip, ua }) {
  if (BOT_RE.test(String(ua || ""))) return { recorded: false };
  await assertPublicAuction(auctionId);
  const { error } = await sb().rpc("kayad_record_auction_visit", { p_auction_id: auctionId, p_visitor_hash: visitorHash({ auctionId, userId, ip, ua }) });
  return { recorded: !error };
}

// ── Counters + viewer state (fails soft before the migration is applied) ──
export async function getEngagement({ auctionId, userId = null }) {
  await assertPublicAuction(auctionId);
  const { data, error } = await sb().rpc("kayad_auction_engagement_counts", { p_auction_id: auctionId });
  const base = { ...counts(error ? null : data), watchers: liveWatchers(auctionId), enabled: !error, viewer: { followed: false, liked: false } };
  if (userId && !error) {
    const [f, l] = await Promise.all([
      sb().from("auction_follows").select("user_id").eq("auction_id", auctionId).eq("user_id", userId).maybeSingle(),
      sb().from("auction_likes").select("user_id").eq("auction_id", auctionId).eq("user_id", userId).maybeSingle(),
    ]);
    base.viewer = { followed: Boolean(f.data), liked: Boolean(l.data) };
  }
  return base;
}

async function setFlag(table, { auctionId, userId, on }) {
  await assertPublicAuction(auctionId);
  const q = on
    ? await sb().from(table).upsert({ auction_id: auctionId, user_id: userId }, { onConflict: "auction_id,user_id", ignoreDuplicates: true })
    : await sb().from(table).delete().eq("auction_id", auctionId).eq("user_id", userId);
  if (q.error) throw fail(503, "Engagement is temporarily unavailable");
  const state = await getEngagement({ auctionId, userId });
  try { getIO()?.to(`car_${auctionId}`).emit("auctionEngagement", { carId: String(auctionId), follows: state.follows, likes: state.likes, comments: state.comments }); } catch { /* best effort */ }
  return state;
}
export const setFollow = (a) => setFlag("auction_follows", a);
export const setLike = (a) => setFlag("auction_likes", a);

// ── Comments ─────────────────────────────────────────────────
/** Anti-scam: no links, contact details, or off-platform payment/contact solicitation in public comments. */
export function commentProblem(text) {
  if (/https?:\/\/|www\.|\b[\w-]+\.(com|co\.ke|ke|net|org|info|me|link)\b|\bwa\.me\b|\bt\.me\b/i.test(text)) return "Links are not allowed in comments.";
  if (/[\w.+-]+@[\w-]+\.\w+/.test(text)) return "Email addresses are not allowed in comments.";
  if (/(?:\d[\s().-]*){9,}/.test(text)) return "Phone or account numbers are not allowed in comments.";
  if (/\b(whats\s?app|telegram|signal|call me|text me|dm me|inbox me|send (me )?money|pay me|mpesa me)\b/i.test(text)) return "Please keep contact and payments on KAYAD.";
  return null;
}

const publicComment = (r) => ({ id: r.id, author: r.author_tag, isOrganizer: Boolean(r.is_organizer), body: r.body, createdAt: r.created_at });

export async function listComments({ auctionId, before = null, limit = 30 }) {
  await assertPublicAuction(auctionId);
  let q = sb().from("auction_comments").select("id,author_tag,is_organizer,body,created_at").eq("auction_id", auctionId).eq("status", "visible").order("created_at", { ascending: false }).limit(Math.min(Number(limit) || 30, 50));
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) return { comments: [], enabled: false };
  return { comments: (data || []).map(publicComment), enabled: true };
}

export async function addComment({ auctionId, user, body }) {
  const { setup } = await assertPublicAuction(auctionId);
  const text = String(body || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (!text) throw fail(422, "Write something first.");
  if (text.length > 500) throw fail(422, "Comments are limited to 500 characters.");
  const problem = commentProblem(text);
  if (problem) throw fail(422, problem, "COMMENT_REJECTED");
  const { data: recent } = await sb().from("auction_comments").select("created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
  if (recent?.[0] && Date.now() - Date.parse(recent[0].created_at) < 10000) throw fail(429, "Please wait a few seconds before commenting again.");
  const isOrganizer = String(setup.organizerId) === String(user.id);
  const { data, error } = await sb().from("auction_comments").insert({ auction_id: auctionId, user_id: user.id, author_tag: isOrganizer ? "Seller" : bidderNumber(user.id, auctionId), is_organizer: isOrganizer, body: text }).select("id,author_tag,is_organizer,body,created_at").single();
  if (error) throw fail(503, "Comments are temporarily unavailable");
  const comment = publicComment(data);
  try { getIO()?.to(`car_${auctionId}`).emit("auctionComment", { carId: String(auctionId), comment }); } catch { /* best effort */ }
  return comment;
}

/** Author removes their own; the organizer or staff can hide any. */
export async function removeComment({ auctionId, commentId, user }) {
  const { setup } = await assertPublicAuction(auctionId);
  const { data: row } = await sb().from("auction_comments").select("id,user_id,status").eq("id", commentId).eq("auction_id", auctionId).maybeSingle();
  if (!row || row.status !== "visible") throw fail(404, "Comment not found");
  const staff = ["admin", "super_admin", "superadmin", "staff"].includes(user.role);
  const own = String(row.user_id) === String(user.id);
  if (!own && !staff && String(setup.organizerId) !== String(user.id)) throw fail(403, "Not allowed");
  const { error } = await sb().from("auction_comments").update({ status: own ? "removed" : "hidden" }).eq("id", commentId);
  if (error) throw fail(503, "Could not update the comment");
  try { getIO()?.to(`car_${auctionId}`).emit("auctionCommentRemoved", { carId: String(auctionId), commentId }); } catch { /* best effort */ }
  return { id: commentId };
}

/** Any signed-in user can report; three different reporters hide the comment pending staff review. */
export async function reportComment({ auctionId, commentId, user, reason }) {
  await assertPublicAuction(auctionId);
  const { data: row } = await sb().from("auction_comments").select("id,user_id,status").eq("id", commentId).eq("auction_id", auctionId).maybeSingle();
  if (!row || row.status !== "visible") throw fail(404, "Comment not found");
  if (String(row.user_id) === String(user.id)) throw fail(422, "You cannot report your own comment");
  const { error } = await sb().from("auction_comment_reports").upsert({ comment_id: commentId, reporter_id: user.id, reason: String(reason || "").slice(0, 200) || null }, { onConflict: "comment_id,reporter_id", ignoreDuplicates: true });
  if (error) throw fail(503, "Reporting is temporarily unavailable");
  const { count } = await sb().from("auction_comment_reports").select("comment_id", { count: "exact", head: true }).eq("comment_id", commentId);
  const hidden = Number(count || 0) >= 3;
  if (hidden) {
    await sb().from("auction_comments").update({ status: "hidden" }).eq("id", commentId);
    try { getIO()?.to(`car_${auctionId}`).emit("auctionCommentRemoved", { carId: String(auctionId), commentId }); } catch { /* best effort */ }
  }
  return { reported: true, hidden };
}

/** Staff queue: visible comments that have at least one report. */
export async function listReportedComments({ user }) {
  if (!["admin", "super_admin", "superadmin", "staff"].includes(user.role)) throw fail(403, "Staff only");
  const { data: reports, error } = await sb().from("auction_comment_reports").select("comment_id,reason,created_at").order("created_at", { ascending: false }).limit(300);
  if (error) throw fail(503, "Moderation queue is unavailable");
  const byComment = new Map();
  for (const r of reports || []) { const e = byComment.get(r.comment_id) || { count: 0, reasons: [] }; e.count += 1; if (r.reason) e.reasons.push(r.reason); byComment.set(r.comment_id, e); }
  if (!byComment.size) return [];
  const { data: comments } = await sb().from("auction_comments").select("id,auction_id,author_tag,body,status,created_at").in("id", [...byComment.keys()]).eq("status", "visible");
  return (comments || []).map((c) => ({ id: c.id, auctionId: c.auction_id, author: c.author_tag, body: c.body, createdAt: c.created_at, reports: byComment.get(c.id).count, reasons: byComment.get(c.id).reasons.slice(0, 3) })).sort((a, b) => b.reports - a.reports);
}

// ── Owner / staff insights ───────────────────────────────────
export async function getInsights({ auctionId, user }) {
  const { setup } = await assertPublicAuction(auctionId);
  const staff = ["admin", "super_admin", "superadmin", "staff"].includes(user.role);
  if (!staff && String(setup.organizerId) !== String(user.id)) throw fail(403, "Only the auction owner can view insights");
  const { data, error } = await sb().rpc("kayad_auction_engagement_insights", { p_auction_id: auctionId, p_days: 14 });
  if (error || !data) throw fail(503, "Insights are not available yet");
  const d = data;
  const visits = Number(d.unique_visitors || 0);
  const pct = (n) => (visits > 0 ? Math.round((Number(n || 0) / visits) * 1000) / 10 : 0);
  return {
    totals: { ...counts(d), liveWatchers: liveWatchers(auctionId), peakWatchers: Number(d.peak_watchers || 0) },
    funnel: [
      { key: "visitors", label: "Unique visitors", value: visits, pct: visits ? 100 : 0 },
      { key: "followers", label: "Followers", value: Number(d.follows || 0), pct: pct(d.follows) },
      { key: "registered", label: "Registered bidders", value: Number(d.registered || 0), pct: pct(d.registered) },
      { key: "bidders", label: "Bidders", value: Number(d.bidders || 0), pct: pct(d.bidders) },
    ],
    daily: (d.daily || []).map((x) => ({ day: x.day, visits: Number(x.visits), unique: Number(x.unique) })),
  };
}

// ── Follower notifications ───────────────────────────────────
export async function notifyAuctionFollowers({ auctionId, eventType, title, message, excludeUserIds = [] }) {
  try {
    const { data } = await sb().from("auction_follows").select("user_id").eq("auction_id", auctionId).limit(2000);
    const skip = new Set(excludeUserIds.filter(Boolean).map(String));
    await Promise.all((data || []).filter((f) => !skip.has(String(f.user_id))).map((f) => emitCommunication({ userId: f.user_id, eventType, title, message, channels: ["in_app"], metadata: { carId: auctionId } }).catch(() => {})));
  } catch { /* follower notices are best effort and must never block an auction transition */ }
}
export { COMMUNICATION_EVENTS };
