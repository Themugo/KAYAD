import crypto from "crypto";
import { getSupabase } from "../utils/supabase.js";

const LOCK_TTL_MS = 30_000;
const RETRY_INTERVAL_MS = 200;
const MAX_RETRIES = 15;
const ALLOW_LOCAL_LOCK_FALLBACK = process.env.NODE_ENV !== "production" && process.env.ALLOW_LOCAL_LOCK_FALLBACK === "true";

const locks = new Map();

function instanceId() {
  return `${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function acquireLock(resourceId, ttl = LOCK_TTL_MS) {
  const id = instanceId();

  try {
    const sb = getSupabase();
    const { data, error } = await sb.rpc("kayad_try_acquire_lock", {
      p_resource_id: resourceId,
      p_holder: id,
      p_ttl_seconds: Math.max(1, Math.ceil(ttl / 1000)),
    });
    if (error) throw error;
    return { acquired: data === true, id };
  } catch (error) {
    // Never silently downgrade a distributed production lock to a per-process
    // Map. That would allow two production instances to enter the same
    // critical section concurrently. Local fallback is opt-in for development
    // and tests only.
    if (!ALLOW_LOCAL_LOCK_FALLBACK) throw error;
    const now = Date.now();
    const expiresAt = now + ttl;
    if (!locks.has(resourceId) || locks.get(resourceId).expiresAt < now) {
      locks.set(resourceId, { holder: id, expiresAt });
      return { acquired: true, id };
    }
    const existing = locks.get(resourceId);
    return { acquired: existing.holder === id, holder: existing.holder, id };
  }
}

export async function releaseLock(resourceId, holderId) {
  try {
    const sb = getSupabase();
    const { error } = await sb.rpc("kayad_release_lock", {
      p_resource_id: resourceId,
      p_holder: holderId,
    });
    if (error) throw error;
  } catch (error) {
    if (!ALLOW_LOCAL_LOCK_FALLBACK) throw error;
  }
  if (locks.has(resourceId) && locks.get(resourceId).holder === holderId) {
    locks.delete(resourceId);
  }
}

export async function withLock(resourceId, fn, ttl = LOCK_TTL_MS) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const lock = await acquireLock(resourceId, ttl);
    if (lock.acquired) {
      try {
        return await fn();
      } finally {
        await releaseLock(resourceId, lock.id);
      }
    }
    await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS * attempt));
  }
  throw new Error(`Could not acquire lock for ${resourceId} after ${MAX_RETRIES} retries`);
}

export async function lockMiddleware(resourceFn) {
  return async (req, res, next) => {
    const resourceId = resourceFn(req);
    if (!resourceId) return next();
    try {
      const lock = await acquireLock(resourceId);
      if (!lock.acquired) {
        return res.status(409).json({
          success: false,
          message: "Operation already in progress",
          holder: lock.holder,
        });
      }
      req.lockHolder = lock.id;
      req.lockResource = resourceId;

      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        releaseLock(resourceId, lock.id).catch(() => {});
      };
      res.once("finish", release);
      res.once("close", release);

      next();
    } catch (err) {
      next(err);
    }
  };
}
