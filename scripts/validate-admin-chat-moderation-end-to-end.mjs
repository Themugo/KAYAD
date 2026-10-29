import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const read = (name) => fs.readFileSync(path.resolve(name), 'utf8');
const ui = read('src/pages/admin/AdminChatModeration.jsx');
const routes = read('backend/routes/adminRoutes.js');
const schema = read('backend/validation/query.schema.js');
const middleware = read('backend/middleware/validate.js');
const tests = read('src/__tests__/pages/admin/AdminChatModeration.test.jsx');
const checks = [
  ['chat list request has request-sequence protection', /listRequest\s*=\s*useRef/.test(ui)],
  ['message request has request-sequence protection', /messageRequest\s*=\s*useRef/.test(ui)],
  ['list response shape is validated', /unexpected chat-list response/.test(ui)],
  ['message response shape is validated', /unexpected message response/.test(ui)],
  ['list failures render an alert', /role="alert"/.test(ui) && /Conversations could not be loaded/.test(ui)],
  ['list has retry action', /Retry loading chats/.test(ui)],
  ['message failures render a separate retry action', /Retry messages/.test(ui)],
  ['empty state is guarded by successful-load condition', /!error\s*&&\s*chats\.length\s*===\s*0/.test(ui)],
  ['search is explicitly submitted', /onSubmit=\{submitSearch\}/.test(ui)],
  ['blocked status filter is available', /value="blocked"/.test(ui) && /value="unblocked"/.test(ui)],
  ['chat IDs support canonical and legacy forms', /value\?\._id\s*\|\|\s*value\?\.id/.test(ui)],
  ['message deletion requires confirmation', /window\.confirm\('Delete this message/.test(ui)],
  ['block and unblock require confirmation', /window\.confirm\(`\$\{block \? 'Block' : 'Unblock'\}/.test(ui)],
  ['delete action is disabled without message ID', /disabled=\{!msgId/.test(ui)],
  ['chat list route is query-validated', /"\/chats",\s*staffRole,\s*validateQuery\(chatListQuerySchema\)/.test(routes)],
  ['search user IDs are scoped for query and count', /let userIds = null;[\s\S]*?const queryFilter =/.test(routes)],
  ['count uses the same filter as list', /Chat\.countDocuments\(queryFilter\)/.test(routes)],
  ['list responses are not cached', /res\.set\("Cache-Control", "no-store"\)/.test(routes)],
  ['sort order is deterministic', /sort\(\{ updatedAt: -1, _id: -1 \}\)/.test(routes)],
  ['chat query validates search length', /search:\s*z\.string\(\)\.trim\(\)\.max\(120\)\.optional\(\)/.test(schema)],
  ['chat query validates block filter', /isBlocked:\s*z\.enum\(\["true", "false"\]\)\.optional\(\)/.test(schema)],
  ['message ID validation accepts UUID and legacy ObjectId formats', /Invalid message ID format/.test(routes) && /\[0-9a-f\]\{24\}/.test(routes)],
  ['tests cover list API failure', /shows a retryable error instead of an empty state/.test(tests)],
  ['tests cover malformed list envelope', /unexpected list response envelopes/.test(tests)],
  ['tests cover explicit search submission', /submits search explicitly/.test(tests)],
  ['tests cover message API failure', /surfaces message-load errors/.test(tests)],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
