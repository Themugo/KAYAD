import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Phone, X, ChevronRight } from 'lucide-react';
import { getCarById, mapBackendCarToVehicle } from '../../../services/vehicleApi';

interface Props {
  vehicleId: string;
  title: string;
  onClose: () => void;
  onOpenListing: () => void;
}

/** Digits only, Kenyan numbers normalised to international form for wa.me. Returns '' when it cannot be a phone number. */
export const toWhatsAppNumber = (raw: string): string => {
  const d = raw.replace(/\D/g, '');
  if (d.length < 9) return '';
  if (d.startsWith('254')) return d;
  if (d.startsWith('0')) return `254${d.slice(1)}`;
  if (d.length === 9) return `254${d}`;
  return d;
};

/**
 * Direct contact for a listing: no account needed. Reads the public listing record and offers
 * Call and WhatsApp when the seller shares a number; otherwise says so and points to the listing.
 */
const ContactSellerSheet: React.FC<Props> = ({ vehicleId, title, onClose, onOpenListing }) => {
  const [state, setState] = useState<{ status: 'loading' } | { status: 'ready'; phone: string; seller: string } | { status: 'error' }>({ status: 'loading' });
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const car = await getCarById(vehicleId);
        if (!live) return;
        if (!car) return setState({ status: 'error' });
        const v = mapBackendCarToVehicle(car);
        setState({ status: 'ready', phone: (v.sellerPhone || '').trim(), seller: v.sellerName && v.sellerName !== 'Unknown Seller' ? v.sellerName : '' });
      } catch {
        if (live) setState({ status: 'error' });
      }
    })();
    return () => { live = false; };
  }, [vehicleId]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const wa = state.status === 'ready' ? toWhatsAppNumber(state.phone) : '';
  const message = encodeURIComponent(`Hello, I am interested in the ${title} listed on KAYAD.`);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#071F2A]/60 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="kayad-contact-title" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="kayad-contact-title" className="text-base font-extrabold text-navy-900">Contact seller</h3>
            <p className="mt-0.5 truncate text-[13px] text-[#64748B]">{title}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-[#64748B] hover:bg-[#F1F5F9]"><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>

        <div className="mt-4 space-y-2.5">
          {state.status === 'loading' && <p role="status" className="py-3 text-sm text-[#64748B]">Loading seller details…</p>}
          {state.status === 'error' && <p role="status" className="rounded-xl bg-[#F6FAF9] p-3 text-sm text-[#475569]">We could not load the seller details. Open the listing to try again.</p>}
          {state.status === 'ready' && !state.phone && <p className="rounded-xl bg-[#F6FAF9] p-3 text-sm text-[#475569]">This seller has not shared a phone number. Open the listing for other ways to reach them.</p>}
          {state.status === 'ready' && state.phone && (
            <>
              {state.seller && <p className="text-[13px] font-semibold text-[#0A3340]">{state.seller}</p>}
              <a href={`tel:${state.phone}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#176B87] px-4 text-[14px] font-extrabold text-white hover:bg-[#12576D]"><Phone className="h-4 w-4" aria-hidden="true" /> Call {state.phone}</a>
              {wa && <a href={`https://wa.me/${wa}?text=${message}`} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#13B8A6] px-4 text-[14px] font-extrabold text-[#06303A] hover:brightness-95"><MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp the seller</a>}
            </>
          )}
          <button type="button" onClick={onOpenListing} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[#B8D9D6] bg-white px-4 text-[13px] font-bold text-[#12576D] hover:bg-[#DDF4F0]">View full listing <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  );
};

export default ContactSellerSheet;
