import React, { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { inspectionApi } from '../InspectionMarketplace/services/api';
import { InspectionPaymentError, settleBookingPayment } from '../InspectionMarketplace/services/inspectionPayment';
import { InspectionRecord, isPlausiblePhone } from './inspectionJourney';

const fieldClass =
  'w-full px-3.5 py-3 bg-[#F6FAF9] text-[#0A3340] placeholder-[#91CEC5] border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#176B87] focus:bg-white';

interface PayProps {
  record: InspectionRecord | null;
  onClose: () => void;
  /** Called after the server reported the booking paid, so the list can be reloaded from the API. */
  onPaid: () => void;
  /** Test seam only: polling cadence. Production uses the helper defaults. */
  pollIntervalMs?: number;
}

/** Pays an existing, unpaid provider booking. Never creates a booking. */
export const PayBookingModal: React.FC<PayProps> = ({ record, onClose, onPaid, pollIntervalMs }) => {
  const uid = useId();
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<'idle' | 'waiting' | 'paid'>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlight = useRef(false);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!record || !record.bookingId) return null;
  const invalid = touched && !isPlausiblePhone(phone);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    setTouched(true);
    if (!isPlausiblePhone(phone)) return;
    inFlight.current = true;
    setError(null);
    setState('waiting');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await settleBookingPayment(record.bookingId!, phone.trim(), { signal: controller.signal, intervalMs: pollIntervalMs });
      setState('paid');
      onPaid();
    } catch (err) {
      if (err instanceof InspectionPaymentError && err.kind === 'aborted') return;
      setState('idle');
      setError(err instanceof Error ? err.message : 'The payment could not be completed. Please try again.');
    } finally {
      inFlight.current = false;
    }
  };

  const waiting = state === 'waiting';

  return (
    <Modal isOpen onClose={() => { if (!waiting) onClose(); }} title="Complete payment" description={`${record.vehicleTitle} · ${record.reference}`} size="md" closeOnBackdrop={!waiting} closeOnEscape={!waiting}>
      {state === 'paid' ? (
        <div role="status" className="text-center space-y-3 py-2">
          <CheckCircle2 className="w-10 h-10 mx-auto text-[#13B8A6]" aria-hidden="true" />
          <p className="text-base font-bold text-[#12576d]">Payment confirmed by KAYAD</p>
          <p className="text-sm text-[#64748B]">Your booking is now paid. Its status updates in My inspections.</p>
          <Button variant="primary" onClick={onClose}>Done</Button>
        </div>
      ) : (
        <form onSubmit={pay} noValidate className="space-y-4" aria-busy={waiting}>
          <dl className="rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-4 text-sm space-y-1.5">
            <div className="flex justify-between gap-4"><dt className="text-[#64748B]">Amount</dt><dd className="font-bold text-[#0A3340]">{record.priceText || 'Shown on M-Pesa prompt'}</dd></div>
            {record.providerName && <div className="flex justify-between gap-4"><dt className="text-[#64748B]">Provider</dt><dd className="font-semibold text-[#0A3340] text-right">{record.providerName}</dd></div>}
          </dl>
          <div className="space-y-1.5">
            <label htmlFor={`${uid}-phone`} className="text-xs font-bold text-[#64748B] block">M-Pesa phone number</label>
            <input
              id={`${uid}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="e.g. 0712 345 678"
              value={phone}
              disabled={waiting}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? `${uid}-phone-error` : undefined}
              className={`${fieldClass} ${invalid ? 'border-rose-400' : 'border-[#D7E7E4]'}`}
            />
            {invalid && <p id={`${uid}-phone-error`} className="text-xs font-semibold text-rose-600">Enter a valid phone number (9–15 digits).</p>}
          </div>
          {waiting && (
            <p role="status" className="flex items-start gap-2 text-sm text-[#12576D] rounded-xl border border-[#CDE9E5] bg-[#F5FBFA] p-3">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" aria-hidden="true" />
              <span>Check your phone and enter your M-Pesa PIN. We are waiting for KAYAD to confirm the payment — do not pay twice.</span>
            </p>
          )}
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-[#D7E7E4]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={waiting}>Not now</Button>
            <Button type="submit" variant="accent" className="font-bold" disabled={waiting || !isPlausiblePhone(phone)}>{waiting ? 'Waiting for M-Pesa…' : 'Send M-Pesa prompt'}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

interface CancelProps {
  record: InspectionRecord | null;
  onClose: () => void;
  onCancelled: () => void;
}

/**
 * Cancels an UNPAID provider booking so its slot is released. Paid bookings are
 * deliberately not offered here: the cancel endpoint only calculates a policy
 * refund figure, it does not execute a refund.
 */
export const CancelBookingModal: React.FC<CancelProps> = ({ record, onClose, onCancelled }) => {
  const uid = useId();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  if (!record || !record.bookingId) return null;

  const confirm = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await inspectionApi.cancelBooking(record.bookingId!, reason.trim() || 'Cancelled by customer before payment');
      onCancelled();
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'The booking could not be cancelled. Please try again.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={() => { if (!busy) onClose(); }} title="Cancel this booking?" description={`${record.vehicleTitle} · ${record.reference}`} size="md">
      <div className="space-y-4">
        <p className="text-sm text-[#12576D]">This booking has not been paid. Cancelling releases the time slot and nothing is charged.</p>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-reason`} className="text-xs font-bold text-[#64748B] block">Reason (optional)</label>
          <textarea id={`${uid}-reason`} rows={3} maxLength={400} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} className={`${fieldClass} border-[#D7E7E4]`} />
        </div>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-[#D7E7E4]">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Keep booking</Button>
          <Button variant="danger" onClick={() => void confirm()} disabled={busy}>{busy ? 'Cancelling…' : 'Cancel booking'}</Button>
        </div>
      </div>
    </Modal>
  );
};
