-- Chat message idempotency. Additive migration: do not rewrite the already-applied
-- 20260907173000_chat_concurrency_integrity.sql migration.
-- The chat row lock serializes append operations and the unique key is scoped to
-- the authenticated sender and conversation. A key reused with a different
-- payload is rejected rather than silently returning an unrelated message.

CREATE TABLE IF NOT EXISTS public.chat_message_idempotency (
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  request_text text NOT NULL,
  request_attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  persisted_message jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_message_idempotency_key_unique UNIQUE (chat_id, sender_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_idempotency_created_at
  ON public.chat_message_idempotency (created_at);

ALTER TABLE public.chat_message_idempotency ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.chat_message_idempotency FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_message_idempotency TO service_role;

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
  v_created_at timestamptz := clock_timestamp();
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

  SELECT * INTO v_existing
    FROM public.chat_message_idempotency
   WHERE chat_id = p_chat_id AND sender_id = p_sender_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing.request_text IS DISTINCT FROM p_text
       OR v_existing.request_attachments IS DISTINCT FROM v_attachments THEN
      RAISE EXCEPTION 'CHAT_IDEMPOTENCY_KEY_REUSED' USING ERRCODE = 'P0001';
    END IF;
    RETURN jsonb_build_object('message', v_existing.persisted_message, 'replayed', true);
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

COMMENT ON TABLE public.chat_message_idempotency IS
  'Durable idempotency records for chat sends; retention/cleanup must preserve the agreed retry horizon.';
