# KAYAD Change Ledger — 11 October 2026

Baseline: `kayad-support-faq-update(3).zip` (`f9963272ce24d5a6be56873cfab27fc1650fd299eb347fa0f8d16aeaa1d4a3e3`). Local-only changes; no commit/push/deploy.

| ID | Files | Change | Verification / limitation |
|---|---|---|---|
| MSG-PUB-01 | `src/features/UnifiedCommunicationHub.tsx` | Public inbox copy, truthful counts/filters, simple conversation context; removed fake admin/transaction/vault/receipt/appointment claims and unsupported attachment menu | `validate-messaging-public-inbox.mjs`; TSX syntax transpile PASS; full browser build blocked by missing dependencies |
| MSG-API-02 | `src/services/chatApi.ts` | Server-normalized public role labels, real per-chat unread count, image object/string normalization | Public inbox source validator PASS; TS syntax transpile PASS |
| MSG-SEC-03 | `backend/controllers/chatController.js` | Recipient existence, staff direct-chat routing guard, vehicle owner/listing validation, unread count and query error handling, raw inbox message removal, participant-only attachment access | `node --check`; messaging validators PASS; no live API/database execution |
| NOTIF-04 | `src/context/NotificationContext.tsx` | Account-change reset, stale request invalidation, authoritative unread total, account-safe read/delete state changes | Public inbox source validator; TS syntax transpile PASS; no React runtime test |
| NOTIF-05 | `src/App.tsx`, `src/components/Navbar.tsx` | Expose notification count from canonical context; add desktop/mobile Notifications destination | Public inbox source validator; TS syntax transpile PASS |
| VAL-06 | `scripts/validate-chat-notification-routing.mjs` | Assert persisted ID through canonical event builder instead of stale inline event pattern | PASS |
| VAL-07 | `scripts/validate-messaging-delivery-safety-20261010.mjs` | Check stable idempotency key and absence of automatic retry loop against current implementation | PASS |
| VAL-08 | `scripts/validate-messaging-hardening-20261010.mjs` | Check canonical attachment service rather than obsolete controller-local URL normalization | PASS |
| VAL-09 | `scripts/validate-messaging-next-priorities-20261010.mjs` | Align auth bootstrap assertions with current bounded retry/classification contract | PASS |
| VAL-10 | `scripts/validate-chat-persisted-response.mjs` | Align event assertion with persisted message ID contract | PASS |
| VAL-11 | `scripts/validate-ai-decision-support-domain.mjs` | Check documentation at canonical `docs/domains/` location | PASS |
| VAL-12 | `scripts/validate-cms-website-builder-domain.mjs` | Check media ordering against actual `createdAt` schema field | PASS |
| VAL-13 | `scripts/validate-pwa-mobile-contract.mjs` | Match existing Slate Teal theme color used by manifest and HTML | PASS |
| VAL-14 | `scripts/validate-phase8-operations.mjs` | Check canonical `docs/production/DISASTER_RECOVERY.md` path | PASS |
| LEDGER-15 | `supabase/migrations/20261011220000_ledger_signed_balance_rebuild.sql`, `supabase/preflight/ledger_signed_balance_dry_run.sql`, `scripts/validate-financial-ledger-sign-convergence.mjs`, `package.json` | Signed balance rebuild migration, read-only dry-run, source validator and npm script | Static gate 8/8 PASS; no PostgreSQL replay, balance diff or rebuild run |
| VAL-16 | `scripts/validate-messaging-public-inbox.mjs` | New source-contract guard for public copy, routing, unread counts, notification ownership and attachment membership | PASS |
| EVID-17 | `KAYAD_VALIDATOR_BATTERY_20261011.tsv` | Recorded validator results and blockers | 164 PASS / 23 BLOCKED; no reported source validator failures in final battery |
| DOC-18 | `KAYAD_FULL_AUDIT_REPORT_20261011.md` and companion reports | Document findings, decisions, verification and staging gates | Documentation only; no external certification implied |

## Explicitly unchanged

- Existing canonical marketplace, navigation, auction, escrow, payment, support, provider and notification architectures.
- Existing message persistence, idempotency, transactional outbox and notification destination resolver.
- Existing migration history. The new ledger migration is additive; historical migration files were not rewritten.
- No hosted data, credentials, provider settings, production configuration or Git history.
