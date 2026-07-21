import { useMemo } from 'react';

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
          { key: 'demoMode', label: 'Demo Mode (show demo content in marketplace)' },
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
    </div>
  );
}
