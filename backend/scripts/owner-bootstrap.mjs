#!/usr/bin/env node
// STAGE 5B — controlled owner bootstrap and emergency recovery. Operator tool; NEVER exposed over HTTP.
//   node scripts/owner-bootstrap.mjs --plan                                       read-only report (masked identities + state words)
//   node scripts/owner-bootstrap.mjs --apply  --operator "<name>" --confirm-host <supabase-host> [--resend-pending]
//   node scripts/owner-bootstrap.mjs --emergency --operator "<name>" --incident <id> --confirm-host <host>
// It only ever INVITES the designated addresses (WEBHOIST_EMAIL[S]); the invitation is e-mailed, so the mailbox holder — not the
// operator — completes it. It never sets a password, never prints a token, never promotes an unverified/suspended/ambiguous account,
// is idempotent, refuses once the database bootstrap switch is closed, and records the operator in the append-only event ledger.
import dotenv from "dotenv";
dotenv.config({ quiet: true });

// stdout carries ONLY the final JSON report; library chatter goes to stderr
const out = console.log.bind(console);
console.log = console.info = (...a) => console.error(...a);
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const val = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const die = (m, c = 2) => { console.error(m); process.exit(c); };

const mode = flag("plan") ? "plan" : flag("apply") ? "apply" : flag("emergency") ? "emergency" : null;
if (!mode) die("usage: owner-bootstrap.mjs --plan | --apply --operator <name> --confirm-host <host> [--resend-pending] | --emergency --operator <name> --incident <id> --confirm-host <host>");
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) die("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set; nothing was done.");
if (mode !== "plan") {
  let host = ""; try { host = new URL(process.env.SUPABASE_URL).host; } catch { /* handled below */ }
  if (!host || val("confirm-host") !== host) die(`Refusing: --confirm-host must equal the target database host (${host || "unparseable SUPABASE_URL"}). This guards against running against the wrong environment.`);
}

(await import("../utils/supabase.js")).initSupabase();
const gov = await import("../services/ownerGovernance.service.js");
const { OWNER_EMAILS } = await import("../config/owners.js");
if (!OWNER_EMAILS.length) die("No designated owner identities are configured (WEBHOIST_EMAIL). Nothing to do.");

try {
  if (mode === "plan") {
    const r = await gov.bootstrapReport();
    out(JSON.stringify({ bootstrap: r.bootstrap, usableOwners: r.usableOwners, designated: r.designated.map(({ identity, state }) => ({ identity, state })) }, null, 2));
  } else if (mode === "apply") {
    out(JSON.stringify(await gov.bootstrapApply({ operator: val("operator"), resendPending: flag("resend-pending") }), null, 2));
  } else {
    out(JSON.stringify(await gov.emergencyRecovery({ operator: val("operator"), incident: val("incident") }), null, 2));
  }
  process.exit(0);
} catch (e) {
  console.error(`${e.code || "ERROR"}: ${e.message}`);
  process.exit(e.status && e.status < 500 ? 3 : 4);
}
