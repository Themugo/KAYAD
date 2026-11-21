import React, { useEffect, useState } from 'react';
import { FileCheck, ShieldCheck, ClipboardList } from 'lucide-react';
import type { Vehicle } from '../../types';
import { getMyInspections, type BackendInspectionOrder } from '../../services/inspectionApi';
import { Button } from '../ui';

interface Props {
  vehicle: Vehicle;
  /** Signed-in viewer (null/undefined = visitor). The booking list is only fetched for a signed-in viewer. */
  viewer?: { id?: string } | null;
  isOwnListing?: boolean;
  /** Existing inspection request flow (opens the inspection marketplace with this vehicle). */
  onRequestInspection?: (vehicle: Vehicle) => void;
  /** Existing "My inspections" / "Reports" tabs of the buyer dashboard. */
  onViewMyInspections?: (tab: 'mine' | 'reports') => void;
}

/** Statuses are exactly the backend's order statuses (see BackendInspectionOrder). Nothing is invented. */
const STATUS_COPY: Record<string, { label: string; detail: string }> = {
  pending_payment: { label: 'Inspection requested', detail: 'Your request for this vehicle is awaiting an inspector.' },
  assigned: { label: 'Inspector assigned', detail: 'An inspector has been assigned to your booking for this vehicle.' },
  in_progress: { label: 'Inspection in progress', detail: 'The inspector is working on this vehicle now.' },
  completed: { label: 'Inspection completed', detail: 'Your inspection of this vehicle is complete.' },
};

const sameCar = (o: BackendInspectionOrder, id: string) => String(o.car?.id ?? o.car?._id ?? '') === String(id);

/**
 * Inspection section of the vehicle details. States come only from (a) the listing's own
 * inspection-passed flag and (b) the signed-in buyer's own inspection orders for THIS vehicle.
 * It never says a vehicle is inspected unless the record says so and never shows report content
 * (reports stay in the buyer's own, authorised My inspections area).
 */
export const VehicleInspectionSection: React.FC<Props> = ({ vehicle, viewer, isOwnListing, onRequestInspection, onViewMyInspections }) => {
  const [orders, setOrders] = useState<BackendInspectionOrder[] | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const signedIn = Boolean(viewer?.id);

  useEffect(() => {
    setOrders(null);
    if (!signedIn || isOwnListing) { setLoadState('idle'); return; }
    let live = true;
    setLoadState('loading');
    getMyInspections()
      .then((res) => { if (live) { setOrders(res.orders || []); setLoadState('idle'); } })
      .catch(() => { if (live) setLoadState('failed'); });
    return () => { live = false; };
  }, [vehicle.id, signedIn, isOwnListing]);

  const mine = (orders || []).filter((o) => sameCar(o, vehicle.id));
  // Most advanced booking wins: a completed one over an earlier request.
  const rank = ['pending_payment', 'assigned', 'in_progress', 'completed'];
  const current = mine.slice().sort((a, b) => rank.indexOf(b.status) - rank.indexOf(a.status))[0];
  const copy = current ? (STATUS_COPY[current.status] || { label: `Inspection: ${current.status.replace(/_/g, ' ')}`, detail: 'See the booking in My inspections.' }) : null;

  return (
    <section id="vd-inspection" aria-labelledby="vd-inspection-title" data-testid="vehicle-inspection-section" className="bg-[#F6FAF9] border border-[#D7E7E4] rounded-3xl p-5 sm:p-6 space-y-4 scroll-mt-20">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-[#176B87] text-white rounded-2xl shadow-xs"><FileCheck className="w-6 h-6" aria-hidden="true" /></div>
        <div>
          <h3 id="vd-inspection-title" className="font-extrabold text-[#12576d] text-base font-display">Pre-purchase inspection</h3>
          <p className="text-xs text-[#64748B]">Carried out by an independent, verified inspection provider, not by KAYARD KE.</p>
        </div>
      </div>

      <p className="text-sm text-[#12576D]" data-testid="inspection-listing-status">
        {vehicle.inspectionPassed
          ? 'This listing is marked as having passed an inspection. Findings are only shown in the report of the customer who requested it, so you should still arrange your own inspection before you commit.'
          : 'No inspection report is attached to this listing. Ask an independent provider to inspect the vehicle before you commit.'}
      </p>

      {loadState === 'loading' && <p role="status" className="text-xs text-[#64748B]">Checking your inspection bookings for this vehicle…</p>}
      {loadState === 'failed' && <p role="status" className="text-xs text-[#64748B]">We could not check your bookings just now. You can still open My inspections.</p>}

      {copy && (
        <div data-testid="inspection-booking-status" className="rounded-2xl border border-[#B8D9D6] bg-white px-4 py-3">
          <p className="text-sm font-extrabold text-[#0A3340]">{copy.label}</p>
          <p className="text-xs text-[#64748B]">{copy.detail}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!isOwnListing && !current && onRequestInspection && (
          <Button variant="secondary" size="md" onClick={() => onRequestInspection(vehicle)} className="font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-[#176B87]" aria-hidden="true" />
            <span>Book an inspection of this vehicle</span>
          </Button>
        )}
        {current && onViewMyInspections && (
          <Button variant="secondary" size="md" onClick={() => onViewMyInspections(current.status === 'completed' ? 'reports' : 'mine')} className="font-bold text-sm">
            <ClipboardList className="w-4 h-4 text-[#176B87]" aria-hidden="true" />
            <span>{current.status === 'completed' ? 'View my inspection report' : 'View my booking'}</span>
          </Button>
        )}
      </div>
    </section>
  );
};

export default VehicleInspectionSection;
