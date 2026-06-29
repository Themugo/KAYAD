import { useMemo, useState } from 'react';

export default function AdminSettingsGeneral({ config, setConfig, saveConfig, saving }) {
  const sections = useMemo(() => [
    { title: 'Platform Info', grid: '1fr 1fr', fields: [
      { key: 'platformName', label: 'Platform Name', type: 'text' },
      { key: 'galleryTitle', label: 'Gallery Title', type: 'text' },
      { key: 'gallerySubtitle', label: 'Gallery Subtitle', type: 'text' },
      { key: 'supportEmail', label: 'Support Email', type: 'email' },
      { key: 'supportPhone', label: 'Support Phone', type: 'text' },
      { key: 'fontDisplay', label: 'Display Font (headings, titles)', type: 'text' },
      { key: 'fontBody', label: 'Body Font (paragraphs, text)', type: 'text' },
      { key: 'fontSizePct', label: 'Font Size (%)', type: 'number', min: 50, max: 200 },
    ]},
    { title: 'Fees & Limits', grid: '1fr 1fr', fields: [
      { key: 'dealerCommission', label: 'Dealer Commission (%)', type: 'number', min: 0, max: 50 },
      { key: 'bidCommitmentPct', label: 'Bid Commitment (%)', type: 'number', min: 0, max: 100 },
      { key: 'escrowReleaseDays', label: 'Escrow Release (days)', type: 'number', min: 1, max: 30 },
      { key: 'maxListingImages', label: 'Max Listing Images', type: 'number', min: 1, max: 20 },
      { key: 'dealerTrialDays', label: 'Dealer Trial (days)', type: 'number', min: 0, max: 365 },
    ]},
  ], []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {sections.map(s => (
        <div key={s.title} className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>{s.title}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {s.fields.map(f => (
              <div key={f.key} className="input-group">
                <label className="input-label">{f.label}</label>
                <input className="input" type={f.type} min={f.min} max={f.max}
                  value={config[f.key] ?? ''}
                  onChange={e => setConfig(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Toggle Options</h3>
        {[
          { key: 'allowGuestBrowsing', label: 'Allow Guest Browsing' },
          { key: 'requireDealerApproval', label: 'Require Dealer Approval' },
          { key: 'waivePayments', label: 'Waive Payments (skip all payment/trial enforcement)' },
          { key: 'freeMarket', label: 'Free Market (no fees, no commissions)' },
        ].map(f => (
          <label key={f.key} style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer', padding:'8px 0' }}>
            <input type="checkbox" checked={config[f.key]}
              onChange={e => setConfig(p => ({...p, [f.key]: e.target.checked }))}
              style={{ width:18, height:18, accentColor:'var(--gold)' }} />
            <span style={{ fontSize:14 }}>{f.label}</span>
          </label>
        ))}
        <div style={{ marginTop:16 }}>
          <button className="btn btn-gold" onClick={() => saveConfig('general')} disabled={saving} style={{ width:'100%' }}>
            {saving ? <><div className="spinner" style={{ width:16, height:16 }} /> Saving...</> : '💾 Save General Settings'}
          </button>
        </div>
      </div>

      {/* Demo Mode Control — admin only */}
      <DemoModeControl />
    </div>
  );
}

function DemoModeControl() {
  const [status, setStatus] = useState(() => {
    try { return !localStorage.getItem('kayad_demo_force_off') && typeof window !== 'undefined'; } catch { return false; }
  });

  const handleDisable = () => {
    if (!window.confirm('Disable demo mode? The app will attempt to use the real backend. Reload to apply.')) return;
    localStorage.setItem('kayad_demo_force_off', '1');
    // Also clear demo session state
    ['kayad_demo_user', 'kayad_demo_team'].forEach(k => localStorage.removeItem(k));
    setStatus(false);
    window.location.reload();
  };

  const handleEnable = () => {
    localStorage.removeItem('kayad_demo_force_off');
    setStatus(true);
    window.location.reload();
  };

  const handleReset = () => {
    if (!window.confirm('Reset demo data? All dealer-uploaded images and car edits will be lost.')) return;
    ['kayad_demo_cars', 'kayad_demo_user', 'kayad_demo_team'].forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div className="card" style={{ padding: 24, gridColumn: '1 / -1' }}>
      <h3 style={{ fontSize: '1rem', marginBottom: 6 }}>🔧 Demo Mode Control</h3>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20, lineHeight: 1.6 }}>
        When demo mode is active, the app serves sample data (cars, bids, payments) from localStorage.
        Disable it to require a live backend connection. This setting is per-browser and does not affect other users.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: status ? '#22c55e' : '#ef4444', boxShadow: `0 0 8px ${status ? '#22c55e' : '#ef4444'}` }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Demo mode is currently {status ? 'ON' : 'OFF'}</span>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {status ? (
          <button className="btn" onClick={handleDisable} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 12 }}>
            🚫 Disable Demo Mode
          </button>
        ) : (
          <button className="btn btn-gold" onClick={handleEnable} style={{ fontSize: 12 }}>
            ✅ Enable Demo Mode
          </button>
        )}
        <button className="btn" onClick={handleReset} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
          🔄 Reset Demo Data
        </button>
      </div>

      <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(212,196,168,0.04)', border: '1px solid rgba(212,196,168,0.1)', borderRadius: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Demo Login Credentials</div>
        <table style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <th style={{ textAlign: 'left', paddingBottom: 6, fontWeight: 700 }}>Role</th>
              <th style={{ textAlign: 'left', paddingBottom: 6, fontWeight: 700 }}>Email</th>
              <th style={{ textAlign: 'left', paddingBottom: 6, fontWeight: 700 }}>Password</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Super Admin', 'superadmin@kayad.com', 'SuperAdmin@1234'],
              ['Admin', 'admin@kayad.com', 'Admin@1234'],
              ['Webhost', 'webhost@kayad.com', 'Webhost@1234'],
              ['Dealer', 'dealer@demo.com', 'Kayad@Demo2026!'],
              ['Private Seller', 'seller@demo.com', 'Seller@1234'],
              ['Buyer', 'buyer@demo.com', 'Kayad@Demo2026!'],
            ].map(([role, email, password]) => (
              <tr key={email}>
                <td style={{ padding: '3px 0', fontWeight: 600 }}>{role}</td>
                <td style={{ padding: '3px 12px 3px 0', fontFamily: 'monospace', fontSize: 11 }}>{email}</td>
                <td style={{ padding: '3px 0', fontFamily: 'monospace', fontSize: 11, color: 'var(--gold)' }}>{password}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
