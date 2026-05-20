// backend/tests/setup.js
import mongoose from "mongoose";

let mongod = null;
let usingMemoryServer = false;

export async function startTestDB() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }

  // If MONGO_URI is already set (e.g., CI provides it), use it directly
  if (process.env.MONGO_URI && !process.env.MONGO_URI.includes("kayad-test-mock")) {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 15000,
    });
    usingMemoryServer = false;
    return process.env.MONGO_URI;
  }

  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGO_URI = uri;
    usingMemoryServer = true;

    await mongoose.connect(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
    });

    return uri;
  } catch (err) {
    console.warn("⚠️  MongoMemoryServer unavailable:", err.message);
    console.warn("   Set MONGO_URI env var to run DB-dependent tests.");

    process.env.MONGO_URI = "mongodb://127.0.0.1:27017/kayad-test-mock";
    usingMemoryServer = false;

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
