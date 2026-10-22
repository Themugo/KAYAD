# KAYAD Full Project Audit & Convergence Report

**Date:** 11 October 2026  
**Baseline archive:** `kayad-support-faq-update(3).zip`  
**Baseline SHA-256:** `f9963272ce24d5a6be56873cfab27fc1650fd299eb347fa0f8d16aeaa1d4a3e3`  
**Execution mode:** Local-only source changes and static validation. No commit, push, deployment, production database mutation or provider transaction was performed.

## Executive summary

The archive is a substantial existing KAYAD implementation, not a starter project. The audit preserved its canonical marketplace, chat, notification, support, financial, auction, escrow, provider and deployment architecture. Changes were made in place rather than creating parallel systems.

The most visible public defect was corrected: the messaging page no longer presents itself as an internal operations command console, claims nonexistent transaction integrations, or offers fake receipt/appointment/document actions. The inbox now presents the real conversation/listing context returned by the existing chat API. Backend chat creation and attachment authorization were tightened, unread state now derives from persisted messages, and notification routing/counts were made account-aware.

The documented `FIN-LEDGER-1` repository defect was addressed with a forward migration aligning balance rebuilding to the signed convention already used by repository posting/reversal and application trial-balance reporting. A read-only SQL dry-run was added. **The migration has not been applied and no balance rebuild has been run.** Production remains blocked pending staging verification and an approved financial change window.

## Baseline inventory

| Item | Count / value |
|---|---:|
| Original archive size | 29,180,045 bytes (about 27.8 MiB) |
| Files in extracted tree before report packaging | approximately 4,023 |
| Frontend files under `src/` | 725 |
| Backend files under `backend/` | 820 |
| Test/spec files across repository | 201 |
| Validation scripts after this phase | 187 |
| Supabase migration files after this phase | 178 |
| JavaScript/MJS syntax checks | 1,161 / 1,161 passed |
| TS/TSX syntax transpilation checks | 5 / 5 passed |

Counts are repository inventory, not counts of passing tests or production-certified features.

## Confirmed changes

### Messaging and notifications

1. Replaced the public command-console header with a customer-facing “Your conversations” inbox.
2. Removed unsupported escrow, auction, inspection, financing and support-specific inbox tabs. The current canonical `chats` data model is a participant conversation with optional vehicle context; it does not establish those transaction records by itself.
3. Removed claims of end-to-end encryption, audit logging, NTSA verification, permanent audit timelines, encrypted transaction vaults and confirmed payment receipts where no such API data was present.
4. Removed nonfunctional attachment-menu actions for document upload, location sharing and appointment scheduling. The composer is explicitly text-first until a supported frontend upload/workflow contract is connected.
5. Replaced the operations-style right panel with a truthful conversation details panel containing only returned listing and participant data.
6. Added safe public participant labels derived server-side from known user roles. Raw internal role names are not returned in the public participant projection.
7. Normalized the first vehicle image whether the database stores a URL string or an image object.
8. Prevented stale conversations from remaining visible while switching authenticated identities; the previous inbox is cleared before a new account fetch.
9. Read/unread state is only cleared after the backend confirms the read receipt. Per-conversation unread counts are computed from persisted `seenBy`/`seen` state and returned as summaries; raw message arrays are removed from the inbox response.
10. Chat inbox and unread-count database failures now fail visibly instead of returning a successful-looking empty inbox or zero unread count.
11. Vehicle-linked chat creation now verifies that the recipient exists, that the selected vehicle exists and belongs to that recipient, and that the listing is not deleted, hidden, draft or unapproved.
12. New direct chats to staff roles are rejected with `CHAT_RECIPIENT_REQUIRES_CASE_ROUTE`; users must use the corresponding support/transaction workflow instead of bypassing case routing. Existing participant-authorized conversations are not removed by this change.
13. Private chat attachment retrieval no longer lets administrator status alone bypass participant membership. Support staff must use the separately permissioned support-case workflow.
14. Existing authenticated chat membership checks, idempotent message persistence, outbox delivery, notification destination resolver and socket room authorization were preserved.
15. The notification context now clears state on account changes, ignores stale fetch/mutation responses, uses the backend's authoritative unread total, and avoids applying old account results to the next account.
16. Public desktop and mobile navigation now provide an explicit Notifications destination and display the notification count from the canonical notification context.

### Financial integrity

1. Added `supabase/migrations/20261011220000_ledger_signed_balance_rebuild.sql` to rebuild each ledger account as the sum of journal debits minus credits, independent of account type.
2. Preserved service-role-only execution for the rebuild function.
3. The migration does not automatically execute the rebuild. This is intentional: the read-only dry-run and approved financial-write pause must precede the operation.
4. Added `supabase/preflight/ledger_signed_balance_dry_run.sql` to compare stored balances, signed balances and legacy normal-balance results without writing data.
5. Added a static convergence validator and package script for the posting/reversal/rebuild convention.

