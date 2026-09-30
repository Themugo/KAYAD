import crypto from "crypto";
import { getSupabase } from "../utils/supabase.js";

const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

const mapSession = (row) => row ? ({
  id: row.id,
  user: row.user,
  sessionId: row.session_id,
  familyId: row.family_id,
  deviceId: row.device_id || "unknown",
  userAgent: row.user_agent || "",
  ipAddress: row.ip_address || "",
  expiresAt: row.expires_at,
  lastUsedAt: row.last_used_at,
  createdAt: row.created_at,
  isRevoked: Boolean(row.is_revoked),
  revokedAt: row.revoked_at,
  reuseDetectedAt: row.reuse_detected_at,
}) : null;

const RefreshToken = {
  hashToken,

  async createSession({ user, token, tokenVersion = 0, deviceId = "unknown", userAgent = "", ipAddress = "", expiresAt, familyId = crypto.randomUUID(), sessionId = crypto.randomUUID() }) {
    const { data, error } = await getSupabase().from("refresh_tokens").insert({
      user, token_hash: hashToken(token), token_version: tokenVersion, family_id: familyId, session_id: sessionId,
      device_id: deviceId, user_agent: userAgent, ip_address: ipAddress, expires_at: expiresAt,
    }).select().single();
    if (error) throw error;
    return mapSession(data);
  },

  async rotate({ oldToken, newToken, user, tokenVersion = 0, deviceId = "unknown", userAgent = "", ipAddress = "", expiresAt, familyId }) {
    const sb = getSupabase();
    const { data, error } = await sb.rpc("kayad_rotate_refresh_token", {
      p_old_token_hash: hashToken(oldToken),
      p_new_token_hash: hashToken(newToken),
      p_user_id: user,
      p_token_version: tokenVersion,
      p_family_id: familyId || null,
      p_device_id: deviceId,
      p_user_agent: userAgent,
      p_ip_address: ipAddress,
      p_expires_at: expiresAt.toISOString(),
      p_new_session_id: crypto.randomUUID(),
    });
    if (error) throw error;
    return data || { status: "not_found" };
  },

  async findActiveByToken(token) {
    const { data, error } = await getSupabase().from("refresh_tokens").select("*").eq("token_hash", hashToken(token)).eq("is_revoked", false).maybeSingle();
    if (error) throw error;
    return data ? mapSession(data) : null;
  },

  async findByTokenHash(token) {
    const { data, error } = await getSupabase().from("refresh_tokens").select("*").eq("token_hash", hashToken(token)).maybeSingle();
    if (error) throw error;
    return data ? mapSession(data) : null;
  },

  async revokeToken(token, userId, reason = "logout") {
    const { error } = await getSupabase().from("refresh_tokens").update({ is_revoked: true, revoked_at: new Date().toISOString(), revoke_reason: reason }).eq("token_hash", hashToken(token)).eq("user", userId);
    if (error) throw error;
  },

  async revokeAllForUser(userId, reason = "logout") {
    const { error } = await getSupabase().from("refresh_tokens").update({ is_revoked: true, revoked_at: new Date().toISOString(), revoke_reason: reason }).eq("user", userId).eq("is_revoked", false);
    if (error) throw error;
  },

  async revokeFamily(familyId, reason = "refresh_reuse") {
    const { error } = await getSupabase().from("refresh_tokens").update({ is_revoked: true, revoked_at: new Date().toISOString(), revoke_reason: reason, reuse_detected_at: new Date().toISOString() }).eq("family_id", familyId).eq("is_revoked", false);
    if (error) throw error;
  },

  async findActiveSessionById(sessionId, userId) {
    if (!sessionId) return null;
    const { data, error } = await getSupabase().from("refresh_tokens").select("id,session_id,user,is_revoked,expires_at").eq("session_id", sessionId).eq("user", userId).eq("is_revoked", false).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async revokeSessionById(id, userId) {
    const { error } = await getSupabase().from("refresh_tokens").update({ is_revoked: true, revoked_at: new Date().toISOString(), revoke_reason: "session_revoked" }).eq("id", id).eq("user", userId);
    if (error) throw error;
  },

  async getActiveSessions(userId) {
    const { data, error } = await getSupabase().from("refresh_tokens").select("id,user,family_id,session_id,device_id,user_agent,ip_address,expires_at,last_used_at,created_at,is_revoked,revoked_at,reuse_detected_at").eq("user", userId).eq("is_revoked", false).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapSession);
  },
};

export default RefreshToken;
