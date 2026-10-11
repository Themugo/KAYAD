-- Follow-up to 20261010193000_chat_message_idempotency.sql (defects D-MSG-1, D-MSG-2 found by
-- docs/messaging-consistency-audit/harness/tests/m2-idempotency.test.mjs).
--  D-MSG-1: createdAt was read in DECLARE (before the chat row lock), so under contention the JSONB array
--           order could differ from createdAt order. It is now taken after the lock.
--  D-MSG-2: a replay returned the first-send snapshot (stale seenBy). It now returns the live stored message.
-- Signature, grants and idempotency semantics are unchanged. Safe to re-run (CREATE OR REPLACE).
CREATE OR REPLACE FUNCTION public.kayad_append_chat_message_idempotent(
  p_chat_id uuid,
  p_sender_id uuid,
  p_text text,
  p_attachments jsonb DEFAULT '[]'::jsonb,
  p_idempotency_key uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_chat public.chats%ROWTYPE;
  v_existing public.chat_message_idempotency%ROWTYPE;
  v_message jsonb;
  v_attachments jsonb := COALESCE(p_attachments, '[]'::jsonb);
  v_created_at timestamptz;
  v_live jsonb;
BEGIN
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'CHAT_IDEMPOTENCY_KEY_REQUIRED' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_typeof(v_attachments) <> 'array' THEN
    RAISE EXCEPTION 'CHAT_ATTACHMENTS_INVALID' USING ERRCODE = 'P0001';
  END IF;

  -- Keep a single serialization point for message append and read receipts.
  SELECT * INTO v_chat FROM public.chats WHERE id = p_chat_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CHAT_NOT_FOUND' USING ERRCODE = 'P0001'; END IF;
  IF COALESCE(v_chat."isBlocked", false) THEN RAISE EXCEPTION 'CHAT_BLOCKED' USING ERRCODE = 'P0001'; END IF;
  IF NOT (p_sender_id = ANY(v_chat.participants)) THEN RAISE EXCEPTION 'CHAT_FORBIDDEN' USING ERRCODE = 'P0001'; END IF;
  IF NULLIF(trim(p_text), '') IS NULL THEN RAISE EXCEPTION 'CHAT_MESSAGE_EMPTY' USING ERRCODE = 'P0001'; END IF;

  -- Taken AFTER the row lock so persisted array order matches createdAt order under contention.
  v_created_at := clock_timestamp();

  SELECT * INTO v_existing
    FROM public.chat_message_idempotency
   WHERE chat_id = p_chat_id AND sender_id = p_sender_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing.request_text IS DISTINCT FROM p_text
       OR v_existing.request_attachments IS DISTINCT FROM v_attachments THEN
      RAISE EXCEPTION 'CHAT_IDEMPOTENCY_KEY_REUSED' USING ERRCODE = 'P0001';
    END IF;
    -- Return the current persisted message (reflects read receipts), not the first-send snapshot.
    SELECT m INTO v_live
      FROM jsonb_array_elements(COALESCE(v_chat.messages, '[]'::jsonb)) AS m
     WHERE m->>'id' = v_existing.persisted_message->>'id'
     LIMIT 1;
    RETURN jsonb_build_object('message', COALESCE(v_live, v_existing.persisted_message), 'replayed', true);
  END IF;

  v_message := jsonb_build_object(
    'id', gen_random_uuid(),
    'sender', p_sender_id,
    'text', p_text,
    'createdAt', v_created_at,
    'seenBy', '[]'::jsonb,
    'attachments', v_attachments
  );

  UPDATE public.chats
     SET messages = COALESCE(messages, '[]'::jsonb) || jsonb_build_array(v_message),
         "lastMessage" = p_text,
         "lastMessageAt" = v_created_at,
         "updatedAt" = v_created_at
   WHERE id = p_chat_id;

  INSERT INTO public.chat_message_idempotency
    (chat_id, sender_id, idempotency_key, request_text, request_attachments, persisted_message)
  VALUES
    (p_chat_id, p_sender_id, p_idempotency_key, p_text, v_attachments, v_message);

  RETURN jsonb_build_object('message', v_message, 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_append_chat_message_idempotent(uuid, uuid, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_append_chat_message_idempotent(uuid, uuid, text, jsonb, uuid) TO service_role;
