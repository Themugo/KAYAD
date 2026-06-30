export default function AdminSettingsFees({ config, setConfig, saveConfig, saving }) {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section style={{ background: '#111', padding: 24, borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 24 }}>Fee Structure</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {[
            { key: 'listingFee', label: 'Standard Listing (KES)', def: 1000 },
            { key: 'auctionRegistrationFee', label: 'Auction Entry (KES)', def: 2000 },
            { key: 'ghostCheckFee', label: 'Pre-Inspection (KES)', def: 2500 },
            { key: 'commissionPercentage', label: 'Hammer Commission (%)', def: 2 },
            { key: 'platformVat', label: 'VAT (%)', def: 16 },
            { key: 'buyerPremiumPct', label: 'Buyer Premium (%)', def: 0 },
          ].map(f => (
            <div key={f.key} className="input-group">
              <label className="input-label" style={{ fontSize: 10, textTransform: 'uppercase' }}>{f.label}</label>
              <input className="input" type="number" min={0}
                value={config[f.key] ?? f.def}
                onChange={e => setConfig(p => ({ ...p, [f.key]: Number(e.target.value) }))} />
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: '#111', padding: 24, borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Discount Codes</h4>
          <button style={{ background: 'var(--gold)', color: 'black', fontSize: 10, padding: '6px 16px', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}
            onClick={() => {
              const code = prompt('Enter promo code:');
              const pct = prompt('Discount percentage:');
              if (code && pct) {
                setConfig(prev => ({
                  ...prev,
                  activePromos: [...(prev.activePromos || []), { code: code.toUpperCase(), discountPercent: Number(pct), expiryDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0] }]
                }));
              }
            }}>
            CREATE NEW
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(config.activePromos || []).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active promo codes</p>
          ) : (config.activePromos || []).map((promo, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'black', padding: 16, borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <p style={{ fontFamily: 'monospace', color: 'var(--gold)', fontWeight: 700 }}>{promo.code}</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{promo.discountPercent}% Off Listings • Expiry: {promo.expiryDate ? new Date(promo.expiryDate).toLocaleDateString('en-KE') : 'N/A'}</p>
              </div>
              <button style={{ color: '#f43f5e', fontSize: 12, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setConfig(prev => ({ ...prev, activePromos: (prev.activePromos || []).filter((_, j) => j !== i) }))}>
                DELETE
              </button>
            </div>
          ))}
        </div>
      </section>

      <button className="btn btn-gold" onClick={() => saveConfig('fees')} disabled={saving} style={{ width: '100%' }}>
        {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : '💾 SAVE GLOBAL CONFIGURATION'}
      </button>
    </div>
  );
}
