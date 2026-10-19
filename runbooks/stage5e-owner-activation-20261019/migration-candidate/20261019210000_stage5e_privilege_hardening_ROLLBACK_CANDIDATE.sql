-- STAGE 5E — rollback of the privilege candidate: restores the OBSERVED hosted state (service_role without EXECUTE). Use only to undo an
-- unexpected regression and record why; that state makes subscription activation fail.
DO $$
BEGIN
  IF to_regprocedure('public.kayad_activate_dealer_subscription_atomic(uuid,uuid,text,text,numeric,text,integer,jsonb,integer,text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.kayad_activate_dealer_subscription_atomic(uuid,uuid,text,text,numeric,text,integer,jsonb,integer,text) FROM service_role;
  END IF;
END $$;
