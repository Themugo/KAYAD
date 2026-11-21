#!/usr/bin/env node
/** KAYAD database deployment guard. The versioned Supabase migration chain is the sole schema source of truth. */
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const root = resolve(process.cwd());
if (!existsSync(resolve(root, "supabase", "migrations"))) { console.error("❌ supabase/migrations is missing. Run this from the KAYAD repository root."); process.exit(1); }
console.log("KAYAD database deployment guard");
console.log("Schema source of truth: supabase/migrations/");
console.log("Legacy backend/db/schema_clean.sql is not a deployment source.");
try { execFileSync(process.platform === "win32" ? "supabase.exe" : "supabase", ["--version"], { stdio: "inherit" }); } catch { console.error("❌ Supabase CLI is not installed or not available on PATH."); process.exit(1); }
console.log("Run the versioned migration chain with: supabase db push");
