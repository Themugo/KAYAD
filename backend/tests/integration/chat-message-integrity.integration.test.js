/**
 * Opt-in PostgreSQL/Supabase integration test. Uses a pre-created, disposable
 * two-participant chat; it does not create users or mutate production data.
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KAYAD_CHAT_TEST_CHAT_ID,
 * KAYAD_CHAT_TEST_USER_A_ID, KAYAD_CHAT_TEST_USER_B_ID.
 * Run from backend with: node --test tests/integration/chat-message-integrity.integration.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'KAYAD_CHAT_TEST_CHAT_ID', 'KAYAD_CHAT_TEST_USER_A_ID', 'KAYAD_CHAT_TEST_USER_B_ID'];
const configured = required.every((key) => Boolean(process.env[key]));

test('PostgreSQL chat idempotency, concurrency, ordering and per-user receipts', { skip: !configured }, async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const chatId = process.env.KAYAD_CHAT_TEST_CHAT_ID;
  const userA = process.env.KAYAD_CHAT_TEST_USER_A_ID;
  const userB = process.env.KAYAD_CHAT_TEST_USER_B_ID;
  const { data: before, error: readError } = await sb.from('chats').select('participants,messages,isBlocked').eq('id', chatId).single();
  assert.ifError(readError);
  assert.equal(before.isBlocked, false);
  assert.ok(before.participants.includes(userA) && before.participants.includes(userB), 'fixture chat must contain both test users');

  const key = randomUUID();
  const payload = { p_chat_id: chatId, p_sender_id: userA, p_text: `integration-idempotency-${key}`, p_attachments: [], p_idempotency_key: key };
  const concurrent = await Promise.all([
    sb.rpc('kayad_append_chat_message_idempotent', payload),
    sb.rpc('kayad_append_chat_message_idempotent', payload),
    sb.rpc('kayad_append_chat_message_idempotent', payload),
  ]);
  for (const result of concurrent) assert.ifError(result.error);
  const ids = concurrent.map((result) => result.data.message.id);
  assert.equal(new Set(ids).size, 1, 'same concurrent key must return one canonical message ID');
  assert.equal(concurrent.filter((result) => result.data.replayed === false).length, 1, 'exactly one request should append');

  const retry = await sb.rpc('kayad_append_chat_message_idempotent', payload);
  assert.ifError(retry.error);
  assert.equal(retry.data.message.id, ids[0]);
  assert.equal(retry.data.replayed, true);

  const reusedKey = await sb.rpc('kayad_append_chat_message_idempotent', { ...payload, p_text: `${payload.p_text}-changed` });
  assert.match(String(reusedKey.error?.message || ''), /CHAT_IDEMPOTENCY_KEY_REUSED/);

  const orderKeys = [randomUUID(), randomUUID(), randomUUID()];
  const orderedResults = [];
  for (let i = 0; i < orderKeys.length; i += 1) {
    const result = await sb.rpc('kayad_append_chat_message_idempotent', {
      ...payload, p_text: `integration-order-${orderKeys[i]}`, p_idempotency_key: orderKeys[i],
    });
    assert.ifError(result.error);
    orderedResults.push(result.data.message.id);
  }
  const { data: after, error: afterError } = await sb.from('chats').select('messages').eq('id', chatId).single();
  assert.ifError(afterError);
  const storedIds = after.messages.map((message) => message.id);
  assert.ok(storedIds.indexOf(orderedResults[0]) < storedIds.indexOf(orderedResults[1]));
  assert.ok(storedIds.indexOf(orderedResults[1]) < storedIds.indexOf(orderedResults[2]));

  const { data: beforeSeen, error: beforeSeenError } = await sb.from('chats').select('messages').eq('id', chatId).single();
  assert.ifError(beforeSeenError);
  const outgoingIds = new Set([...ids, ...orderedResults]);
  const outgoingBeforeSeen = beforeSeen.messages.filter((message) => outgoingIds.has(message.id));
  assert.equal(outgoingBeforeSeen.filter((message) => !message.seenBy.includes(userB)).length, outgoingIds.size,
    'recipient unread count for this test batch must equal the number of newly appended messages');
  assert.equal(outgoingBeforeSeen.filter((message) => message.sender !== userA && !message.seenBy.includes(userA)).length, 0,
    'sender must not count their own messages as unread');

  const { error: seenError } = await sb.rpc('kayad_mark_chat_seen', { p_chat_id: chatId, p_user_id: userB });
  assert.ifError(seenError);
  const { data: seenChat, error: seenReadError } = await sb.from('chats').select('messages').eq('id', chatId).single();
  assert.ifError(seenReadError);
  const testedMessages = seenChat.messages.filter((message) => ids.includes(message.id) || orderedResults.includes(message.id));
  assert.ok(testedMessages.length >= 4);
  assert.ok(testedMessages.every((message) => message.seenBy.includes(userB)), 'recipient receipt must be recorded for each tested sender-A message');
  assert.ok(testedMessages.every((message) => !message.seenBy.includes(userA)), 'sender must not be marked as having read their own messages');
});
