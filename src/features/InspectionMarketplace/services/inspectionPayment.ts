/**
 * Pays an EXISTING provider booking by M-Pesa and waits for the verified result.
 *
 * Shared by the booking wizard (first payment attempt and retries) and by
 * "My inspections" (a booking that was created but not paid). Extracting it is
 * what lets a failed payment be retried against the SAME booking: before this,
 * every retry created a second booking, which then collided with the slot the
 * unpaid first booking still held ("Time slot not available").
 *
 * Truth rules (unchanged from the original wizard):
 *  - The STK initiation response only proves a prompt was requested.
 *  - A booking is paid only when the backend payment record says `success`
 *    (set by the verified M-Pesa callback + the atomic inspection RPC), or
 *    when the server itself reports the booking `fully_paid`.
 */
import { inspectionApi } from './api';
import { getPaymentStatus } from '../../../services/paymentApi';

export type InspectionPaymentFailure = 'not_started' | 'failed' | 'still_pending' | 'aborted';

export class InspectionPaymentError extends Error {
  kind: InspectionPaymentFailure;
  constructor(message: string, kind: InspectionPaymentFailure) {
    super(message);
    this.name = 'InspectionPaymentError';
    this.kind = kind;
  }
}

export interface SettleOptions {
  signal?: AbortSignal;
  intervalMs?: number;
  maxAttempts?: number;
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new InspectionPaymentError('Payment check stopped.', 'aborted'));
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(timer); reject(new InspectionPaymentError('Payment check stopped.', 'aborted')); };
    signal?.addEventListener('abort', onAbort, { once: true });
  });

export async function settleBookingPayment(bookingId: string, phone: string, options: SettleOptions = {}): Promise<void> {
  const { signal, intervalMs = 2000, maxAttempts = 30 } = options;
  const payment = await inspectionApi.initiatePayment(bookingId, phone);
  if (payment?.paymentStatus === 'fully_paid') return;

  const checkoutRequestId = payment?.checkoutRequestID || payment?.checkoutID;
  if (!checkoutRequestId) {
    const reason = payment?.message ? ` ${payment.message}.` : '';
    throw new InspectionPaymentError(`The M-Pesa prompt could not be started.${reason} Your booking is saved and still awaiting payment.`.replace('..', '.'), 'not_started');
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await wait(intervalMs, signal);
    const status = await getPaymentStatus(checkoutRequestId);
    if (status.status === 'success') return;
    if (['failed', 'cancelled', 'refunded'].includes(status.status)) {
      throw new InspectionPaymentError('The M-Pesa payment was not completed. Your booking is saved and still awaiting payment.', 'failed');
    }
  }
  throw new InspectionPaymentError('We have not received the M-Pesa confirmation yet. Your booking is saved; check My inspections shortly before paying again.', 'still_pending');
}
