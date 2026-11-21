// KAYAD backend bootstrap.
// Load environment configuration before importing server.js so modules that
// validate secrets at import time see the same environment as the HTTP server.
import crypto from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(__dirname, "../.env") });
dotenv.config({ path: resolve(__dirname, ".env") });

// Local development should be runnable without accidentally requiring real
// production credentials. Generate process-local secrets only when NODE_ENV
// is explicitly non-production. These values disappear when the process exits.
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_ENV ||= "development";
  process.env.PORT ||= "5000";

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
    console.warn("⚠️  JWT_SECRET not configured; using an ephemeral development secret.");
  }
  if (!process.env.REFRESH_TOKEN_SECRET) {
    process.env.REFRESH_TOKEN_SECRET = crypto.randomBytes(32).toString("hex");
    console.warn("⚠️  REFRESH_TOKEN_SECRET not configured; using an ephemeral development secret.");
  }
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = crypto.randomBytes(32).toString("hex");
    console.warn("⚠️  SESSION_SECRET not configured; using an ephemeral development secret.");
  }
}

await import("./server.js");
