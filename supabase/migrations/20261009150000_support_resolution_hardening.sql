-- KAYAD Support & Resolution Center hardening (additive, idempotent).
-- Fixes: ticket_number NOT NULL with no generator (case creation failed on a migration-built DB),
-- customer-visible internal notes via direct owner SELECT, staff/customer confusion in the append RPC,
-- unvalidated lifecycle transitions, customer text stored in a staff field, function grants to anon/authenticated.

CREATE SEQUENCE IF NOT EXISTS support_ticket_number_seq;

CREATE OR REPLACE FUNCTION kayad_support_assign_ticket_number() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR btrim(NEW.ticket_number) = '' THEN
    NEW.ticket_number := 'SUP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('support_ticket_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_support_ticket_number ON support_tickets;
CREATE TRIGGER trg_support_ticket_number BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION kayad_support_assign_ticket_number();

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS related_inspection UUID,
  ADD COLUMN IF NOT EXISTS related_auction UUID,
  ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopen_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_customer_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_staff_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS satisfaction_comment TEXT,
  ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_support_tickets_user_idempotency
  ON support_tickets(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Customer rating text used to be written into the staff-semantic resolution_notes column.
-- Data-preservation: the original value is copied to legacy_resolution_notes BEFORE it is cleared, so the move is
-- lossless and reversible; one aggregate audit row records how many rows were touched.
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS legacy_resolution_notes TEXT;
DO $$
DECLARE v_moved integer;
BEGIN
  WITH moved AS (
    UPDATE support_tickets
    SET legacy_resolution_notes = resolution_notes,
        satisfaction_comment = resolution_notes,
        resolution_notes = NULL
    WHERE satisfaction_rating IS NOT NULL AND resolution_notes IS NOT NULL AND satisfaction_comment IS NULL
      AND legacy_resolution_notes IS NULL
    RETURNING 1)
  SELECT count(*) INTO v_moved FROM moved;
  IF v_moved > 0 THEN
    INSERT INTO audit_logs(action, entity_type, details)
    VALUES ('support.migration_rating_comment_moved', 'support_ticket',
            jsonb_build_object('rows', v_moved, 'migration', '20261009150000', 'backup_column', 'legacy_resolution_notes'));
  END IF;
END $$;

-- Category / length are validated inside kayad_support_create_case (and by the Node policy). Table-level CHECKs are
-- intentionally NOT added: NOT VALID checks would still block any UPDATE of a legacy row that violates them.
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_ticket_category_check;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_ticket_length_check;

-- ---------------------------------------------------------------------------
-- Only support agents (role technical_support = PERM.SUPPORT_AGENT default) may be assigned / escalated to.
-- admin/superadmin hold read-only oversight and are never case assignees.
CREATE OR REPLACE FUNCTION kayad_support_is_staff_user(p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM users u WHERE u.id = p_user_id AND u.deleted_at IS NULL
                 AND COALESCE(u.status,'approved') NOT IN ('suspended','banned','rejected','deleted')
                 AND u.role = 'technical_support');
$$;

CREATE OR REPLACE FUNCTION kayad_support_transition_allowed(p_from text, p_to text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_from
    WHEN 'open' THEN p_to IN ('in_progress','waiting_on_user','waiting_on_internal','escalated','resolved')
    WHEN 'in_progress' THEN p_to IN ('waiting_on_user','waiting_on_internal','escalated','resolved')
    WHEN 'waiting_on_user' THEN p_to IN ('in_progress','waiting_on_internal','escalated','resolved')
    WHEN 'waiting_on_internal' THEN p_to IN ('in_progress','waiting_on_user','escalated','resolved')
    WHEN 'escalated' THEN p_to IN ('in_progress','waiting_on_user','waiting_on_internal','resolved')
    WHEN 'resolved' THEN p_to IN ('closed','in_progress')
    ELSE false END;
$$;

-- ---------------------------------------------------------------------------
-- Create (idempotent on user + key). Server-side Node validates references and category; this is the atomic write.
CREATE OR REPLACE FUNCTION kayad_support_create_case(
  p_user_id uuid, p_category text, p_priority text, p_subject text, p_description text,
  p_related jsonb DEFAULT '{}'::jsonb, p_idempotency_key text DEFAULT NULL, p_sla jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_row support_tickets%ROWTYPE;
BEGIN
  IF NULLIF(btrim(p_subject),'') IS NULL OR NULLIF(btrim(p_description),'') IS NULL THEN
    RAISE EXCEPTION 'SUPPORT_CASE_INVALID' USING ERRCODE = 'P0001';
  END IF;
  IF p_category IS NULL OR p_category NOT IN ('marketplace','seller','auction','inspection','service_provider','escrow','financing','transfer','account','technical','general') THEN
    RAISE EXCEPTION 'SUPPORT_CATEGORY_INVALID' USING ERRCODE = 'P0001';
  END IF;
  IF char_length(btrim(p_subject)) > 200 OR char_length(btrim(p_description)) > 5000 THEN
    RAISE EXCEPTION 'SUPPORT_CASE_TOO_LONG' USING ERRCODE = 'P0001';
  END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_row FROM support_tickets WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN jsonb_build_object('id', v_row.id, 'ticket_number', v_row.ticket_number, 'deduplicated', true); END IF;
  END IF;
  BEGIN
    INSERT INTO support_tickets(user_id, category, priority, subject, description, status,
      related_escrow, related_car, related_payment, related_inspection, related_auction,
      sla, idempotency_key, messages, message_count)
    VALUES (p_user_id, p_category, COALESCE(p_priority,'medium'), btrim(p_subject), btrim(p_description), 'open',
      NULLIF(p_related->>'escrow','')::uuid, NULLIF(p_related->>'car','')::uuid, NULLIF(p_related->>'payment',''),
      NULLIF(p_related->>'inspection','')::uuid, NULLIF(p_related->>'auction','')::uuid,
      COALESCE(p_sla,'{}'::jsonb), p_idempotency_key, '[]'::jsonb, 0)
    RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_row FROM support_tickets WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
    IF NOT FOUND THEN RAISE; END IF;
    RETURN jsonb_build_object('id', v_row.id, 'ticket_number', v_row.ticket_number, 'deduplicated', true);
  END;
  RETURN jsonb_build_object('id', v_row.id, 'ticket_number', v_row.ticket_number, 'deduplicated', false);
END $$;

-- ---------------------------------------------------------------------------
-- Append: actor kind is explicit ('customer' | 'staff'), never derived from the application role.
CREATE OR REPLACE FUNCTION kayad_support_append_message(
  p_ticket_id uuid, p_actor_id uuid, p_actor_kind text, p_content text,
  p_is_internal boolean DEFAULT false, p_reopen_window_days integer DEFAULT 14
) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_t support_tickets%ROWTYPE; v_msg jsonb; v_now timestamptz := now();
  v_status text; v_reopened boolean := false; v_first boolean := false;
BEGIN
  IF p_actor_kind NOT IN ('customer','staff') THEN RAISE EXCEPTION 'SUPPORT_ACTOR_INVALID' USING ERRCODE='P0001'; END IF;
  IF NULLIF(btrim(p_content),'') IS NULL THEN RAISE EXCEPTION 'SUPPORT_MESSAGE_EMPTY' USING ERRCODE='P0001'; END IF;
  IF char_length(p_content) > 5000 THEN RAISE EXCEPTION 'SUPPORT_MESSAGE_TOO_LONG' USING ERRCODE='P0001'; END IF;
  SELECT * INTO v_t FROM support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUPPORT_TICKET_NOT_FOUND' USING ERRCODE='P0001'; END IF;
  IF p_actor_kind = 'customer' THEN
    IF v_t.user_id IS DISTINCT FROM p_actor_id THEN RAISE EXCEPTION 'SUPPORT_TICKET_NOT_FOUND' USING ERRCODE='P0001'; END IF;
    IF p_is_internal THEN RAISE EXCEPTION 'SUPPORT_INTERNAL_FORBIDDEN' USING ERRCODE='P0001'; END IF;
  END IF;
  IF v_t.status = 'closed' THEN RAISE EXCEPTION 'SUPPORT_TICKET_CLOSED' USING ERRCODE='P0001'; END IF;

  v_status := v_t.status;
  IF p_actor_kind = 'customer' THEN
    IF v_t.status = 'resolved' THEN
      IF v_t.resolved_at IS NOT NULL AND v_t.resolved_at < v_now - make_interval(days => GREATEST(p_reopen_window_days,0)) THEN
        RAISE EXCEPTION 'SUPPORT_REOPEN_WINDOW_EXPIRED' USING ERRCODE='P0001';
      END IF;
      v_status := 'open'; v_reopened := true;
    ELSIF v_t.status = 'waiting_on_user' THEN v_status := 'in_progress';
    END IF;
  ELSIF NOT p_is_internal THEN
    IF v_t.status = 'open' THEN v_status := 'in_progress'; END IF;
    v_first := v_t.first_response_at IS NULL;
  END IF;

  v_msg := jsonb_build_object('id', gen_random_uuid(), 'sender', p_actor_id, 'senderKind', p_actor_kind,
    'senderRole', CASE WHEN p_actor_kind='staff' THEN 'support' ELSE 'customer' END,
    'content', btrim(p_content), 'isInternal', COALESCE(p_is_internal,false), 'attachments','[]'::jsonb, 'createdAt', v_now);

  UPDATE support_tickets SET
    messages = COALESCE(messages,'[]'::jsonb) || jsonb_build_array(v_msg),
    message_count = COALESCE(message_count,0) + 1,
    first_response_at = CASE WHEN v_first THEN v_now ELSE first_response_at END,
    status = v_status,
    resolved_at = CASE WHEN v_reopened THEN NULL ELSE resolved_at END,
    closed_at = CASE WHEN v_reopened THEN NULL ELSE closed_at END,
    reopened_at = CASE WHEN v_reopened THEN v_now ELSE reopened_at END,
    reopen_count = reopen_count + CASE WHEN v_reopened THEN 1 ELSE 0 END,
    last_customer_message_at = CASE WHEN p_actor_kind='customer' THEN v_now ELSE last_customer_message_at END,
    last_staff_message_at = CASE WHEN p_actor_kind='staff' AND NOT p_is_internal THEN v_now ELSE last_staff_message_at END,
    row_version = row_version + 1, updated_at = v_now
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object('message', v_msg, 'status', v_status, 'reopened', v_reopened,
                            'firstResponse', v_first, 'previousStatus', v_t.status);
END $$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kayad_support_update_case(
  p_ticket_id uuid, p_actor_id uuid, p_expected_version integer,
  p_status text DEFAULT NULL, p_priority text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL, p_escalated_to uuid DEFAULT NULL,
  p_resolution_note text DEFAULT NULL, p_clear_assignee boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_t support_tickets%ROWTYPE; v_now timestamptz := now(); v_new text; v_changes jsonb := '{}'::jsonb;
BEGIN
  SELECT * INTO v_t FROM support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUPPORT_TICKET_NOT_FOUND' USING ERRCODE='P0001'; END IF;
  IF p_expected_version IS NOT NULL AND p_expected_version <> v_t.row_version THEN
    RAISE EXCEPTION 'SUPPORT_VERSION_CONFLICT' USING ERRCODE='P0001';
  END IF;
  IF p_priority IS NOT NULL AND p_priority NOT IN ('low','medium','high','urgent') THEN RAISE EXCEPTION 'SUPPORT_PRIORITY_INVALID' USING ERRCODE='P0001'; END IF;
  IF p_assigned_to IS NOT NULL AND NOT kayad_support_is_staff_user(p_assigned_to) THEN RAISE EXCEPTION 'SUPPORT_ASSIGNEE_INVALID' USING ERRCODE='P0001'; END IF;
  IF p_escalated_to IS NOT NULL AND NOT kayad_support_is_staff_user(p_escalated_to) THEN RAISE EXCEPTION 'SUPPORT_ASSIGNEE_INVALID' USING ERRCODE='P0001'; END IF;
  IF v_t.status = 'closed' THEN RAISE EXCEPTION 'SUPPORT_TICKET_CLOSED' USING ERRCODE='P0001'; END IF;

  v_new := v_t.status;
  IF p_escalated_to IS NOT NULL AND p_status IS NULL THEN p_status := 'escalated'; END IF;
  IF p_status IS NOT NULL AND p_status <> v_t.status THEN
    IF p_status NOT IN ('open','in_progress','waiting_on_user','waiting_on_internal','escalated','resolved','closed') THEN
      RAISE EXCEPTION 'SUPPORT_STATUS_INVALID' USING ERRCODE='P0001'; END IF;
    IF NOT kayad_support_transition_allowed(v_t.status, p_status) THEN
      RAISE EXCEPTION 'SUPPORT_TRANSITION_INVALID' USING ERRCODE='P0001'; END IF;
    IF p_status = 'resolved' AND NULLIF(btrim(COALESCE(p_resolution_note,'')),'') IS NULL THEN
      RAISE EXCEPTION 'SUPPORT_RESOLUTION_NOTE_REQUIRED' USING ERRCODE='P0001'; END IF;
    v_new := p_status;
  END IF;

  UPDATE support_tickets SET
    status = v_new,
    priority = COALESCE(p_priority, priority),
    assigned_to = CASE WHEN p_clear_assignee THEN NULL ELSE COALESCE(p_assigned_to, assigned_to) END,
    escalated_to = COALESCE(p_escalated_to, escalated_to),
    escalated = escalated OR v_new = 'escalated',
    resolution_notes = CASE WHEN v_new = 'resolved' AND v_t.status <> 'resolved' THEN btrim(p_resolution_note) ELSE resolution_notes END,
    resolved_at = CASE WHEN v_new = 'resolved' AND v_t.status <> 'resolved' THEN v_now
                       WHEN v_new = 'in_progress' AND v_t.status = 'resolved' THEN NULL ELSE resolved_at END,
    closed_at = CASE WHEN v_new = 'closed' THEN v_now ELSE closed_at END,
    closed_by = CASE WHEN v_new = 'closed' THEN p_actor_id ELSE closed_by END,
    row_version = row_version + 1, updated_at = v_now
  WHERE id = p_ticket_id;

  v_changes := jsonb_build_object('from', v_t.status, 'to', v_new, 'priority', p_priority,
                                  'assignedTo', p_assigned_to, 'escalatedTo', p_escalated_to, 'cleared', p_clear_assignee);
  INSERT INTO audit_logs(actor_id, action, entity_type, entity_id, details, actor_role)
  VALUES (p_actor_id, 'support.case_updated', 'support_ticket', p_ticket_id, v_changes, 'support_staff');

  RETURN jsonb_build_object('id', p_ticket_id, 'status', v_new, 'previousStatus', v_t.status, 'rowVersion', v_t.row_version + 1,
                            'userId', v_t.user_id, 'assignedTo', COALESCE(p_assigned_to, v_t.assigned_to));
END $$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kayad_support_rate_case(p_ticket_id uuid, p_user_id uuid, p_rating integer, p_comment text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_t support_tickets%ROWTYPE;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'SUPPORT_RATING_INVALID' USING ERRCODE='P0001'; END IF;
  SELECT * INTO v_t FROM support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND OR v_t.user_id IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'SUPPORT_TICKET_NOT_FOUND' USING ERRCODE='P0001'; END IF;
  IF v_t.status NOT IN ('resolved','closed') THEN RAISE EXCEPTION 'SUPPORT_RATING_NOT_ALLOWED' USING ERRCODE='P0001'; END IF;
  IF v_t.satisfaction_rating IS NOT NULL THEN RAISE EXCEPTION 'SUPPORT_ALREADY_RATED' USING ERRCODE='P0001'; END IF;
  UPDATE support_tickets SET satisfaction_rating = p_rating,
    satisfaction_comment = NULLIF(left(btrim(COALESCE(p_comment,'')), 1000), ''),
    rated_at = now(), row_version = row_version + 1, updated_at = now()
  WHERE id = p_ticket_id;
  RETURN jsonb_build_object('id', p_ticket_id, 'rating', p_rating);
END $$;

-- ---------------------------------------------------------------------------
-- Metrics computed in SQL over a bounded window (no row cap, no application-side truncation).
CREATE OR REPLACE FUNCTION kayad_support_metrics(p_since timestamptz, p_first_target_minutes integer DEFAULT NULL, p_resolution_target_minutes integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'since', p_since,
    'total', count(*),
    'byStatus', COALESCE((SELECT jsonb_object_agg(status, c) FROM (SELECT status, count(*) c FROM support_tickets WHERE created_at >= p_since GROUP BY status) s), '{}'::jsonb),
    'byCategory', COALESCE((SELECT jsonb_object_agg(COALESCE(category,'unknown'), c) FROM (SELECT category, count(*) c FROM support_tickets WHERE created_at >= p_since GROUP BY category) s), '{}'::jsonb),
    'openBacklog', (SELECT count(*) FROM support_tickets WHERE status NOT IN ('resolved','closed')),
    'unassignedOpen', (SELECT count(*) FROM support_tickets WHERE status NOT IN ('resolved','closed') AND assigned_to IS NULL),
    'awaitingFirstResponse', (SELECT count(*) FROM support_tickets WHERE status NOT IN ('resolved','closed') AND first_response_at IS NULL),
    'medianFirstResponseMinutes', (SELECT round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM first_response_at - created_at)/60))::numeric, 1) FROM support_tickets WHERE created_at >= p_since AND first_response_at IS NOT NULL),
    'medianResolutionMinutes', (SELECT round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM resolved_at - created_at)/60))::numeric, 1) FROM support_tickets WHERE created_at >= p_since AND resolved_at IS NOT NULL),
    'firstResponseWithinTarget', CASE WHEN p_first_target_minutes IS NULL THEN NULL ELSE (SELECT count(*) FROM support_tickets WHERE created_at >= p_since AND first_response_at IS NOT NULL AND first_response_at <= created_at + make_interval(mins => p_first_target_minutes)) END,
    'resolutionWithinTarget', CASE WHEN p_resolution_target_minutes IS NULL THEN NULL ELSE (SELECT count(*) FROM support_tickets WHERE created_at >= p_since AND resolved_at IS NOT NULL AND resolved_at <= created_at + make_interval(mins => p_resolution_target_minutes)) END,
    'averageRating', (SELECT round(avg(satisfaction_rating)::numeric, 2) FROM support_tickets WHERE created_at >= p_since AND satisfaction_rating IS NOT NULL),
    'ratedCount', (SELECT count(*) FROM support_tickets WHERE created_at >= p_since AND satisfaction_rating IS NOT NULL)
  ) FROM support_tickets WHERE created_at >= p_since;
