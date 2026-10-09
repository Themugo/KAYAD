import React, { useId, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, Search, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { createInspectionOrder, InspectionApiError } from '../../services/inspectionApi';
import type { Vehicle } from '../../types';
import { InspectionRecord, isPlausiblePhone, kayadOrderToRecord } from './inspectionJourney';

interface RequestInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Vehicles currently loaded from the KAYAD marketplace. */
  vehicles: Vehicle[];
  /** The vehicle the customer came from (vehicle details page). Never replaced by a default. */
  initialVehicle?: Vehicle | null;
  /** Called with the record the SERVER returned, so the tracker can show it immediately. */
  onSubmitted: (record: InspectionRecord) => void;
  onViewMyInspections: () => void;
  /** The session ended while the form was open. */
  onSessionExpired?: () => void;
}

const fieldClass =
  'w-full px-3.5 py-3 bg-slate-50 text-slate-800 placeholder-slate-400 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#176B87] focus:bg-white';

export const RequestInspectionModal: React.FC<RequestInspectionModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  initialVehicle,
  onSubmitted,
  onViewMyInspections,
  onSessionExpired,
}) => {
  const uid = useId();
  const phoneId = `${uid}-phone`;
  const phoneErrorId = `${uid}-phone-error`;
  const vehicleId = `${uid}-vehicle`;
  const searchId = `${uid}-search`;

  const [selectedId, setSelectedId] = useState<string>(initialVehicle?.id || '');
  const [choosing, setChoosing] = useState<boolean>(!initialVehicle);
  const [query, setQuery] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; signIn?: boolean; duplicate?: boolean } | null>(null);
  const [confirmed, setConfirmed] = useState<InspectionRecord | null>(null);
  const inFlight = useRef(false);

  const options = useMemo(() => {
    const seen = new Set<string>();
    const list: Vehicle[] = [];
    for (const v of [initialVehicle, ...vehicles]) {
      if (v && !seen.has(v.id)) {
        seen.add(v.id);
        list.push(v);
      }
    }
    return list;
  }, [initialVehicle, vehicles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((v) => `${v.title} ${v.make} ${v.model} ${v.location}`.toLowerCase().includes(q) || v.id === selectedId);
  }, [options, query, selectedId]);

  const selected = options.find((v) => v.id === selectedId) || null;
  const phoneInvalid = phoneTouched && !isPlausiblePhone(phone);
  const canSubmit = Boolean(selected) && isPlausiblePhone(phone) && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // A second tap/Enter while the first request is in flight must not create a second order.
    if (inFlight.current) return;
    setPhoneTouched(true);
    if (!selected || !isPlausiblePhone(phone)) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createInspectionOrder(selected.id, phone.trim(), selected.location);
      if (!result.success || !result.order) {
        setError({ message: result.message || 'KAYAD could not create the inspection request. Please try again.' });
        return;
      }
      const record = kayadOrderToRecord({ ...result.order, car: { ...result.order.car, title: result.order.car?.title || selected.title } });
      setConfirmed(record);
      onSubmitted(record);
    } catch (err) {
      if (err instanceof InspectionApiError && err.kind === 'unauthenticated') {
        setError({ message: 'Your session has ended. Sign in again to request an inspection — your details here are kept.', signIn: true });
      } else if (err instanceof InspectionApiError && err.status === 409) {
        setError({ message: err.message || 'You already have an active inspection for this vehicle.', duplicate: true });
      } else {
        setError({ message: err instanceof Error && err.message ? err.message : 'Could not request the inspection. Please try again.' });
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Inspection requested" size="lg">
        <div className="text-center space-y-4 py-2" role="status">
          <div className="w-14 h-14 rounded-full bg-[#E8F5F3] text-[#0F5D73] flex items-center justify-center mx-auto border border-[#CDE9E5]">
            <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[#0F5D73] font-display">Your request is saved</h3>
            <p className="text-sm text-slate-600 mt-1">{confirmed.vehicleTitle}</p>
            <p className="text-xs text-slate-500 mt-1">Order reference: <strong className="font-mono text-slate-800 break-all">{confirmed.reference}</strong></p>
          </div>
          <dl className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-sm space-y-2 max-w-md mx-auto">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Status</dt><dd className="font-bold text-slate-800">{confirmed.status.label}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Next</dt><dd className="font-semibold text-slate-800 text-right">{confirmed.status.detail}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Payment</dt><dd className="font-semibold text-slate-800 text-right">{confirmed.paymentText}</dd></div>
          </dl>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Button variant="primary" onClick={() => { onClose(); onViewMyInspections(); }}>View my inspections</Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!submitting) onClose(); }} title="Request a KAYAD inspection" description="For a vehicle listed on KAYAD. KAYAD assigns the inspector." size="lg">
      <form onSubmit={submit} noValidate className="space-y-5" aria-busy={submitting}>
        <fieldset className="space-y-2" disabled={submitting}>
          <legend className="text-xs font-bold text-slate-600 mb-1">Vehicle to inspect</legend>
          {selected && !choosing ? (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-[#CDE9E5] bg-[#F5FBFA] p-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0F5D73] truncate">{selected.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{selected.location} · KSh {selected.price.toLocaleString()}</p>
              </div>
              <button type="button" className="text-xs font-bold text-[#0F5D73] underline underline-offset-2 whitespace-nowrap min-h-[44px] px-1" onClick={() => setChoosing(true)}>Change vehicle</button>
            </div>
          ) : options.length === 0 ? (
            <p className="text-sm text-slate-600 rounded-xl border border-slate-200 bg-slate-50 p-4">No KAYAD vehicles are available to inspect right now. Open a vehicle from the marketplace and choose “Request an inspection”.</p>
          ) : (
            <div className="space-y-2">
              <label htmlFor={searchId} className="sr-only">Search vehicles by make, model or location</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input id={searchId} type="search" className={`${fieldClass} pl-10 border-slate-200`} placeholder="Search by make, model or location" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <label htmlFor={vehicleId} className="text-xs font-semibold text-slate-600 block">KAYAD marketplace vehicle</label>
              <select
                id={vehicleId}
                value={selectedId}
                onChange={(e) => { setSelectedId(e.target.value); if (e.target.value) setChoosing(false); }}
                className={`${fieldClass} border-slate-200`}
              >
                <option value="">Select a vehicle…</option>
                {filtered.map((v) => (
                  <option key={v.id} value={v.id}>{v.title} — KSh {v.price.toLocaleString()} ({v.location})</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">Showing vehicles currently loaded from the KAYAD marketplace ({filtered.length}).</p>
            </div>
          )}
        </fieldset>

        <div className="space-y-1.5">
          <label htmlFor={phoneId} className="text-xs font-bold text-slate-600 block">Your phone number</label>
          <input
            id={phoneId}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="e.g. +254 712 345 678"
            value={phone}
            disabled={submitting}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setPhoneTouched(true)}
            aria-invalid={phoneInvalid || undefined}
            aria-describedby={phoneInvalid ? phoneErrorId : undefined}
            aria-required="true"
            className={`${fieldClass} ${phoneInvalid ? 'border-rose-400' : 'border-slate-200'}`}
          />
          {phoneInvalid && <p id={phoneErrorId} className="text-xs font-semibold text-rose-600">Enter a valid phone number (9–15 digits).</p>}
        </div>

        <div className="bg-[#E8F5F3] p-3.5 rounded-xl border border-[#CDE9E5] text-xs text-[#0A5A50] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#13B8A6] shrink-0 mt-0.5" aria-hidden="true" />
          <span><strong>No payment is taken when you submit.</strong> KAYAD records your request against the vehicle, assigns an inspector, and shows each step in My inspections.</span>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 space-y-2">
            <p>{error.message}</p>
            {error.signIn && onSessionExpired && <Button type="button" size="sm" variant="primary" onClick={onSessionExpired}>Sign in</Button>}
            {error.duplicate && <Button type="button" size="sm" variant="secondary" onClick={() => { onClose(); onViewMyInspections(); }}>View my inspections</Button>}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" variant="accent" className="font-bold" disabled={!canSubmit} aria-disabled={!canSubmit}>
            {submitting ? 'Submitting request…' : 'Submit inspection request'}
          </Button>
        </div>
        <p className="flex items-start gap-1.5 text-[11px] text-slate-500"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />Your phone number is saved with this request so KAYAD can reach you about it.</p>
      </form>
    </Modal>
  );
};

export default RequestInspectionModal;
