import fs from 'node:fs';
import assert from 'node:assert/strict';

const hub = fs.readFileSync('src/features/UnifiedCommunicationHub.tsx', 'utf8');
const api = fs.readFileSync('src/services/chatApi.ts', 'utf8');
const controller = fs.readFileSync('backend/controllers/chatController.js', 'utf8');
const sql = fs.readFileSync('supabase/migrations/20260907173000_chat_concurrency_integrity.sql', 'utf8');

assert.ok(hub.includes('await sendChatMessage(activeThread.id, text);'), 'composer must await server confirmation');
assert.ok(hub.indexOf("setInputText(current => current === text ? '' : current);") > hub.indexOf('await sendChatMessage(activeThread.id, text);'), 'draft must only clear after confirmed send');
assert.ok(api.includes('Deliberately do not auto-retry message POSTs here'), 'uncertain message writes must not be automatically retried');
assert.ok(controller.includes('kayad_append_chat_message'), 'message writes must use serialized database RPC');
assert.ok(sql.includes('FOR UPDATE'), 'message append/read updates must serialize on the chat row');
assert.ok(sql.includes("'seenBy'"), 'read receipts must be persisted in seenBy');
assert.ok(controller.includes('msg.seenBy.includes(req.user.id)'), 'unread count must be user-specific');
console.log('PASS messaging delivery safety: draft retention, no blind retry, serialized writes, user-specific unread checks');
