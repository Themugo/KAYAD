import { useState, useEffect } from 'react';
import { dealerAPI } from '../../../api/api';

function Field({ label, children }) {
  return <div className="input-group">{label && <label className="input-label">{label}</label>}{children}</div>;
}

export default function AddCarStepPricing({ form, set, user }) {
  const [rec, setRec] = useState(null);
  const [recLoading, setRecLoading] = useState(false);

  useEffect(() => {
    if (!form.brand || !form.model || !form.year || form.year < 2000) {
      setRec(null);
      return;
    }
    const timer = setTimeout(() => {
      setRecLoading(true);
      dealerAPI.pricingRecommendations({
        brand: form.brand, model: form.model, year: form.year,
        mileage: form.mileage, fuel: form.fuel,
        transmission: form.transmission, bodyType: form.bodyType,
      }).then(res => {
        setRec(res.recommendation || res.data || res);
      }).catch(() => setRec(null))
      .finally(() => setRecLoading(false));
    }, 600);
    return () => clearTimeout(timer);
  }, [form.brand, form.model, form.year, form.mileage, form.fuel, form.transmission, form.bodyType]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h3 style={{ marginBottom: 4 }}>Pricing & Listing Mode</h3>
      <Field label="Asking Price (KES) *">
        <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 3500000" value={form.price} onChange={e => set('price', e.target.value)} />
      </Field>
      {recLoading && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '4px 0' }}>Analyzing market data…</div>}
      {rec && (
        <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10, padding: '14px 16px', position: 'relative' }}>
          <button onClick={() => setRec(null)} style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>💡 Price Suggestion</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>KES {Number(rec.suggestedPrice || rec.price || 0).toLocaleString()}</div>
          {rec.reasoning && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{rec.reasoning}</div>}
        </div>
      )}

      <div>
        <label className="input-label" style={{ marginBottom: 12, display: 'block' }}>How do you want to sell?</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { key: 'allowBuy', icon: '💳', title: 'Direct Buy', desc: 'Buyers can purchase at your listed price via M-Pesa.' },
            { key: 'allowBid', icon: '⚡', title: 'Allow Bidding', desc: 'Buyers can place bids. You choose the winner.' },
          ].map(opt => (
            <div key={opt.key} onClick={() => set(opt.key, !form[opt.key])}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: form[opt.key] ? 'var(--gold-glow)' : 'var(--surface)',
                border: `2px solid ${form[opt.key] ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 28 }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opt.desc}</div>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: form[opt.key] ? 'var(--gold)' : 'transparent',
                border: `2px solid ${form[opt.key] ? 'var(--gold)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0A1628', fontSize: 12, fontWeight: 700,
              }}>
                {form[opt.key] && '✓'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {user?.role === 'dealer' && form.allowBuy && (
        <div onClick={() => set('escrowEnabled', !form.escrowEnabled)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--surface)', border: `1px solid ${form.escrowEnabled ? 'rgba(212,196,168,0.2)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>🛡️ Escrow Protection</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{form.escrowEnabled ? 'Payment held in escrow until buyer confirms receipt' : 'Buyer pays directly — no escrow holding'}</div>
          </div>
          <div style={{ width: 44, height: 24, borderRadius: 12, background: form.escrowEnabled ? 'var(--gold)' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 3, left: form.escrowEnabled ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: form.escrowEnabled ? '#000' : 'rgba(255,255,255,0.5)', transition: 'left 0.2s' }} />
          </div>
        </div>
      )}

      {form.allowBid && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>⚡ Auction Settings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Start Auction As">
              <select className="input" value={form.auctionStatus} onChange={e => set('auctionStatus', e.target.value)}>
                <option value="draft">Draft (start later)</option>
                <option value="live">Live Immediately</option>
              </select>
            </Field>
            {form.auctionStatus === 'live' && (
              <Field label="Auction End Time">
                <input className="input" type="datetime-local"
                  value={form.auctionEnd} onChange={e => set('auctionEnd', e.target.value)} />
              </Field>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
