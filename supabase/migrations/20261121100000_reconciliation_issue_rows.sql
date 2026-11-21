-- 20261121100000_reconciliation_issue_rows.sql
-- GAP-ESC-OPS (2026-11-21). reconciliation_reports stores its findings in the JSONB column `issues`
-- (an array of objects carrying type, severity, resolved, escrowId ...). Application code queried a
-- non-existent `issueDetails` path (translated by the data layer into the invalid embedded resource
-- `issue_details`), which made the escrow operations dashboard return HTTP 500 and made the finance and
-- reconciliation statistics silently wrong.
--
-- This adds ONE read-only function that expands the JSONB array server-side so every consumer shares one
-- definition of "unresolved":
--   * only JSON ARRAYS are read (a NULL, object or scalar `issues` yields no rows);
--   * only JSON OBJECT elements count (null/number/string/array elements are ignored, never counted);
--   * an issue is RESOLVED only when its `resolved` value is exactly true (boolean or the text "true");
--     a missing `resolved` key is treated as UNRESOLVED (fail-safe: never hide an open financial issue).
-- It does not modify any table or row. Execute is granted to service_role only (the backend).
-- ROLLBACK: DROP FUNCTION public.kayad_reconciliation_issue_rows(text,text,text,text,timestamptz,timestamptz,integer);

CREATE OR REPLACE FUNCTION public.kayad_reconciliation_issue_rows(
  p_state text DEFAULT 'unresolved',        -- 'unresolved' | 'resolved' | 'any'
  p_severity text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_escrow_id text DEFAULT NULL,            -- matches issue->>'escrowId' or issue->>'escrow'
  p_since timestamptz DEFAULT NULL,         -- report created_at >= p_since
  p_until timestamptz DEFAULT NULL,         -- report created_at <= p_until
  p_report_limit integer DEFAULT NULL       -- keep only the N most recent reports that have matching rows
) RETURNS TABLE (
  report_uuid uuid, report_id text, report_type text, report_status text,
  report_created_at timestamptz, issue_index integer, issue jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_state NOT IN ('unresolved','resolved','any') THEN
    RAISE EXCEPTION 'Invalid issue state filter' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  WITH expanded AS (
    SELECT r.id AS rid, r.report_id AS rrid, r.report_type AS rtype, r.status AS rstatus, r.created_at AS rcreated,
           (e.ord - 1)::integer AS idx, e.val AS val
    FROM public.reconciliation_reports r
    CROSS JOIN LATERAL jsonb_array_elements(r.issues) WITH ORDINALITY AS e(val, ord)
    WHERE jsonb_typeof(r.issues) = 'array'
      AND jsonb_typeof(e.val) = 'object'
      AND (p_since IS NULL OR r.created_at >= p_since)
      AND (p_until IS NULL OR r.created_at <= p_until)
  ), matched AS (
    SELECT x.* FROM expanded x
    WHERE (p_state = 'any'
           OR (p_state = 'unresolved' AND COALESCE(x.val ->> 'resolved', 'false') <> 'true')
           OR (p_state = 'resolved'   AND COALESCE(x.val ->> 'resolved', 'false') =  'true'))
      AND (p_severity  IS NULL OR x.val ->> 'severity' = p_severity)
      AND (p_type      IS NULL OR x.val ->> 'type' = p_type)
      AND (p_escrow_id IS NULL OR x.val ->> 'escrowId' = p_escrow_id OR x.val ->> 'escrow' = p_escrow_id)
  ), ranked AS (
    SELECT m.*, dense_rank() OVER (ORDER BY m.rcreated DESC, m.rid) AS rk FROM matched m
  )
  SELECT k.rid, k.rrid, k.rtype, k.rstatus, k.rcreated, k.idx, k.val
  FROM ranked k
  WHERE p_report_limit IS NULL OR k.rk <= p_report_limit
  ORDER BY k.rcreated DESC, k.rid, k.idx;
END; $$;

REVOKE ALL ON FUNCTION public.kayad_reconciliation_issue_rows(text,text,text,text,timestamptz,timestamptz,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_reconciliation_issue_rows(text,text,text,text,timestamptz,timestamptz,integer) TO service_role;
COMMENT ON FUNCTION public.kayad_reconciliation_issue_rows IS 'Read-only expansion of reconciliation_reports.issues (JSONB array of objects). Single definition of resolved/unresolved for dashboards, statistics, exports.';
