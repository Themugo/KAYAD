-- KAYAD high-risk boundary sweep 2026-10-02.
-- This migration is additive and preserves the existing service-role API model.

-- -------------------------------------------------------------------------
-- OWNERSHIP / PASSPORT CONSISTENCY
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_validate_owner_vehicle_passport()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_passport public.vehicle_passports%ROWTYPE;
BEGIN
  IF NEW.passport_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_passport
  FROM public.vehicle_passports
  WHERE id = NEW.passport_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Passport does not exist';
  END IF;

  IF v_passport.vin IS NOT NULL
     AND NEW.vin IS NOT NULL
     AND upper(btrim(v_passport.vin)) <> upper(btrim(NEW.vin)) THEN
    RAISE EXCEPTION 'Owner vehicle VIN does not match passport VIN';
  END IF;

  IF v_passport.registration_number IS NOT NULL
     AND NEW.registration_number IS NOT NULL
     AND upper(btrim(v_passport.registration_number)) <> upper(btrim(NEW.registration_number)) THEN
    RAISE EXCEPTION 'Owner vehicle registration does not match passport registration';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_owner_vehicle_passport_consistency ON public.owner_vehicles;
CREATE TRIGGER trg_owner_vehicle_passport_consistency
  BEFORE INSERT OR UPDATE OF passport_id, vin, registration_number
  ON public.owner_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.kayad_validate_owner_vehicle_passport();

-- Direct browser access remains denied; the API uses service_role.
ALTER TABLE public.owner_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.owner_vehicles, public.vehicle_passports, public.vehicle_documents, public.ownership_documents
  FROM anon, authenticated;

-- -------------------------------------------------------------------------
-- WEBHOOK REPLAY / INVENTORY CONVERGENCE
-- -------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_events_source_dedupe
  ON public.webhook_events(event_source, dedupe_key);

COMMENT ON TABLE public.webhook_events IS
  'Backend-owned replay-protected inbound provider and integration webhook receipts.';

-- -------------------------------------------------------------------------
-- COMMUNICATION DELIVERY DEFENSE
-- -------------------------------------------------------------------------
ALTER TABLE public.communication_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.communication_deliveries FROM anon, authenticated;

-- -------------------------------------------------------------------------
-- PAYMENT / LEDGER DEFENSE
-- -------------------------------------------------------------------------
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.ledger_entries FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ledger_accounts FROM anon, authenticated;

COMMENT ON TABLE public.ledger_entries IS
  'Backend-owned append-only financial ledger. Mutations occur only through canonical service-role RPCs.';
