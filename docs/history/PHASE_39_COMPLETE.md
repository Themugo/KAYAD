# Phase 39 — Socket.IO Authorization Boundary Hardening

## Scope
Harden the legacy Socket.IO server boundary without changing the canonical frontend Supabase Realtime transport.

## Changes
- Public auction sockets may only join rooms backed by a real `cars` row.
- Private chat sockets require authentication and verified membership in `chats.participants`.
- Typing events require the socket to already hold an authorized chat room.
- Typing identity is derived from the authenticated socket user; client-supplied `userId`/`name` are ignored.
- Database authorization failures fail closed and never grant room access.
- Added `scripts/validate-phase39.mjs` and `npm run validate:phase39`.

## Validation
- Socket auction room authorization: PASS
- Chat participant authorization: PASS
- Typing room authorization: PASS
- Client identity spoofing protection: PASS
- UUID room validation: PASS
