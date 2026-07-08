import { cacheGet, cacheSet, cacheDel } from "../utils/cache.js";
class CacheStore {
  async get(sid, cb) {
    try {
      const data = await cacheGet(`session:${sid}`);
      cb(null, data || null);
    } catch (e) {
      cb(e);
    }
  }

  async set(sid, session, cb) {
    try {
      const maxAge = session?.cookie?.maxAge ? Math.floor(session.cookie.maxAge / 1000) : 86400;
      await cacheSet(`session:${sid}`, session, maxAge);
      cb(null);
    } catch (e) {
      cb(e);
    }
  }

  async destroy(sid, cb) {
    try {
      await cacheDel(`session:${sid}`);
      cb(null);
    } catch (e) {
      cb(e);
    }
  }
}

export default CacheStore;
