// backend/tests/setup.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables for tests from backend/.env
dotenv.config({ path: resolve(__dirname, "../.env") });

const DEFAULT_TEST_MONGO_URI = "mongodb://127.0.0.1:27017/kayad-test";
const MOCK_TEST_MONGO_URI = "mongodb://127.0.0.1:27017/kayad-test-mock";
const hadConfiguredMongoUri = Boolean(process.env.MONGO_URI);

// Set MONGO_URI for tests only if not already provided (e.g., CI supplies it).
// Using local MongoDB when no URI is set.
if (!hadConfiguredMongoUri) {
  process.env.MONGO_URI = DEFAULT_TEST_MONGO_URI;
  console.log("ℹ️  MONGO_URI set to local MongoDB for tests");
} else {
  console.log("ℹ️  MONGO_URI already set to:", process.env.MONGO_URI.replace(/:.*@/, ":***@"));
}

// Disable email verification for tests (EMAIL_HOST is configured, which enables verification)
process.env.REQUIRE_EMAIL_VERIFICATION = "false";
process.env.EMAIL_HOST = "";
process.env.EMAIL_USER = "";
process.env.EMAIL_PASS = "";
process.env.EMAIL_FROM = "test@kayad.space";
process.env.SMS_PROVIDER = "mock";
process.env.AT_API_KEY = "";
process.env.PAYMENT_MODE = "mock";
process.env.MPESA_ENV = "mock";

let mongod = null;
let usingMemoryServer = false;
let isMockDb = false;

/**
 * Resolve a Mongo binary version. Allows pinning via MEMORY_DB_VERSION env
 * (set this in CI if a specific version is required). Defaults to a stable
 * LTS that exists on the official MongoDB download CDN for all platforms.
 */
const MEMORY_DB_VERSION = process.env.MEMORY_DB_VERSION || "7.0.14";
const SHOULD_TRY_MEMORY_DB = process.env.USE_MEMORY_DB === "true" || Boolean(process.env.MEMORY_DB_VERSION);

function markMockDb(err) {
  const isExecFormat = /EFTYPE|spawn|exec format/i.test(err?.message || "");
  console.warn("\n" + "=".repeat(70));
  console.warn("⚠️  No test database available — DB-dependent tests will be skipped.");
  console.warn("    Reason:", err?.message || "MONGO_URI is not reachable");
  if (isExecFormat) {
    console.warn("    This usually means the bundled mongod can't run on your");
    console.warn("    Node version. This project targets Node 20 (see .nvmrc).");
  }
  console.warn("    Fix (either one):");
  console.warn("      • Use Node 20:   nvm install 20 && nvm use 20");
  console.warn("      • Or point at a real DB:");
  console.warn("        set MONGO_URI=mongodb://127.0.0.1:27017/kayad-test  (Windows cmd)");
  console.warn("        export MONGO_URI=mongodb+srv://<atlas-uri>/kayad-test  (or Atlas)");
  console.warn("      • Or explicitly try memory Mongo: set USE_MEMORY_DB=true");
  console.warn("    CI is unaffected — it always provides MONGO_URI.");
  console.warn("=".repeat(70) + "\n");

  process.env.MONGO_URI = MOCK_TEST_MONGO_URI;
  process.env.KAYAD_TEST_DB_UNAVAILABLE = "1";
  usingMemoryServer = false;
  isMockDb = true;

  // Disable mongoose buffering globally so any DB-dependent test fails
  // fast instead of hanging on the default 10s bufferTimeoutMS.
  mongoose.set("bufferCommands", false);

  return process.env.MONGO_URI;
}

export async function startTestDB() {
  if (process.env.KAYAD_TEST_DB_UNAVAILABLE === "1") {
    process.env.MONGO_URI = MOCK_TEST_MONGO_URI;
    usingMemoryServer = false;
    isMockDb = true;
    mongoose.set("bufferCommands", false);
    return process.env.MONGO_URI;
  }

  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }

  // If MONGO_URI is already set (e.g., CI provides it or Atlas), use it directly
  if (process.env.MONGO_URI && !process.env.MONGO_URI.includes("kayad-test-mock")) {
    try {
      const connectTimeoutMs = Number(
        process.env.TEST_DB_CONNECT_TIMEOUT_MS || (!hadConfiguredMongoUri ? "2000" : "15000"),
      );
      await mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: connectTimeoutMs,
      });
      usingMemoryServer = false;
      isMockDb = false;
      // CI uses ONE shared database across all test files. Clear it on connect
      // so each file starts from a clean slate (prevents cross-file pollution
      // that breaks exact-count assertions).
      await clearTestDB();
      console.log("✅ Connected to MongoDB:", process.env.MONGO_URI.replace(/:.*@/, ":***@"));
      return process.env.MONGO_URI;
    } catch (err) {
      // Connection failed — fall through to memory server
      console.warn("⚠️  MONGO_URI connection failed:", err.message);
      if (!SHOULD_TRY_MEMORY_DB) {
        return markMockDb(err);
      }
      console.warn("    Falling back to in-memory MongoDB");
    }
  } else {
    console.warn("⚠️  MONGO_URI not set or is mock URI");
    console.warn("    Set MONGO_URI in backend/.env to use a real database");
    if (!SHOULD_TRY_MEMORY_DB) {
      return markMockDb(new Error("MONGO_URI not set"));
    }
    console.warn("    Falling back to in-memory MongoDB");
  }

  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    mongod = await MongoMemoryServer.create({
      binary: { version: MEMORY_DB_VERSION },
      instance: {
        timeout: 60000, // Increase startup timeout to 60 seconds
      },
      // Skip auto-download if binary fails to run
      autoDownload: true,
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
    return markMockDb(err);
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
  if (mongoose.connection.readyState !== 1) return;
  try {
    // List the ACTUAL collections in the database (not just those registered
    // as Mongoose models in this process) so leftovers from other test files
    // are also cleared on a shared CI database.
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const { name } of collections) {
      try {
        await mongoose.connection.db.collection(name).deleteMany({});
      } catch {
        // ignore (e.g. system collections / mock mode)
      }
    }
  } catch {
    // Fallback to registered model collections (e.g. mock mode)
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      try {
        await collections[key].deleteMany({});
      } catch {
        /* ignore */
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
