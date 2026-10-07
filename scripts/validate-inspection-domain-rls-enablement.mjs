// P0/P1 SOURCE-LEVEL TRUST BOUNDARY SWEEP — Stage 1, Item 7 (RLS cross-boundary
// authorization).
//
// 20260918130000_inspection_domain_rls_hardening.sql wrote per-role CREATE
// POLICY statements for 8 inspection-domain tables under the explicit
// assumption that RLS was already enabled on them ("Existing RLS is
// preserved. No DROP POLICY is used."). It was not — none of these 8 tables'
// original CREATE TABLE migrations ever called ENABLE ROW LEVEL SECURITY, so
// every one of those policies was inert (Postgres does not evaluate any
// policy on a table until RLS is turned on for that table).
// 20261007200000_inspection_domain_rls_enable.sql closes that gap.
//
// This validator does two things:
//   1. Confirms the specific fix migration enables RLS on exactly the 8
//      affected tables, and changes no policy.
//   2. Scans every migration file, in filename (chronological) order, to
//      confirm no table anywhere in the tree ends up with a CREATE POLICY
//      but RLS left disabled — so this class of defect cannot silently
//      reappear via a future migration. CMS/public-content tables that are
//      genuinely designed to be publicly readable (table name prefixed
//      cms_, plus website_settings) are intentionally excluded from the
//      enablement requirement: their single "_public_read" SELECT policy
//      reflects real public-read intent, not a forgotten ENABLE statement,
//      and tightening them is out of scope for this fix.

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationsDir = path.join(root, "supabase/migrations");
const fixMigrationPath = path.join(migrationsDir, "20261007200000_inspection_domain_rls_enable.sql");

const failures = [];

const requiredTables = [
  "inspection_bookings",
  "inspection_disputes",
  "inspection_quality_audits",
  "inspection_report_amendments",
  "inspection_reports",
  "inspection_reviews",
  "inspection_staff",
  "inspection_status_history",
];

// --- Part 1: the fix migration itself ---
if (!fs.existsSync(fixMigrationPath)) {
  failures.push("fix migration 20261007200000_inspection_domain_rls_enable.sql does not exist");
} else {
  const fixSource = fs.readFileSync(fixMigrationPath, "utf8");
  for (const table of requiredTables) {
    if (!new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, "i").test(fixSource)) {
      failures.push(`fix migration: ${table} RLS not enabled`);
    }
  }
  const fixSourceNoComments = fixSource
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  if (/CREATE POLICY|DROP POLICY/i.test(fixSourceNoComments)) {
    failures.push("fix migration: unexpectedly adds or removes a policy (should only enable RLS)");
  }
}

// --- Part 2: whole-tree scan, in chronological (filename) order ---
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const policyTables = new Map(); // table -> policy name -> true
const rlsEnabled = new Set();

const dropRe = /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"?([A-Za-z0-9_ ]+?)"?\s+ON\s+(?:public\.)?"?([A-Za-z0-9_]+)"?/gi;
const createRe = /CREATE\s+POLICY\s+"?([A-Za-z0-9_ ]+?)"?\s+ON\s+(?:public\.)?"?([A-Za-z0-9_]+)"?/gi;
const enableRe = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?"?([A-Za-z0-9_]+)"?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
const disableRe = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?"?([A-Za-z0-9_]+)"?\s+DISABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
const combinedRe = new RegExp(
  `(?<drop>${dropRe.source})|(?<create>${createRe.source})|(?<enable>${enableRe.source})|(?<disable>${disableRe.source})`,
  "gi"
);

for (const file of files) {
  const text = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  let m;
  combinedRe.lastIndex = 0;
  while ((m = combinedRe.exec(text)) !== null) {
    if (m.groups.drop) {
      dropRe.lastIndex = 0;
      const dm = dropRe.exec(m[0]);
      if (dm) {
        const table = dm[2];
        const name = dm[1].trim();
        policyTables.get(table)?.delete(name);
      }
    } else if (m.groups.create) {
      createRe.lastIndex = 0;
      const cm = createRe.exec(m[0]);
      if (cm) {
        const name = cm[1].trim();
        const table = cm[2];
        if (!policyTables.has(table)) policyTables.set(table, new Map());
        policyTables.get(table).set(name, file);
      }
    } else if (m.groups.enable) {
      enableRe.lastIndex = 0;
      const em = enableRe.exec(m[0]);
      if (em) rlsEnabled.add(em[1]);
    } else if (m.groups.disable) {
      disableRe.lastIndex = 0;
      const dm = disableRe.exec(m[0]);
      if (dm) rlsEnabled.delete(dm[1]);
    }
  }
}

const exemptPrefixes = ["cms_"];
const exemptExact = new Set(["website_settings"]);

for (const [table, names] of policyTables.entries()) {
  if (names.size === 0) continue;
  if (rlsEnabled.has(table)) continue;
  if (exemptExact.has(table) || exemptPrefixes.some((p) => table.startsWith(p))) continue;
  failures.push(`${table}: has ${names.size} CREATE POLICY statement(s) but RLS is never enabled — policies are inert`);
}

if (failures.length) {
  console.error("INSPECTION DOMAIN RLS ENABLEMENT: FAIL");
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}

console.log(`INSPECTION DOMAIN RLS ENABLEMENT: PASS (${requiredTables.length}/${requiredTables.length} tables enabled, 0 inert-policy tables found tree-wide)`);
requiredTables.forEach((t) => console.log(`- ${t}: RLS enabled`));
