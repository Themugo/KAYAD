# KAYAD Messaging RPC Error Hardening — 2026-10-10

## Scope

This sweep continues from `KAYAD-MESSAGING-HARDENING-NEXT-FOUNDATION-20261010.zip`. It is limited to the existing chat controller and a source-level regression validator. No navigation redesign, authentication bypass, schema migration, or production operation was performed.

## Change

The database RPCs `kayad_append_chat_message` and `kayad_mark_chat_seen` already enforce chat existence, participant authorization, blocked state (send), and non-empty message text under the database transaction/row lock. Previously, controller RPC errors that represent these expected guard outcomes bubbled into the generic 500 handler. The controller now translates known database guard errors to stable HTTP statuses:

- `CHAT_NOT_FOUND` → 404
- `CHAT_FORBIDDEN` → 403
- `CHAT_BLOCKED` → 423 with `CHAT_BLOCKED` code
- `CHAT_MESSAGE_EMPTY` → 400

Unknown errors still flow through the existing error logger and generic server-error handling. Database RPC enforcement remains authoritative; this is not a substitute for membership checks or RLS.

## Validation

- `node --check backend/controllers/chatController.js` — PASS
- `node scripts/validate-messaging-rpc-error-contract-20261010.mjs` — PASS
- `node scripts/validate-messaging-hardening-20261010.mjs` — PASS
- `node scripts/validate-chat-notification-routing.mjs` — PASS
- `node scripts/validate-chat-surface-convergence.mjs` — PASS
- `node scripts/validate-communications-initiative.mjs` — PASS
- `node scripts/validate-socket-contract.mjs` — PASS
- `node scripts/validate-navigation-convergence.mjs` — PASS (43/43)

## Not certified in this environment

Full dependency install, TypeScript/Vite build, Vitest suite, live database RPC execution, authenticated browser messaging, session restoration, socket delivery under concurrency, and production deployment were not run. No commit, push, deployment, or migration was performed.
