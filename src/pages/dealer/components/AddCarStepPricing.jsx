function Field({ label, children }) {
  return <div className="input-group">{label && <label className="input-label">{label}</label>}{children}</div>;
}

export default function AddCarStepPricing({ form, set, user }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h3 style={{ marginBottom: 4 }}>Pricing & Listing Mode</h3>
      <Field label="Asking Price (KES) *">
        <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 3500000" value={form.price} onChange={e => set('price', e.target.value)} />
      </Field>

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
