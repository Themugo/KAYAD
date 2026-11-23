# SQL for the owner (Supabase SQL editor) — dealer launch 2026-11-23

Nothing here was run against your hosted project. Run the blocks in order; each is safe to repeat.

## Why a migration is needed
`kayad_create_lead_atomic` creates a **new lead for every chat message** (its `ON CONFLICT DO NOTHING` never fires because the business-identity index is not unique). The fix replaces the function body only.
* Dependencies: none (same signature, same JSON return, same grants — `CREATE OR REPLACE` keeps them).
* Backward compatibility: callers (`leadService.resolveLead`) are unchanged; with the old function the app still works (it just keeps creating duplicate leads).
* Data: no rows are read-modified or deleted. Historic duplicates remain (see block 2; cleaning them is a separate decision).
* Financial functions: untouched.
* Approval: this is a separate approval; do not apply it unless you decide to.

## 1. Pre-flight (read-only)
```sql
select pg_get_functiondef('public.kayad_create_lead_atomic(uuid,uuid,uuid,text,text,numeric)'::regprocedure) ilike '%on conflict%' as old_body_still_installed;
select count(*) as leads_total from public.leads;
```

## 2. How many duplicate leads already exist (read-only)
```sql
select count(*) as duplicate_groups, coalesce(sum(c - 1), 0) as surplus_rows
from (select count(*) c from public.leads group by buyer, dealer, vehicle, source, source_reference having count(*) > 1) t;
```

## 3. Apply (the file `supabase/migrations/20261123210000_lead_create_find_before_insert.sql`)
```sql
CREATE OR REPLACE FUNCTION public.kayad_create_lead_atomic(
  p_buyer UUID, p_dealer UUID, p_vehicle UUID, p_source TEXT, p_source_reference TEXT, p_estimated_value NUMERIC DEFAULT 0
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
```

## 4. Verify (read-only)
```sql
select pg_get_functiondef('public.kayad_create_lead_atomic(uuid,uuid,uuid,text,text,numeric)'::regprocedure) ilike '%on conflict%' as old_body_still_installed;  -- expect false
select has_function_privilege('anon', 'public.kayad_create_lead_atomic(uuid,uuid,uuid,text,text,numeric)', 'execute') as anon_can_execute;  -- expect false if migration 20261011093000 (revoke client execute) is applied; this migration does not change grants
```
Then send one test enquiry from a personal account to one of your own vehicles, send two messages, and run:
```sql
select count(*) from public.leads where source = 'chat' and created_at > now() - interval '15 minutes';  -- expect 1 per conversation
```

## Rollback
The previous body is in `supabase/migrations/20260907200100_lead_crm_domain_end_to_end.sql` (function `kayad_create_lead_atomic`). Re-running that `CREATE OR REPLACE FUNCTION` restores the old behaviour; no data is affected either way.

## Nothing else needs SQL
The dealer-approval release of held listings, lead replies, vehicle requests, lead names and the dashboard are application changes (deploy only).
