import fs from 'node:fs';
import assert from 'node:assert/strict';

const controller = fs.readFileSync('backend/controllers/chatController.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20261010193000_chat_message_idempotency.sql', 'utf8');
const client = fs.readFileSync('src/services/chatApi.ts', 'utf8');

assert.match(controller, /p_sender_id:\s*req\.user\.id/, 'message sender identity must come from authenticated request');
assert.match(controller, /const isReplay = rpcResult\?\.replayed === true/, 'controller must identify server-confirmed retries');
assert.match(controller, /if \(!isReplay\)\s*\{/, 'side effects must be suppressed for replayed sends');
assert.match(controller, /const \{ data: chats, error: chatsError \}/, 'unread count query must retain database errors');
assert.match(controller, /if \(chatsError\) throw chatsError/, 'unread count must fail visibly instead of returning a false zero');
assert.match(controller, /if \(!Array\.isArray\(chats\)\)/, 'unread count must reject an invalid query result');
assert.match(client, /pendingMessageKeys\.set\(pendingKey, idempotencyKey\)/, 'client must retain the key for an unresolved retry');
assert.match(client, /headers:\s*\{\s*'Idempotency-Key': idempotencyKey\s*\}/, 'client must transmit the stable key');
assert.match(migration, /FOR UPDATE/, 'message append must serialize on the conversation row');
assert.match(migration, /UNIQUE \(chat_id, sender_id, idempotency_key\)/, 'dedupe key must be scoped by chat and sender');
assert.match(migration, /CHAT_IDEMPOTENCY_KEY_REUSED/, 'changed payload under a reused key must be rejected');
console.log('PASS: authenticated sender binding, retry side-effect guard, unread-query failure handling, stable client key, transaction lock, scoped uniqueness, and changed-payload rejection.');
console.log('LIMIT: static source assertions only; not a substitute for API, PostgreSQL, two-account realtime, or browser integration tests.');
