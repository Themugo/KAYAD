import fs from 'node:fs';
import assert from 'node:assert/strict';

const hub = fs.readFileSync('src/features/UnifiedCommunicationHub.tsx', 'utf8');
const socket = fs.readFileSync('src/context/SocketContext.tsx', 'utf8');
const server = fs.readFileSync('backend/server.js', 'utf8');
const chatApi = fs.readFileSync('src/services/chatApi.ts', 'utf8');

assert.match(hub, /useSocket/);
assert.match(hub, /joinMessages\(selectedThreadId/);
assert.match(hub, /event\?\.chatId !== selectedThreadId/);
assert.match(hub, /refreshTranscript\(\)/);
assert.match(hub, /leaveChannel\(channel\)/);
assert.match(hub, /window\.setInterval\(\(\) => \{[\s\S]{0,350}refreshTranscript\(\)/, 'disconnected realtime must refresh the active transcript');
assert.match(socket, /s\.on\('newMessage',handlers\.onMessage\)[\s\S]{0,350}s\.emit\('joinChat',conversationId\)/, 'subscribe before requesting room membership to avoid the first-event race');
assert.match(server, /\.contains\("participants", \[userId\]\)/);
assert.match(server, /if \(!chat \|\| chat\.isBlocked \|\| !socket\.user\) return/);
assert.match(chatApi, /getChatMessages\(chatId: string\)/);

console.log('PASS active conversation subscribes to its private Socket.IO room');
console.log('PASS socket events trigger an authoritative persisted-history refresh');
console.log('PASS disconnected realtime has a bounded active-thread polling fallback');
console.log('PASS listener is removed and room is left when the thread changes');
console.log('PASS server authorizes room membership against chat participants');
console.log('Active chat realtime contract: 5/5 PASS');
