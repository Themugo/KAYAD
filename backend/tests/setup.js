// backend/tests/setup.js
import mongoose from "mongoose";

let mongod = null;
let usingMemoryServer = false;
let isMockDb = false;

/**
 * Resolve a Mongo binary version. Allows pinning via MEMORY_DB_VERSION env
 * (set this in CI if a specific version is required). Defaults to a stable
 * LTS that exists on the official MongoDB download CDN for all platforms.
 */
const MEMORY_DB_VERSION = process.env.MEMORY_DB_VERSION || "7.0.14";

export async function startTestDB() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }

  // If MONGO_URI is already set (e.g., CI provides it), use it directly
  if (process.env.MONGO_URI && !process.env.MONGO_URI.includes("kayad-test-mock")) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
      });
      usingMemoryServer = false;
      isMockDb = false;
      return process.env.MONGO_URI;
    } catch {
      // Connection failed — fall through to memory server
      console.warn("⚠️  MONGO_URI connection failed, falling back to in-memory MongoDB");
    }
  }

  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    mongod = await MongoMemoryServer.create({
      binary: { version: MEMORY_DB_VERSION },
    });
    const uri = mongod.getUri();
    process.env.MONGO_URI = uri;
    usingMemoryServer = true;
    isMockDb = false;

    await mongoose.connect(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
    });

    return uri;
  } catch (err) {
    console.warn("⚠️  MongoMemoryServer unavailable:", err.message);
    console.warn("   Set MONGO_URI env var (or MEMORY_DB_VERSION) to run DB-dependent tests.");

    process.env.MONGO_URI = "mongodb://127.0.0.1:27017/kayad-test-mock";
    usingMemoryServer = false;
    isMockDb = true;

    // Disable mongoose buffering globally so any DB-dependent test fails
    // fast instead of hanging on the default 10s bufferTimeoutMS.
    mongoose.set("bufferCommands", false);

    return process.env.MONGO_URI;
  }
}

export async function stopTestDB() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  if (mongod) {
    await mongod.stop();
  }
}

export async function clearTestDB() {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      try {
        await collections[key].deleteMany({});
      } catch {
        // ignore errors on mock collections
      }
    }
  }
}

export function isRealDB() {
  return usingMemoryServer || (process.env.MONGO_URI && !process.env.MONGO_URI.includes("mock"));
}

/**
 * Returns true when no real Mongo is reachable. Test files can call
 * `skipIfNoDb(describe)` to gracefully no-op when DB-dependent tests
 * can't run, instead of hanging on a connection timeout.
 */
export function isMockDB() {
  return isMockDb;
}

/**
 * Wraps describe(). When in mock-DB mode (no real or memory Mongo available),
 * the suite is converted to `describe.skip` so the test run doesn't appear
 * broken. CI environments always have MONGO_URI set, so this is a no-op there.
 */
export function describeWithDb(name, fn) {
  if (isMockDb) {
    // eslint-disable-next-line no-undef
    return describe.skip(name, fn);
  }
  // eslint-disable-next-line no-undef
  return describe(name, fn);
}
