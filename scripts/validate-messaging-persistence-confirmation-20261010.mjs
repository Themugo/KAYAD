import fs from 'node:fs';
import assert from 'node:assert/strict';

const controller = fs.readFileSync('backend/controllers/chatController.js', 'utf8');
const sendStart = controller.indexOf('export const sendMessage = async');
const sendEnd = controller.indexOf('// =============================\n// 📥 GET MESSAGES', sendStart);
assert.ok(sendStart >= 0 && sendEnd > sendStart, 'sendMessage controller must exist');
const send = controller.slice(sendStart, sendEnd);
assert.match(send, /if \(!rpcMessage \|\| typeof rpcMessage !== "object" \|\| !rpcMessage\.id \|\| !rpcMessage\.createdAt\)/, 'must reject an RPC response without persisted identity/timestamp');
assert.match(send, /CHAT_MESSAGE_PERSISTENCE_UNCONFIRMED/, 'must expose stable persistence confirmation code');
assert.match(send, /return res\.status\(502\)/, 'must return gateway error when persistence cannot be confirmed');
assert.doesNotMatch(send, /id:\s*rpcMessage\?\.id\s*\|\|\s*crypto\.randomUUID\(\)/, 'must not fabricate a persisted message ID');
assert.doesNotMatch(send, /createdAt:\s*rpcMessage\?\.createdAt\s*\|\|\s*new Date\(\)\.toISOString\(\)/, 'must not fabricate persisted timestamp');
const persistGuard = send.indexOf('CHAT_MESSAGE_PERSISTENCE_UNCONFIRMED');
const emit = send.indexOf('.emit("newMessage"');
const notify = send.indexOf('sendNotification');
assert.ok(persistGuard >= 0 && emit > persistGuard && notify > persistGuard, 'realtime and notification side effects must follow persistence confirmation');
console.log('PASS messaging persistence confirmation contract');
