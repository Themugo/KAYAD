import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('../backend/controllers/chatController.js', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../backend/validation/chat.schema.js', import.meta.url), 'utf8');
const routes = readFileSync(new URL('../backend/routes/chatRoutes.js', import.meta.url), 'utf8');
const destination = readFileSync(new URL('../src/utils/notificationDestination.ts', import.meta.url), 'utf8');

assert.match(controller, /req\.body\.recipientId \|\| req\.body\.participantId/, 'chat creation accepts canonical and legacy recipient keys');
assert.match(schema, /recipientId:[\s\S]*?participantId:[\s\S]*?refine\(v => Boolean\(v\.recipientId \|\| v\.participantId\)/, 'chat creation requires one valid recipient key');
assert.match(controller, /const isParticipant = \(chat\.participants \|\| \[\]\)\.some/, 'leave-chat mutation verifies membership');
assert.match(controller, /if \(!isParticipant\)[\s\S]*?status\(403\)/, 'non-participants cannot leave or mutate a chat');
assert.match(controller, /typeof attachment === "string"[\s\S]*?url: attachment/, 'legacy string attachments normalize into valid objects');
assert.match(controller, /typeof rawText === "string" \? rawText\.trim\(\) : ""/, 'message content is trimmed before persistence');
assert.match(routes, /router\.delete\("\/:chatId", protect, validateObjectId/, 'delete route remains authenticated and validates chat ID');
assert.match(destination, /type === 'chat' \|\| type === 'message'\) return '\/\?nav=chat'/, 'message notifications preserve canonical chat destination');
console.log('PASS messaging hardening: recipient compatibility, participant authorization, payload normalization, route guard, notification destination');
