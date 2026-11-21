-- KAYAD Escrow Live Settlement Completion Hardening
-- Ensures every canonical escrow refund, including legacy payment-less escrows,
-- has an explicit external settlement record. Does not change the state machine.

CREATE OR REPLACE FUNCTION public.kayad_ensure_escrow_refund_payable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'refunded' THEN
    INSERT INTO public.refunds(payment_id, escrow_id, amount, reason, status, initiated_by, created_at, updated_at)
    SELECT NEW.payment, NEW.id, NEW.amount, COALESCE(NEW."disputeReason", 'Escrow refund'), 'pending', NEW."refundedBy", now(), now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.refunds r
      WHERE r.escrow_id = NEW.id
        AND r.status IN ('pending','processing','completed')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_escrow_refund_payable ON public.escrows;
CREATE TRIGGER trg_escrow_refund_payable
AFTER UPDATE OF status ON public.escrows
FOR EACH ROW
WHEN (NEW.status = 'refunded' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.kayad_ensure_escrow_refund_payable();

-- The route supplies the escrow id as a binding check before the canonical
-- refund-completion RPC. Keep the existing RPC signature for compatibility.
COMMENT ON FUNCTION public.kayad_ensure_escrow_refund_payable() IS
'Creates a pending refund settlement record whenever an escrow reaches refunded, including payment-less legacy escrows.';
