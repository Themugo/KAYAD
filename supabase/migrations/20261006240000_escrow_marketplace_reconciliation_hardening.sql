-- KAYAD Escrow -> Marketplace reconciliation hardening
--
-- This migration closes two cross-domain gaps discovered after live-operations
-- hardening:
--   1) dispute partial/split settlements could create a buyer payable without
--      creating the external refund settlement record;
--   2) escrow status could change successfully while the related
--      purchase_outcome remained stale if application-side sync failed.
--
-- Both corrections are database-side and execute in the same transaction as
-- the canonical escrow mutation. No second escrow or marketplace workflow is
-- introduced.

-- ---------------------------------------------------------------------------
-- Buyer settlement/refund payable record for partial/split dispute outcomes.
-- A payment_id may legitimately be NULL for legacy payment-less escrows.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_ensure_dispute_refund_settlement_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_buyer_amount numeric := COALESCE((NEW."disputeResolution"->>'buyerAmount')::numeric, 0);
BEGIN
  IF NEW.status = 'refunded' OR v_buyer_amount > 0 THEN
    INSERT INTO public.refunds(
      payment_id, escrow_id, amount, reason, status, initiated_by, created_at, updated_at
    )
    SELECT
      NEW.payment,
      NEW.id,
      CASE
        WHEN NEW.status = 'refunded' THEN NEW.amount
        ELSE v_buyer_amount
      END,
      COALESCE(NEW."disputeReason", 'Dispute settlement buyer refund'),
      'pending',
      COALESCE(NEW."refundedBy", NULLIF((NEW."disputeResolution"->>'decidedBy')::uuid, NULL)),
      now(),
      now()
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.refunds r
      WHERE r.escrow_id = NEW.id
        AND r.status IN ('pending', 'processing', 'completed')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_escrow_dispute_refund_settlement ON public.escrows;
CREATE TRIGGER trg_escrow_dispute_refund_settlement
AFTER UPDATE OF status, "disputeResolution" ON public.escrows
FOR EACH ROW
WHEN (
  NEW.status = 'refunded'
  OR COALESCE((NEW."disputeResolution"->>'buyerAmount')::numeric, 0) > 0
)
EXECUTE FUNCTION public.kayad_ensure_dispute_refund_settlement_record();

-- ---------------------------------------------------------------------------
-- Canonical escrow -> purchase outcome reconciliation.
-- Runs after the authoritative escrow state mutation, inside the same DB
-- transaction. Application-side sync remains as a compatibility/no-op path.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_sync_purchase_outcome_from_escrow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_outcome public.purchase_outcomes%ROWTYPE;
  v_next_status text;
  v_collection text;
  v_transfer text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_outcome
  FROM public.purchase_outcomes
  WHERE escrow_id = NEW.id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'disputed' THEN
    IF v_outcome.status IN ('payment_received', 'ready_for_collection', 'collected', 'transfer_pending') THEN
      UPDATE public.purchase_outcomes
      SET status = 'disputed', updated_at = now()
      WHERE id = v_outcome.id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'refunded' THEN
    IF v_outcome.status IN ('refund_pending', 'disputed') THEN
      UPDATE public.purchase_outcomes
      SET status = 'refunded',
          collection_status = 'blocked',
          transfer_status = 'blocked',
          updated_at = now()
      WHERE id = v_outcome.id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IN ('funded', 'vehicle_confirmed', 'delivered', 'released') THEN
    v_next_status := v_outcome.status;
    v_collection := v_outcome.collection_status;
    v_transfer := v_outcome.transfer_status;

    IF v_outcome.status IN ('payment_received', 'disputed') THEN
      v_next_status := 'ready_for_collection';
      v_collection := 'ready';
    ELSIF v_outcome.status = 'collected' THEN
      v_next_status := 'transfer_pending';
      v_transfer := 'pending';
    ELSIF v_outcome.status = 'transfer_pending' THEN
      v_next_status := 'transfer_pending';
    ELSIF v_outcome.status IN ('ready_for_collection', 'completed') THEN
      v_next_status := v_outcome.status;
    END IF;

    IF NEW.status = 'released' AND v_outcome.transfer_status = 'completed' THEN
      v_next_status := 'completed';
      v_transfer := 'completed';
    END IF;

    IF v_next_status IS DISTINCT FROM v_outcome.status
       OR v_collection IS DISTINCT FROM v_outcome.collection_status
       OR v_transfer IS DISTINCT FROM v_outcome.transfer_status THEN
      UPDATE public.purchase_outcomes
      SET status = v_next_status,
          collection_status = v_collection,
          transfer_status = v_transfer,
          updated_at = now()
      WHERE id = v_outcome.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_escrow_purchase_outcome_reconciliation ON public.escrows;
CREATE TRIGGER trg_escrow_purchase_outcome_reconciliation
AFTER UPDATE OF status ON public.escrows
FOR EACH ROW
EXECUTE FUNCTION public.kayad_sync_purchase_outcome_from_escrow();

COMMENT ON FUNCTION public.kayad_sync_purchase_outcome_from_escrow() IS
'Keeps the canonical Marketplace purchase outcome aligned with escrow state inside the same PostgreSQL transaction.';

REVOKE ALL ON FUNCTION public.kayad_sync_purchase_outcome_from_escrow() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_sync_purchase_outcome_from_escrow() TO service_role;

COMMENT ON FUNCTION public.kayad_ensure_dispute_refund_settlement_record() IS
'Creates an external refund settlement record for full, partial, split, and legacy payment-less escrow buyer settlements.';

REVOKE ALL ON FUNCTION public.kayad_ensure_dispute_refund_settlement_record() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_ensure_dispute_refund_settlement_record() TO service_role;
