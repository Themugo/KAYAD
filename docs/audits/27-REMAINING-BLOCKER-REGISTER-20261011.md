# Remaining blocker register (after the runtime-convergence phase)

**Ranking:**
- **P0:** money, security or availability fails if shipped as-is.
- **P1:** serious functional or security gap.
- **P2:** significant.
- **P3:** hygiene.

Statuses: OPEN, FIXED (local evidence), DECISION (owner), BLOCKED.

| Rank | ID | Blocker | Status | Evidence | Unblocks it |
|---|---|---|---|---|---|
| P0 | DEPLOY-ORDER | Production schema stops at 2026-09-22. This backend needs 53 newer migrations (now including `…130000`) | OPEN | `evidence/hosted-readonly-20261011`; `25-…` §3 | staging clone, then apply in order, then deploy backend (`28-…` §A) |
| P0 | HIST-38 | 38 production migrations have no repository SQL; `db push` refuses | OPEN | `production-only-versions.txt` | owner exports, reviews and commits them under their production versions |
| P1 | FIN-LEDGER-1 | Ledger balance sign conventions disagree. Repository: post/reverse signed, rebuild normal-balance. Production: post normal-balance, reverse signed. A rebuild corrupts balances; in production, reversals of revenue/liability entries move balances the wrong way | DECISION | `m15` #7 FAIL; `24-…` | owner picks a convention, then a migration plus a one-time rebuild after a dry-run diff; production impact check D4 |
| P1 | FIN-1 | Escrow auto-release and warnings dormant (`warning_sent`, comma-string filter); enabling moves money for every overdue escrow | DECISION (unchanged) | `13-…` | owner policy, then fix both behind a switch with a dry run |
| P1 | SCH-B-110 | 110 routes read tables that exist nowhere (AI workspace, VX builder, platform objects, workflows, feature flags, governance analytics, disputes v1, fraud…) | DECISION | `21-…` group B | retire or design per subsystem |
| P1 | SUPA-CERT | No disposable Supabase verification (registries blocked; billable project not authorised) | BLOCKED | `23-…` | owner authorises a disposable project, or staging |
| P2 | SCH-D-27 | 27 routes call Mongoose statics/models never ported (FeatureFlag, ListingQuality, NotificationAudit, MarketplaceHealth service, DealerHealthScore, JobFailure) | OPEN | `21-…` group D | port after the A/B table decisions |
| P2 | SCH-A-27 | 27 routes need tables that only production has | OPEN (resolved by HIST-38) | `21-…` group A | HIST-38 |
| P2 | SCH-C-6 | 6 routes need columns that exist nowhere, including dealer earnings reading payer payments as dealer income (contract error) | DECISION | `21-…` group C | define dealer settlement/earnings contract |
| P2 | RT-SCALE | Socket.IO without Redis adapter; socket-ticket single-use is per instance | OPEN | `20-…` §6 | Redis adapter plus Redis `jti` store before scaling out |
| P2 | ATT-LEGACY | Pre-fix chat attachments still public on Cloudinary | OPEN | `12-…` | inventory and asset-specific migration |
| P2 | CFG-REF-1 | 15 scripts pinned to another project ref | OPEN | `08-…` | repoint or retire |
| P2 | FIN-2 | `mpesa_transactions` lacks provider-id uniqueness | OPEN | `13-…` | check for duplicates, then a partial unique index |
| P3 | REALTIME-PUB | `supabase_realtime` publishes 5 unused tables | OPEN | `15-…` | drop after staging confirmation |
| P3 | VAL-4 | The same 4 custom validators fail as on every foundation | OPEN (unchanged) | `final-regression/validators` | product decisions |
| P3 | E2E-LIVE | Legacy live E2E suites need seeded staging accounts | NOT RUN | `22-…` | `28-…` §G |
| P3 | CLICK-RACE | `POST /cars/:id/click` uses read-then-write (approximate counter) | OPEN | `25-…` §1 | atomic increment RPC if exact counts matter |

**Closed in this phase (local evidence; deploy and staging still required):**

| ID | Closure |
|---|---|
| RT-3 | Cross-host socket authentication. Real Chromium probe: authenticated delivery with no cookie to the socket host |
| D-RT-2 | Socket session revocation, ban and deactivation |
| FIN-3 | Idempotency middleware on GET and keyless requests |
| Route-schema | 34 of 206 crawl 500s fixed; 2 reclassified to 503; the remaining 170 classified |
| E2E | 14/14 baseline failures resolved: 10 stale expectations, 2 a11y defects, 1 fixture, 1 harness defect |
| Metrics | Prometheus export and 33 counter calls |