### Validator corrections

Several validators asserted obsolete source locations or obsolete visual/runtime contracts. They were updated only after checking the canonical implementation. Examples include the canonical persisted-message event builder, attachment normalization in `chatAttachments.js`, the current retryable auth bootstrap, the canonical domain documentation path, CMS media ordering by the actual `createdAt` field, the Slate Teal theme value, and the actual disaster-recovery document location. These are contract corrections, not claims that live infrastructure was tested.

## Verification results

- **187 validator scripts inventoried.** 164 passed. 23 remain blocked: 21 intentionally skipped because they require live services/database/credentials/deployment, and 2 require locally installed `eslint`/`typescript` packages that are absent from the extracted tree.
- **1,161 JavaScript/MJS files:** all passed `node --check`.
- **5 modified TS/TSX files:** all passed TypeScript transpilation syntax checks.
- Migration hygiene: 178 files scanned; no duplicate migration bodies or duplicate table creators.
- Supabase migration static preflight: 178 files and 178 unique versions.
- Database contract alignment validator: 8/8 passed.
- High-risk boundary validator: passed all 10 checks.
- Messaging routing, delivery safety, hardening, persistence confirmation, idempotency, reliability follow-up and RPC error-contract source validators passed.
- Financial signed-balance source gate: 8/8 passed.

### Important test limitations

The environment has Node.js `22.16.0`; the project requires `>=22.22.2`, and `.npmrc` sets `engine-strict=true`. Network DNS is unavailable, and project dependencies are not installed. Therefore the full clean install, frontend typecheck, Vite production build, Vitest/Jest suites, Playwright suite and backend boot certification were not completed here. The global TypeScript compiler emitted missing-module errors because React and project dependencies are absent; this is **not** reported as a passing typecheck.

No live PostgreSQL migration replay, RLS matrix, Supabase staging test, Cloudinary asset inspection, Redis multi-instance test, Render/Vercel health check, Brevo/SMS/WhatsApp provider certification or M-Pesa sandbox transaction was performed.

## Remaining blockers — do not promote to production

### P0 — schema and deployment order

Existing repository evidence in the supplied archive reports production schema drift: production was last recorded at 22 September 2026, 53 newer repository migrations were needed by the backend, and 38 hosted migration versions had no corresponding SQL in the repository. Those historical figures were not re-verified against a live environment in this pass. Export and review the authoritative hosted-only migration history, reconcile the schema on a staging clone, and deploy the backend only after staging migration and regression are green. Never use `db push --include-all` blindly.

### P1 — financial cutover

The source-level rebuild defect is addressed, but balances have not been compared against a target database. Run the included dry-run SQL in the authorized staging environment, inspect reversal history, pause financial writes, apply the reviewed migration, run the rebuild once, and verify stored balances match signed journal totals. Do not promote or run the rebuild on production before that procedure is approved and evidenced.

### P1 — incomplete route/schema contracts

Existing blocker registers report route groups requiring decisions: 110 routes with missing schema dependencies, 6 unresolved column contracts and 27 incomplete model/static-method ports. Do not invent schemas. Decide per subsystem whether to retire routes or implement a reviewed schema and service contract. Dealer earnings must be based on the actual settlement contract, not payer payments.

### P1 — escrow automation

Escrow auto-release and warning automation remain dormant and require an owner policy decision. Do not activate them until eligibility, due-time behavior, idempotency, dry-run output and recovery controls are tested.

### P2 — legacy attachments

The current attachment access path is participant-scoped, but old Cloudinary URLs may still be public. Inventory actual legacy references and provider asset modes, migrate assets through the existing inventory/migration tooling, and verify access revocation. This pass did not connect to Cloudinary or rewrite stored messages.

### P2 — real-time scale and provider delivery

The source includes authenticated socket room joins and an outbox, but Redis-backed multi-instance fan-out and single-use socket-ticket storage across instances remain unverified. Confirm deployment topology and certify with two accounts on staging.

### P2 — M-Pesa uniqueness and project configuration

Provider-transaction uniqueness still needs a duplicate inventory before adding the unique index. Existing audit evidence also reports scripts pinned to another Supabase project reference. These were not silently repointed without authoritative target confirmation.

### P3 — unused Realtime publication and click counter

Existing reports identify unused `supabase_realtime` publications and a read-then-write vehicle click counter. Confirm consumers and exact-count requirements before removing publications or adding a new counter RPC.

## Final status

This ZIP is an improved local release candidate, **not production-certified**. All source-level fixes and remaining limitations are documented in the companion reports. No commit, push, deployment, production database mutation or provider transaction occurred.
