# KAYAD Messaging Hardening Sweep — 2026-10-10

## Foundation

Continued from `KAYAD-NEXT-FOUNDATION-VISUAL-VIEWPORT-AUDIT-20261010.zip`. This sweep is source-only and local. No Git push, deployment, live account action, or database migration was performed.

## Targeted changes

1. **Leave-chat authorization:** `deleteChat` now verifies the requesting user is a participant before removing the chat or changing its participant list. A chat ID alone is not authority; non-participants receive 403.
2. **Create-chat contract convergence:** accepts canonical `recipientId` and legacy `participantId`, requiring one valid UUID. Controller resolves the canonical key first. This avoids a schema/controller naming mismatch breaking older clients while keeping validation strict.
3. **Message payload normalization:** trims message text before persistence, rejects whitespace-only content through schema validation, and normalizes both legacy string attachments and object attachments to a consistent `{url, type}` representation.
4. **Regression validator:** added `scripts/validate-messaging-hardening-20261010.mjs` to guard participant authorization, create-chat key compatibility, attachment normalization, route authentication, and canonical notification routing.

## Validation executed

- `node --check backend/controllers/chatController.js` — PASS
- `node --check backend/validation/chat.schema.js` — PASS
- `node scripts/validate-messaging-hardening-20261010.mjs` — PASS
- `node scripts/validate-chat-notification-routing.mjs` — PASS
- `node scripts/validate-chat-surface-convergence.mjs` — PASS
- `node scripts/validate-communications-initiative.mjs` — PASS
- `node scripts/validate-socket-contract.mjs` — PASS
- `node scripts/validate-navigation-convergence.mjs` — PASS (43/43)

## Not certified in this environment

- Full TypeScript/Vite build and Vitest runtime suite were not run in this sweep.
- No real authenticated browser session, Socket.IO session, or production API was exercised.
- Message tab redirect to login remains unresolved pending session/auth request diagnostics. These source-level changes do not claim to fix that separate symptom.
- Attachment URLs are still validated as URLs by the existing schema; provider/storage ownership and signed URL policy need separate review before tightening allowed hosts, to avoid breaking existing attachment providers.

## Scope guard

No homepage/hero visuals, mobile navigation design, payment/auction flows, auth guard policy, migrations, or production configuration were changed.
