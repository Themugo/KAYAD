-- Lead creation is find-or-create on the business key (buyer, dealer, vehicle, source, source_reference).
-- DEFECT FIXED: the old body relied on `INSERT ... ON CONFLICT DO NOTHING`, but idx_leads_business_identity is a plain (non-unique)
-- index, so nothing ever conflicted and every chat message / enquiry inserted ANOTHER lead for the same conversation.
-- The function now looks the lead up first (under the same advisory lock that already serialises identical keys) and inserts only
-- when none exists. Same signature and return shape; existing grants are preserved. Historical duplicate rows are NOT touched here
-- (no destructive cleanup); see docs/handover/DEALER-LAUNCH-20261123 for a read-only query that counts them.
CREATE OR REPLACE FUNCTION kayad_create_lead_atomic(
  p_buyer UUID,
  p_dealer UUID,
  p_vehicle UUID,
  p_source TEXT,
  p_source_reference TEXT,
  p_estimated_value NUMERIC DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_created BOOLEAN := false;
  v_key TEXT := concat_ws('|', COALESCE(p_buyer::text,''), COALESCE(p_dealer::text,''), COALESCE(p_vehicle::text,''), COALESCE(p_source,''), COALESCE(p_source_reference,''));
  v_zero CONSTANT UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));
  SELECT * INTO v_lead FROM leads
  WHERE COALESCE(buyer,v_zero)=COALESCE(p_buyer,v_zero)
    AND COALESCE(dealer,v_zero)=COALESCE(p_dealer,v_zero)
    AND COALESCE(vehicle,v_zero)=COALESCE(p_vehicle,v_zero)
    AND COALESCE(source,'')=COALESCE(p_source,'')
    AND COALESCE(source_reference,'')=COALESCE(p_source_reference,'')
  ORDER BY created_at ASC LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO leads (buyer,dealer,vehicle,source,source_reference,estimated_value,last_activity_at)
    VALUES (p_buyer,p_dealer,p_vehicle,p_source,p_source_reference,GREATEST(COALESCE(p_estimated_value,0),0),now())
    RETURNING * INTO v_lead;
    v_created := true;
  END IF;
  RETURN jsonb_build_object('lead', to_jsonb(v_lead), 'created', v_created);
END $$;

NOTIFY pgrst, 'reload schema';
