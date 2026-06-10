import { Check } from 'lucide-react';

export default function PackageSelectorStep({ pkgList, isDealer, selPkg, freeMode, onSelect, onBack, onContinue }) {
  return (
    <div style={{ background: '#050505', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 20px 40px' }}>
      <div style={{ width: '100%', maxWidth: Math.min(pkgList.length * 220 + 60, 960) }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 6 }}>← Back</button>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 8 }}>
            {isDealer ? '🏪 Dealer' : '🤝 Private Seller'} Registration
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(1.5rem,3vw,2rem)', color: '#fff', margin: '0 0 8px' }}>
            Choose Your <span style={{ color: 'var(--gold)' }}>Listing Plan</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, margin: 0 }}>
            No per-listing fees. Pick a plan — list freely within your allowance.
          </p>
          {freeMode && (
            <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 9999, color: '#22c55e', fontSize: 13, fontWeight: 700 }}>
              🎉 Launch offer — all plans are FREE right now. List as much as you like; pick any plan to get started.
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${pkgList.length}, 1fr)`, gap: 14, marginBottom: 28 }}>
          {pkgList.map(pkg => {
            const isFree = pkg.isFree || pkg.priceMonthly === 0;
            const sel = selPkg === pkg.id;
            const color = pkg.id.includes('elite') ? 'var(--gold)'
              : pkg.id.includes('enterprise') ? '#a855f7'
                : pkg.id.includes('growth') || pkg.badge === 'Popular' ? '#3b82f6'
                  : pkg.id.includes('pro') || pkg.badge === 'Best Value' ? '#22c55e'
                    : 'rgba(255,255,255,0.5)';
            return (
              <div key={pkg.id} onClick={() => onSelect(pkg.id)}
                style={{ background: '#0C0C0C', border: `2px solid ${sel ? color : 'rgba(255,255,255,0.08)'}`, borderRadius: 16, padding: '22px 20px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', boxShadow: sel ? `0 8px 32px ${color}20` : 'none' }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = `${color}40`; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                {pkg.badge && !sel && <div style={{ position: 'absolute', top: 12, right: 12, background: color, color: '#000', fontSize: 8, fontWeight: 900, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{pkg.badge}</div>}
                {sel && <div style={{ position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={12} style={{ color: '#000' }} /></div>}

                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color, marginBottom: 10, marginTop: 28 }}>{pkg.name}</div>
                <div style={{ marginBottom: 6 }}>
                  {isFree
                    ? <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.5rem', color: '#22c55e' }}>Free</span>
                    : <><span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.5rem', color: '#fff' }}>KES {(pkg.priceMonthly || 0).toLocaleString()}</span><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>/mo</span></>
                  }
                </div>
                <div style={{ fontSize: 12, color, fontWeight: 700, marginBottom: 14 }}>
                  {pkg.listingMax === 0 ? 'Unlimited listings' : `${pkg.listingMax} listings`}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: (pkg.features || []).length > 0 ? 12 : 0 }}>{pkg.description}</div>
                {(pkg.features || []).map(f => (
                  <div key={f} style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'flex', gap: 5, marginBottom: 4 }}>
                    <span style={{ color }}>✓</span>{f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={onContinue} style={{ padding: '13px 36px', background: selPkg ? 'var(--gold)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, color: selPkg ? '#000' : 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: 900, cursor: selPkg ? 'pointer' : 'default', textTransform: 'uppercase', letterSpacing: '0.06em', transition: 'all 0.2s' }}>
            {selPkg ? `Continue with ${pkgList.find(p => p.id === selPkg)?.name} →` : 'Select a plan to continue'}
          </button>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 12 }}>
            Prices are managed by admin and may be waived for approved accounts.
          </p>
        </div>
      </div>
    </div>
  );
}
