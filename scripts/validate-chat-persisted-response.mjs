import fs from 'node:fs';

const api = fs.readFileSync('src/services/chatApi.ts', 'utf8');
const hub = fs.readFileSync('src/features/UnifiedCommunicationHub.tsx', 'utf8');
const controller = fs.readFileSync('backend/controllers/chatController.js', 'utf8');
const checks = [
  ['send API returns canonical persisted message', /sendChatMessage\(chatId: string, text: string\): Promise<BackendMessage>/.test(api)],
  ['send response validates canonical ID and timestamp', /persisted\.id !== 'string'/.test(api) && /persisted\.createdAt !== 'string'/.test(api)],
  ['POST does not auto-retry uncertain writes', /pendingMessageKeys/.test(api) && !/for\s*\(|while\s*\(/.test(api.slice(api.indexOf('export async function sendChatMessage'), api.indexOf('/** POST \/api\/chat\/:chatId\/seen')))],
  ['composer uses server-confirmed message', /const persistedMessage = await sendChatMessage/.test(hub)],
  ['history refresh failure retains confirmed send', /realMessages = \[persistedMessage\]/.test(hub)],
  ['backend emits the canonical persisted message ID', /buildNewMessageEvent\(chatId, messageData\)/.test(controller) && /id: m\.id, chatId/.test(fs.readFileSync('backend/services/chatOutbox.service.js', 'utf8'))],
  ['backend validates persistence before realtime emit', /CHAT_MESSAGE_PERSISTENCE_UNCONFIRMED/.test(controller)],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} chat persisted-response checks passed`);
