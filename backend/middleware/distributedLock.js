import crypto from "crypto";
import mongoose from "mongoose";

const LOCK_TTL_MS = 30_000;
const RETRY_INTERVAL_MS = 200;
const MAX_RETRIES = 15;

const locks = new Map();

function instanceId() {
  return `${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function acquireLock(resourceId, ttl = LOCK_TTL_MS) {
  const now = Date.now();
  const expiresAt = new Date(now + ttl);
  const id = instanceId();

  try {
    const db = mongoose.connection.db;
    if (!db) return { acquired: true, id };

    const result = await db.collection("distributedLocks").findOneAndUpdate(
      { _id: resourceId, $or: [{ expiresAt: { $lt: new Date() } }, { expiresAt: null }] },
      { $set: { _id: resourceId, holder: id, acquiredAt: new Date(), expiresAt } },
      { upsert: true, returnDocument: "before" },
    );

    if (!result) return { acquired: true, id };
    if (result.holder === id) return { acquired: true, id };
    if (result.expiresAt && result.expiresAt > new Date()) return { acquired: false, holder: result.holder, id };
    return { acquired: true, id };
  } catch {
    if (!locks.has(resourceId)) {
      locks.set(resourceId, { holder: id, expiresAt });
      return { acquired: true, id };
    }
    const existing = locks.get(resourceId);
    if (existing.holder === id) return { acquired: true, id };
    if (existing.expiresAt < now) {
      locks.set(resourceId, { holder: id, expiresAt });
      return { acquired: true, id };
    }
    return { acquired: false, holder: existing.holder, id };
  }
}

export async function releaseLock(resourceId, holderId) {
  try {
    const db = mongoose.connection.db;
    if (db) {
      await db.collection("distributedLocks").deleteOne({ _id: resourceId, holder: holderId });
    }
  } catch {
    /* ignore */
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

      const originalJson = res.json.bind(res);
      res.json = function (data) {
        releaseLock(resourceId, lock.id).catch(() => {});
        return originalJson(data);
      };

      res.on("finish", () => {
        releaseLock(resourceId, lock.id).catch(() => {});
      });

      next();
    } catch (err) {
      next(err);
    }
  };
}
