import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('../backend/controllers/chatController.js', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20260907173000_chat_concurrency_integrity.sql', import.meta.url), 'utf8');

assert.match(controller, /const respondToChatRpcError = \(res, error\)/, 'chat RPC failures have a shared HTTP response mapper');
assert.match(controller, /CHAT_NOT_FOUND[\s\S]*?status\(404\)/, 'missing chat maps to 404');
assert.match(controller, /CHAT_FORBIDDEN[\s\S]*?status\(403\)/, 'RPC-level membership failures map to 403');
assert.match(controller, /CHAT_BLOCKED[\s\S]*?status\(423\)/, 'blocked chat maps to 423');
assert.match(controller, /CHAT_MESSAGE_EMPTY[\s\S]*?status\(400\)/, 'empty message maps to 400');
assert.match(controller, /if \(rpcError\) \{[\s\S]*?respondToChatRpcError\(res, rpcError/, 'send-message RPC errors are normalized');
assert.match(controller, /if \(seenError\) \{[\s\S]*?respondToChatRpcError\(res, seenError/, 'mark-seen RPC errors are normalized');
for (const code of ['CHAT_NOT_FOUND', 'CHAT_FORBIDDEN', 'CHAT_BLOCKED', 'CHAT_MESSAGE_EMPTY']) {
  assert.ok(migration.includes(code), `database RPC defines ${code}`);
}
console.log('PASS messaging RPC error contract: stable HTTP mapping for not-found, forbidden, blocked and empty-message outcomes');