$$;

-- The legacy append RPC trusted a caller-supplied role string. Keep the name (no destructive drop) but make it inert.
CREATE OR REPLACE FUNCTION kayad_append_support_message(
  p_ticket_id uuid, p_sender_id uuid, p_sender_role text, p_content text,
  p_is_internal boolean DEFAULT false, p_attachments jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'SUPPORT_RPC_DEPRECATED: use kayad_support_append_message' USING ERRCODE = 'P0001';
END $$;

-- ---------------------------------------------------------------------------
-- Privileges: every support function is service_role only (Supabase default privileges would otherwise expose
-- them to anon/authenticated). Table writes only via those functions.
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'kayad_support_assign_ticket_number()',
    'kayad_support_is_staff_user(uuid)',
    'kayad_support_transition_allowed(text,text)',
    'kayad_support_create_case(uuid,text,text,text,text,jsonb,text,jsonb)',
    'kayad_support_append_message(uuid,uuid,text,text,boolean,integer)',
    'kayad_support_update_case(uuid,uuid,integer,text,text,uuid,uuid,text,boolean)',
    'kayad_support_rate_case(uuid,uuid,integer,text)',
    'kayad_support_metrics(timestamptz,integer,integer)',
    'kayad_append_support_message(uuid,uuid,text,text,boolean,jsonb)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

DROP POLICY IF EXISTS support_tickets_user_insert ON support_tickets;
REVOKE ALL ON support_tickets FROM anon;
REVOKE ALL ON support_tickets FROM authenticated;
-- Owners may read only the customer-safe columns (never messages, staff identities or SLA internals).
GRANT SELECT (id, user_id, ticket_number, category, priority, subject, description, status,
              related_escrow, related_car, related_payment, related_inspection, related_auction,
              satisfaction_rating, satisfaction_comment, message_count, created_at, updated_at, resolved_at, closed_at)
  ON support_tickets TO authenticated;

COMMENT ON TABLE support_tickets IS 'Canonical KAYAD support case. Writes only through kayad_support_* RPCs (service_role). Owners may SELECT customer-safe columns only; messages (incl. internal notes) are served by the backend after projection.';
