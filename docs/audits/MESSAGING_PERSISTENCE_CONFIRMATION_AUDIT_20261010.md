# Messaging Persistence Confirmation Audit — 2026-10-10

## Scope

Focused hardening on the existing chat send path. No schema, route, UI, authentication, or database migration changes.

## Finding

`sendMessage` previously generated a random UUID and current timestamp when the database RPC returned no usable message payload. The request could then emit a Socket.IO `newMessage` event and create a recipient notification despite the backend not being able to confirm the persisted record identity.

## Fix

- Require the RPC result to be an object containing both `id` and `createdAt` before creating lead activity, emitting realtime events, or sending a notification.
- If persistence cannot be confirmed, return HTTP 502 with stable code `CHAT_MESSAGE_PERSISTENCE_UNCONFIRMED` and do not run downstream side effects.
- Use persisted ID/timestamp directly; retain defensive normalization for returned text, seenBy, and attachments.
- Add `scripts/validate-messaging-persistence-confirmation-20261010.mjs` to guard this contract.

## Validation

Source-level regression validator and JavaScript syntax check pass. Full application build, Vitest suite, live database/RPC verification, and authenticated browser messaging journey remain unverified in this environment.

## Operational note

A 502 can occur after a database transaction committed if the RPC response itself was malformed. The client should refresh the conversation before retrying, to avoid a duplicate send. No automatic retry is added.

## Deployment status

No commit, push, deployment, or database migration was performed.
