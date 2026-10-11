-- Durable delivery for chat messages (defect D-MSG-4).
--
-- Failure mode this closes (reproduced by docs/messaging-consistency-audit/harness/tests/m8-chat-outbox.test.mjs):
--   kayad_append_chat_message_idempotent commits the message; the in-request side effects (recipient notification, realtime
--   fan-out) run AFTER the commit and are best-effort. If the process dies, restarts, or the notification write fails, the
--   message is saved but the recipient is never notified, and the client's retry is a *replay* which (correctly) performs no
--   side effects - so the notification is lost permanently. The UI has no realtime chat consumer, so the persisted
--   notification is the recipient's delivery channel.
--
-- Design (additive; the chats table remains the authoritative message store):
--   * chat_message_outbox(event_id = persisted message id) is written in the SAME transaction as the message -> atomic.
--   * ids only, no message content; RLS on, no client grants.
--   * kayad_claim_chat_outbox: SKIP LOCKED claim with a lease -> concurrent workers never process the same event, and a
--     crashed worker's lease simply expires.
--   * kayad_finish_chat_outbox: done, or retry with exponential backoff, or 'dead' after 8 attempts (kept for reconciliation).
--   * kayad_chat_notification_exists: lets the worker skip a notification that was already written (crash after create).
--   * kayad_chat_outbox_stats / kayad_purge_chat_outbox: observability and retention (done rows only).
-- Rollback: see docs/audits (re-apply 20261011091000 body, DROP the outbox functions/table). Rows are ids only.

CREATE TABLE IF NOT EXISTS public.chat_message_outbox (
  event_id        uuid PRIMARY KEY,
  chat_id         uuid NOT NULL,
  sender_id       uuid NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','dead')),
  attempts        integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until    timestamptz,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_chat_message_outbox_due ON public.chat_message_outbox (status, next_attempt_at) WHERE status IN ('pending','processing');
CREATE INDEX IF NOT EXISTS idx_chat_message_outbox_done ON public.chat_message_outbox (processed_at) WHERE status = 'done';
ALTER TABLE public.chat_message_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_message_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.chat_message_outbox TO service_role;

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
  v_message_id uuid := gen_random_uuid();
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
    'id', v_message_id,
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

  -- Transactional outbox: the delivery obligation (notify the recipient, fan out the realtime event) commits or rolls back
  -- together with the message. It carries ids only - never message text - and its key is the persisted message id.
  INSERT INTO public.chat_message_outbox (event_id, chat_id, sender_id)
  VALUES (v_message_id, p_chat_id, p_sender_id);

  RETURN jsonb_build_object('message', v_message, 'replayed', false);
END;
$$;


REVOKE ALL ON FUNCTION public.kayad_append_chat_message_idempotent(uuid, uuid, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_append_chat_message_idempotent(uuid, uuid, text, jsonb, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.kayad_claim_chat_outbox(p_limit integer DEFAULT 20, p_lease_seconds integer DEFAULT 60, p_min_age_seconds integer DEFAULT 30)
RETURNS SETOF public.chat_message_outbox
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- p_min_age_seconds: the request that wrote the message gets first chance to deliver inline and mark the event done.
  RETURN QUERY
  UPDATE public.chat_message_outbox o
     SET status = 'processing', attempts = o.attempts + 1, locked_until = now() + make_interval(secs => GREATEST(p_lease_seconds, 5))
   WHERE o.event_id IN (
           SELECT x.event_id FROM public.chat_message_outbox x
            WHERE x.created_at <= now() - make_interval(secs => GREATEST(p_min_age_seconds, 0))
              AND ((x.status = 'pending' AND x.next_attempt_at <= now()) OR (x.status = 'processing' AND x.locked_until < now()))
            ORDER BY x.created_at
            LIMIT GREATEST(1, LEAST(p_limit, 100))
            FOR UPDATE SKIP LOCKED)
  RETURNING o.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.kayad_finish_chat_outbox(p_event_id uuid, p_ok boolean, p_error text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF p_ok THEN
    UPDATE public.chat_message_outbox
       SET status = 'done', processed_at = now(), locked_until = NULL, last_error = NULL
     WHERE event_id = p_event_id AND status <> 'done';
  ELSE
    UPDATE public.chat_message_outbox
       SET status = CASE WHEN attempts >= 8 THEN 'dead' ELSE 'pending' END,
           next_attempt_at = now() + make_interval(secs => LEAST(900, 15 * power(2, LEAST(attempts, 10))::int)),
           locked_until = NULL,
           last_error = left(COALESCE(p_error, 'unknown'), 500)
     WHERE event_id = p_event_id AND status <> 'done';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.kayad_chat_notification_exists(p_user_id uuid, p_message_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.notifications n WHERE n.user_id = p_user_id AND n.type = 'chat' AND n.data->>'messageId' = p_message_id::text);
$$;

CREATE OR REPLACE FUNCTION public.kayad_chat_outbox_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'pending',    count(*) FILTER (WHERE status = 'pending'),
    'processing', count(*) FILTER (WHERE status = 'processing'),
    'dead',       count(*) FILTER (WHERE status = 'dead'),
    'done',       count(*) FILTER (WHERE status = 'done'),
    'oldestUndeliveredSeconds', COALESCE(floor(extract(epoch FROM now() - min(created_at) FILTER (WHERE status IN ('pending','processing'))))::int, 0)
  ) FROM public.chat_message_outbox;
$$;

CREATE OR REPLACE FUNCTION public.kayad_purge_chat_outbox(p_retention_days integer DEFAULT 7)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_n integer;
BEGIN
  DELETE FROM public.chat_message_outbox WHERE status = 'done' AND processed_at < now() - make_interval(days => GREATEST(p_retention_days, 1));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_claim_chat_outbox(integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.kayad_finish_chat_outbox(uuid, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.kayad_chat_notification_exists(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.kayad_chat_outbox_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.kayad_purge_chat_outbox(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_claim_chat_outbox(integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.kayad_finish_chat_outbox(uuid, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.kayad_chat_notification_exists(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.kayad_chat_outbox_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.kayad_purge_chat_outbox(integer) TO service_role;
