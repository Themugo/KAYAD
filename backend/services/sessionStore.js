import session from "express-session";
import { cacheGet, cacheSet, cacheDel } from "../utils/cache.js";

// Sessions support CSRF state but must never become a hard HTTP availability
// dependency. A degraded Redis connection can otherwise leave express-session
// waiting indefinitely during the response lifecycle.
const SESSION_STORE_TIMEOUT_MS = Math.max(250, Number(process.env.SESSION_STORE_TIMEOUT_MS || 1000));

const withTimeout = (promise, fallback) =>
  Promise.race([
    Promise.resolve(promise),
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve(fallback), SESSION_STORE_TIMEOUT_MS);
      timer.unref?.();
    }),
  ]).catch(() => fallback);

class CacheStore extends session.Store {
  async get(sid, cb) {
    try {
      const data = await withTimeout(cacheGet(`session:${sid}`), null);
      cb(null, data || null);
    } catch (e) {
      cb(e);
    }
  }

  async set(sid, session, cb) {
    try {
      const maxAge = session?.cookie?.maxAge ? Math.floor(session.cookie.maxAge / 1000) : 86400;
      // Session persistence is important, but it must not hold an HTTP response
      // open when Redis is degraded. A timeout intentionally fails open for the
      // store operation; CSRF validation remains fail-closed if the session token
      // cannot be recovered on a later state-changing request.
      await withTimeout(cacheSet(`session:${sid}`, session, maxAge), undefined);
      cb(null);
    } catch (e) {
      cb(e);
    }
  }

  async destroy(sid, cb) {
    try {
      await withTimeout(cacheDel(`session:${sid}`), undefined);
      cb(null);
    } catch (e) {
      cb(e);
    }
  }
}

export default CacheStore;
