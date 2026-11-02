import { useEffect, useRef, useState } from 'react';
import { adminAPI } from '../../api/api';
import { describeDealerDecisionError } from '../../utils/dealerDecision';

/**
 * Grant (or remove) a listing plan for an approved dealer. Listing is gated on an active plan (assertDealerCanCreateListing), so an
 * approved dealer cannot publish until an admin grants one here or the dealer pays for one. Plans come from the owner's catalogue.
 * Nothing is assumed: success is shown only after the server answers.
 */
export default function DealerPlanDialog({ dealer, onClose, onGranted }) {
  const [plans, setPlans] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [planId, setPlanId] = useState('');
  const [days, setDays] = useState('30');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const ref = useRef(null);
  const id = dealer?._id || dealer?.id;
  const name = dealer?.businessName || dealer?.name || dealer?.email || 'this dealer';

  useEffect(() => {
    let live = true;
    adminAPI.getSubscriptionPlans()
      .then((r) => { if (!live) return; const list = Array.isArray(r?.plans) ? r.plans : []; setPlans(list); if (list[0]) { setPlanId(list[0].id); setDays(String(list[0].durationDays || 30)); } })
      .catch(() => { if (live) setLoadError('Could not load the plan catalogue. Nothing was changed.'); });
    return () => { live = false; };
  }, []);
  useEffect(() => { ref.current?.focus(); }, [plans]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const daysNum = Number(days);
  const daysOk = Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= 3660;

  const submit = async (dealerPackage) => {
    setBusy(true); setError(null);
    try {
      const res = await adminAPI.assignPackage(id, dealerPackage === 'none' ? { dealerPackage } : { dealerPackage, durationDays: daysNum });
      onGranted?.(dealerPackage, res);
    } catch (err) {
      setError(describeDealerDecisionError(err, 'The plan could not be changed. No change was assumed.'));
    } finally { setBusy(false); }
  };

  return (
    <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="dealer-plan-title" className="card" style={{ width: 'min(480px, 100%)', padding: 24 }}>
        <h2 id="dealer-plan-title" style={{ fontSize: '1.15rem', marginBottom: 4 }}>Listing plan</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{name}{dealer?.email ? ` · ${dealer.email}` : ''}</p>
        <p style={{ fontSize: 13, marginBottom: 16 }}>A dealer needs an active plan before they can list vehicles.</p>

        {loadError && <div role="alert" style={{ color: 'var(--danger, #dc2626)', fontSize: 13 }}>{loadError}</div>}
        {!plans && !loadError && <div role="status" style={{ fontSize: 13 }}>Loading plans…</div>}
        {plans && plans.length === 0 && <div role="alert" style={{ fontSize: 13 }}>No plans are configured in the catalogue yet.</div>}
        {plans && plans.length > 0 && (
          <>
            <label htmlFor="dealer-plan-select" className="input-label">Plan</label>
            <select id="dealer-plan-select" ref={ref} className="input" value={planId} disabled={busy}
              onChange={(e) => { setPlanId(e.target.value); const p = plans.find((x) => x.id === e.target.value); if (p?.durationDays) setDays(String(p.durationDays)); }}>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name} · up to {p.listingMax} listings</option>)}
            </select>
            <label htmlFor="dealer-plan-days" className="input-label" style={{ marginTop: 12, display: 'block' }}>Duration (days)</label>
            <input id="dealer-plan-days" className="input" inputMode="numeric" value={days} disabled={busy} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} />
            {!daysOk && <div style={{ fontSize: 12, color: 'var(--danger, #dc2626)', marginTop: 4 }}>Enter a whole number of days from 1 to 3660.</div>}
          </>
        )}
        {error && <div role="alert" style={{ color: 'var(--danger, #dc2626)', fontSize: 13, marginTop: 12 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" disabled={busy} onClick={() => submit('none')}>Remove plan</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={busy || !planId || !daysOk} onClick={() => submit(planId)}>{busy ? 'Saving…' : 'Grant plan'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
