# KAYAD — NEXT PHASE: STAGING PROMOTION, LEDGER CONVENTION & SUBSYSTEM DECISIONS

## Mission
Continue from the verified `KAYAD-RUNTIME-CONVERGENCE-CERTIFICATION-20261011` foundation ZIP. Confirm its filename and SHA-256 first.

Use these as the baseline:
- `docs/audits/26-TEST-MATRIX-RUNTIME-CONVERGENCE-20261011.md`
- `docs/audits/27-REMAINING-BLOCKER-REGISTER-20261011.md`

This is an execution phase. Do not redesign, rebuild or duplicate KAYAD.

## Non-negotiable restrictions
- Preserve: the marketplace, HOMEPAGE-CONVERGED, Auction 360, Navigation Convergence, the Messages authentication fix, the RT-3 socket tickets, messaging idempotency, the transactional outbox and attachment security.
- Do not weaken authentication, authorization, RLS, cookie security, CSRF, socket-ticket single use or payment verification.
- Do not push, commit, deploy, change production settings or apply production migrations unless the owner explicitly authorises that step in this conversation.
- Production stays read-only (catalog only) unless the owner authorises otherwise.
- Never print secrets, keys, tokens, socket tickets, cookies or customer data.
- Never report an unexecuted test as PASS. Use PASS, FAIL, PARTIAL, BLOCKED, NOT RUN and SOURCE-VERIFIED.

## Priority 0: owner decisions needed before code (ask once, then proceed)
1. **FIN-LEDGER-1.** Confirm the ledger balance convention. Recommended: signed, debit + / credit −, which matches the app trial balance and reversals. Then:
   - write one migration that aligns `kayad_post_ledger_entry_atomic`, `kayad_reverse_ledger_entry_atomic` and `kayad_rebuild_ledger_balances`;
   - provide a dry-run diff script for production balances;
   - make `m15` #7 the acceptance test.
2. **Disposable Supabase project.** Ask for authorisation once; it is billable. If granted, run `28-…` §B. If not, keep it BLOCKED.
3. **Groups B, C and D in `21-…`.** Get a retire-or-build decision per subsystem: AI workspace, VX builder, platform objects, workflows, feature flags, listing quality, notification analytics, dealer health, marketplace health, fraud, disputes v1, dealer settlement and earnings.

## Priority 1: HIST-38 and staging parity
- Export the 38 hosted-only migrations with `supabase migration fetch` or a schema-only dump, review them, and commit them under their production versions without editing historical files.
- Rebuild the local chain from production's shape, then diff the 5 unmatched older repository migrations.
- Re-run the route-schema crawl. Expected: the 27 group-A routes stop failing.
- Report the new 500 count and any `newFailures`.

## Priority 2: implement the approved decisions
- Retire unused routes: remove them from `openapi.yaml` and the routers, check frontend callers, and add tests.
- For subsystems kept, port the Mongoose statics to explicit queries, and add reviewed migrations only where the owner approved the contract.
- Add a Redis-backed `jti` store and the Socket.IO Redis adapter if more than one API instance is planned (RT-SCALE).

## Priority 3: staging certification (if staging access is granted)
- Execute `28-STAGING-CERTIFICATION-INSTRUCTIONS-20261011.md` §A–§G.
- Record each step with evidence.
- Include the real-browser RT-3 checks E1–E7 and the M-Pesa sandbox checks D1–D2.

## Priority 4: final regression and package
- Re-run everything in `26-…` with the same commands.
- Compare against its numbers:
  - 176 migrations;
  - 1,153 Jest tests;
  - 625 frontend tests plus 1 skipped;
  - harness: 139 pass, 1 expected FAIL (FIN-LEDGER-1, until fixed), 1 skip;
  - E2E: 20/20;
  - route crawl: 170 × 500 plus 2 × 503;
  - Messages matrix 19/19 in both builds;
  - cross-host realtime probe authenticated.
- Package a new foundation ZIP with SHA-256, an overlay, a patch, a change ledger and a blocker register.
- Verify integrity before giving download links.
