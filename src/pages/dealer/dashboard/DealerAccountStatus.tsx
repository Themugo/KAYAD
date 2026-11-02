import React, { useEffect, useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { dealerAPI } from '../../../api/api';

/**
 * Sidebar "Account status": the dealer's verification and listing plan, from the real entitlement service. A dealer with no active plan
 * cannot publish vehicles, so this says so plainly instead of waiting for them to hit the error on the listing form.
 */
interface Entitlement { status?: string; planName?: string | null; listingMax?: number; listingsUsed?: number; unlimitedListings?: boolean; expiresAt?: string | null }

const fmtDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};

const DealerAccountStatus: React.FC<{ approved: boolean }> = ({ approved }) => {
  const [ent, setEnt] = useState<Entitlement | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let live = true;
    setState('loading');
    dealerAPI.getSubscription()
      .then((r: any) => { if (!live) return; setEnt(r?.entitlement || null); setState(r?.entitlement ? 'ready' : 'error'); })
      .catch(() => { if (live) setState('error'); });
    return () => { live = false; };
  }, [retry]);

  const hasPlan = ent && (ent.status === 'active' || ent.status === 'cancelled');
  return (
    <div className="p-4 bg-gradient-to-r from-[#DDF4F0] to-[#F3FAF9] rounded-xl" aria-live="polite">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-5 h-5 text-[#176B87]" aria-hidden="true" />
        <span className="font-semibold text-[#0E4655]">Account status</span>
      </div>
      <p className="text-xs text-[#0E4655]"><span className="font-semibold">Verification:</span> {approved ? 'Approved' : 'Pending KAYAD review'}</p>
      {state === 'loading' && <p className="mt-1 text-xs text-[#176B87] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />Checking your plan…</p>}
      {state === 'error' && (
        <p className="mt-1 text-xs text-[#176B87]">Plan details could not be loaded. <button type="button" onClick={() => setRetry((n) => n + 1)} className="font-bold underline">Reload plan</button></p>
      )}
      {state === 'ready' && ent && (hasPlan ? (
        <p className="mt-1 text-xs text-[#0E4655]">
          <span className="font-semibold">Plan:</span> {ent.planName || 'Active'}
          {ent.status === 'cancelled' && ' (ends at expiry)'}
          <br />
          <span className="font-semibold">Listings:</span> {ent.listingsUsed ?? 0}{ent.unlimitedListings ? ' (unlimited)' : ` of ${ent.listingMax ?? 0}`}
          {fmtDate(ent.expiresAt) && <><br /><span className="font-semibold">Renews/ends:</span> {fmtDate(ent.expiresAt)}</>}
        </p>
      ) : (
        <p className="mt-1 text-xs text-[#7A271A]"><span className="font-semibold">No active listing plan.</span> You need one before you can publish vehicles. Contact KAYAD support to have a plan activated.</p>
      ))}
    </div>
  );
};

export default DealerAccountStatus;
