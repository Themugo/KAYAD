import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/api';

const Field = ({ label, hint, children }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
    <label style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
      {label}
      {hint && <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{hint}</div>}
    </label>
    {children}
  </div>
);

const DEFAULTS = {
  platformName: 'Kayad',
  galleryTitle: 'The Gallery',
  gallerySubtitle: "Kenya's Premium Automotive Gallery",
  supportEmail: 'support@kayad.space',
  supportPhone: '254700100200',
  dealerCommission: 5,
  bidCommitmentPct: 5,
  escrowReleaseDays: 3,
  maxListingImages: 8,
  allowGuestBrowsing: true,
  requireDealerApproval: true,
  dealerTrialDays: 14,
  waivePayments: false,
  freeMarket: false,
  fontDisplay: 'Cormorant Garamond',
  fontBody: 'DM Sans',
  fontSizePct: 110,
  baseFontSize: 17,
  lineHeight: 1.8,
};

const BRANDING_DEFAULTS = {
  logoText: 'K',
  logoType: 'icon',
  logoUrl: '',
  brandTagline: 'Premium Marketplace',
  primaryColor: '#D4A843',
  accentColor: '#F0CC6A',
  bgColor: '#050505',
  surfaceColor: '#0A0A0A',
  cardColor: '#111111',
  textColor: '#E2DDD5',
};

export default function AdminSettings() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Platform config
  const [config, setConfig] = useState(DEFAULTS);
  const [branding, setBranding] = useState(BRANDING_DEFAULTS);
  const [daraja, setDaraja] = useState({ environment: 'sandbox', consumerKey: '', consumerSecret: '', passkey: '', shortCode: '' });
  const [bank, setBank] = useState({ bankName: '', accountName: '', accountNumber: '', branch: '', swiftCode: '', reconciliationEmail: '' });
  const [reconcile, setReconcile] = useState({ autoReconcile: true, matchThresholdMins: 1440, schedule: 'every 6 hours', notifyOnMismatch: true, defaultNarration: '' });

  // Test payment state
  const [testPhone, setTestPhone] = useState('254708374149');
  const [testAmount, setTestAmount] = useState(1);
  const [testingMpesa, setTestingMpesa] = useState(false);

  // Audit log
  const [auditLog, setAuditLog] = useState([]);
  const [packages, setPackages] = useState([]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { config: c } = await adminAPI.getConfig();
      if (c) {
        setConfig({
          platformName: c.platformName || DEFAULTS.platformName,
          galleryTitle: c.galleryTitle || DEFAULTS.galleryTitle,
          gallerySubtitle: c.gallerySubtitle || DEFAULTS.gallerySubtitle,
          supportEmail: c.supportEmail || DEFAULTS.supportEmail,
          supportPhone: c.supportPhone || DEFAULTS.supportPhone,
          dealerTrialDays: c.dealerTrialDays ?? DEFAULTS.dealerTrialDays,
          dealerCommission: c.dealerCommission ?? DEFAULTS.dealerCommission,
          bidCommitmentPct: c.bidCommitmentPct ?? DEFAULTS.bidCommitmentPct,
          escrowReleaseDays: c.escrowReleaseDays ?? DEFAULTS.escrowReleaseDays,
          maxListingImages: c.maxListingImages ?? DEFAULTS.maxListingImages,
          allowGuestBrowsing: c.allowGuestBrowsing ?? DEFAULTS.allowGuestBrowsing,
          requireDealerApproval: c.requireDealerApproval ?? DEFAULTS.requireDealerApproval,
          waivePayments: c.waivePayments ?? DEFAULTS.waivePayments,
          freeMarket: c.freeMarket ?? DEFAULTS.freeMarket,
          fontDisplay: c.fontDisplay || DEFAULTS.fontDisplay,
          fontBody: c.fontBody || DEFAULTS.fontBody,
          fontSizePct: c.fontSizePct ?? DEFAULTS.fontSizePct,
        });
        if (c.daraja) setDaraja(c.daraja);
      if (c.packages) setPackages(c.packages);
        if (c.bank) setBank(c.bank);
        if (c.reconciliation) setReconcile(c.reconciliation);
        if (c.branding) setBranding({ ...BRANDING_DEFAULTS, ...c.branding });
      }
    } catch { /* demo fallback — keep defaults */ }

    try {
      const { entries } = await adminAPI.getAuditLog({ limit: 100 });
      setAuditLog(entries || []);
    } catch { /* ignore */ }

    setLoading(false);
  };

  useEffect(() => { loadConfig(); }, []);

  const saveConfig = async (section) => {
    setSaving(true);
    try {
      const body = {};
      if (!section || section === 'general') {
        Object.assign(body, {
          platformName: config.platformName,
          galleryTitle: config.galleryTitle,
          gallerySubtitle: config.gallerySubtitle,
          dealerTrialDays: Number(config.dealerTrialDays),
          supportEmail: config.supportEmail,
          supportPhone: config.supportPhone,
          dealerCommission: Number(config.dealerCommission),
          bidCommitmentPct: Number(config.bidCommitmentPct),
          escrowReleaseDays: Number(config.escrowReleaseDays),
          maxListingImages: Number(config.maxListingImages),
          allowGuestBrowsing: config.allowGuestBrowsing,
          requireDealerApproval: config.requireDealerApproval,
          waivePayments: config.waivePayments,
          freeMarket: config.freeMarket,
          fontDisplay: config.fontDisplay,
          fontBody: config.fontBody,
          fontSizePct: Number(config.fontSizePct),
          baseFontSize: Number(config.baseFontSize),
          lineHeight: Number(config.lineHeight),
        });
      }
      if (!section || section === 'branding') {
        body.branding = branding;
      }
      if (!section || section === 'payments') {
        body.daraja = daraja;
        body.bank = bank;
      }
      if (!section || section === 'reconciliation') {
        body.reconciliation = reconcile;
      }
      await adminAPI.updateConfig(body);
      toast('Settings saved', 'success');
      await loadConfig();
    } catch {
      toast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const testMpesa = async () => {
    if (!testPhone || !testAmount) {
      toast('Phone and amount required', 'error');
      return;
    }
    setTestingMpesa(true);
    try {
      await adminAPI.testMpesa({ phone: testPhone, amount: Number(testAmount) });
      toast(`STK push sent to ${testPhone} for KES ${testAmount}`, 'success');
    } catch {
      toast('M-Pesa test failed — check Daraja config', 'error');
    } finally {
      setTestingMpesa(false);
    }
  };



  const tabs = useMemo(() => {
    const all = [
      { id: 'general', label: '⚙ General' },
      { id: 'branding', label: '🎨 Branding' },
      { id: 'payments', label: '💳 Payments' },
      { id: 'fees', label: '💰 Fees & Promos' },
      { id: 'reconciliation', label: '🔄 Reconciliation' },
      { id: 'packages', label: '📦 Packages' },
      { id: 'audit', label: '📋 Audit Log' },
    ];
    return isSuperAdmin ? all : all.slice(0, 4);
  }, [isSuperAdmin]);

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 900 }}>
          <div className="loading-center"><div className="spinner" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 900 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Admin</div>
          <h2>Settings</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Platform config, payment gateways, reconciliation, and sub-admin management</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`btn btn-sm ${tab === t.id ? 'btn-gold' : 'btn-outline'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ GENERAL ═══ */}
        {tab === 'general' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Platform Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { key: 'platformName', label: 'Platform Name', type: 'text' },
                  { key: 'galleryTitle', label: 'Gallery Title', type: 'text' },
                  { key: 'gallerySubtitle', label: 'Gallery Subtitle', type: 'text' },
                  { key: 'supportEmail', label: 'Support Email', type: 'email' },
                  { key: 'supportPhone', label: 'Support Phone', type: 'text' },
                  { key: 'fontDisplay', label: 'Display Font (headings, titles)', type: 'text' },
                  { key: 'fontBody', label: 'Body Font (paragraphs, text)', type: 'text' },
                  { key: 'fontSizePct', label: 'Font Size (%)', type: 'number', min: 50, max: 200 },
                ].map(f => (
                  <div key={f.key} className="input-group">
                    <label className="input-label">{f.label}</label>
                    <input className="input" type={f.type} value={config[f.key]}
                      onChange={e => setConfig(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Fees & Limits</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { key: 'dealerCommission', label: 'Dealer Commission (%)', type: 'number', min: 0, max: 50 },
                  { key: 'bidCommitmentPct', label: 'Bid Commitment (%)', type: 'number', min: 0, max: 100 },
                  { key: 'escrowReleaseDays', label: 'Escrow Release (days)', type: 'number', min: 1, max: 30 },
                  { key: 'maxListingImages', label: 'Max Listing Images', type: 'number', min: 1, max: 20 },
                  { key: 'dealerTrialDays', label: 'Dealer Trial (days)', type: 'number', min: 0, max: 365 },
                ].map(f => (
                  <div key={f.key} className="input-group">
                    <label className="input-label">{f.label}</label>
                    <input className="input" type={f.type} min={f.min} max={f.max} value={config[f.key]}
                      onChange={e => setConfig(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Toggle Options</h3>
              {[
                { key: 'allowGuestBrowsing', label: 'Allow Guest Browsing' },
                { key: 'requireDealerApproval', label: 'Require Dealer Approval' },
                { key: 'waivePayments', label: 'Waive Payments (skip all payment/trial enforcement)' },
                { key: 'freeMarket', label: 'Free Market (no fees, no commissions)' },
              ].map(f => (
                <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '8px 0' }}>
                  <input type="checkbox" checked={config[f.key]} onChange={e => setConfig(p => ({ ...p, [f.key]: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: 14 }}>{f.label}</span>
                </label>
              ))}
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-gold" onClick={() => saveConfig('general')} disabled={saving} style={{ width: '100%' }}>
                  {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : '💾 Save General Settings'}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ═══ BRANDING ═══ */}
        {tab === 'branding' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Logo & Identity</h3>
              <div style={{ display: 'grid', gap: 16, maxWidth: 600 }}>
                <div>
                  <label className="input-label">Logo Type</label>
                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    {[
                      { id: 'icon', label: 'Letter Icon' },
                      { id: 'text', label: 'Text Logo' },
                      { id: 'image', label: 'Image Upload' },
                    ].map(t => (
                      <button key={t.id} onClick={() => setBranding(p => ({ ...p, logoType: t.id }))}
                        style={{
                          padding: '8px 18px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                          background: branding.logoType === t.id ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${branding.logoType === t.id ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                          color: branding.logoType === t.id ? '#000' : 'rgba(255,255,255,0.6)',
                        }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {branding.logoType === 'image' ? (
                  <div>
                    <label className="input-label">Logo Image</label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
                      {branding.logoUrl && (
                        <img src={branding.logoUrl} alt="Logo preview"
                          style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                      )}
                      <input type="file" accept="image/*" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const form = new FormData();
                        form.append('logo', file);
                        try {
                          const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: form });
                          const data = await res.json();
                          if (data.url) setBranding(p => ({ ...p, logoUrl: data.url }));
                        } catch { alert('Upload failed'); }
                      }} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }} />
                    </div>
                  </div>
                ) : (
                  <div className="input-group">
                    <label className="input-label">Logo Text</label>
                    <input className="input" type="text" value={branding.logoText}
                      onChange={e => setBranding(p => ({ ...p, logoText: e.target.value }))}
                      placeholder="K" style={{ height: 38 }} />
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label">Brand Tagline</label>
                  <input className="input" type="text" value={branding.brandTagline}
                    onChange={e => setBranding(p => ({ ...p, brandTagline: e.target.value }))}
                    placeholder="Premium Marketplace" style={{ height: 38 }} />
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Color Palette</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600 }}>
                {[
                  { key: 'primaryColor', label: 'Primary (Gold)' },
                  { key: 'accentColor', label: 'Accent' },
                  { key: 'bgColor', label: 'Background' },
                  { key: 'surfaceColor', label: 'Surface' },
                  { key: 'cardColor', label: 'Card' },
                  { key: 'textColor', label: 'Text' },
                ].map(f => (
                  <div key={f.key} className="input-group">
                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="color" value={branding[f.key]}
                        onChange={e => setBranding(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 0 }} />
                      {f.label}
                    </label>
                    <input className="input" type="text" value={branding[f.key]}
                      onChange={e => setBranding(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ height: 38, fontFamily: 'monospace', fontSize: 13 }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Typography & Sizing</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600 }}>
                {[
                  { key: 'fontDisplay', label: 'Display Font (headings)', state: config, setter: setConfig },
                  { key: 'fontBody', label: 'Body Font (paragraphs)', state: config, setter: setConfig },
                  { key: 'fontSizePct', label: 'Global Size (%)', type: 'number', min: 50, max: 200, state: config, setter: setConfig },
                  { key: 'baseFontSize', label: 'Base Font Size (px)', type: 'number', min: 12, max: 24, state: config, setter: setConfig },
                  { key: 'lineHeight', label: 'Line Height', type: 'number', min: 1, max: 3, step: 0.1, state: config, setter: setConfig },
                ].map(f => (
                  <div key={f.key} className="input-group">
                    <label className="input-label">{f.label}</label>
                    <input className="input" type={f.type || 'text'} min={f.min} max={f.max} step={f.step}
                      value={f.state[f.key] ?? ''}
                      onChange={e => f.setter(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                      style={{ height: 38 }} />
                  </div>
                ))}
              </div>
            </div>

            <button className="btn btn-gold" onClick={() => saveConfig('branding')} disabled={saving} style={{ width: '100%' }}>
              {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : '💾 Save Branding'}
            </button>
          </div>
        )}

        {/* ═══ PAYMENTS ═══ */}
        {tab === 'payments' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18 }}>📱 Daraja / M-Pesa</h3>
                <span className={`badge ${daraja.environment === 'production' ? 'badge-orange' : 'badge-green'}`} style={{ textTransform: 'uppercase' }}>
                  {daraja.environment}
                </span>
              </div>

              <div style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
                <Field label="Environment">
                  <select className="input" value={daraja.environment}
                    onChange={e => setDaraja(p => ({ ...p, environment: e.target.value }))}
                    style={{ width: 180, height: 38 }}>
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </select>
                </Field>

                <Field label="Consumer Key" hint="Safaricom Daraja API consumer key">
                  <input className="input" type="text" value={daraja.consumerKey}
                    onChange={e => setDaraja(p => ({ ...p, consumerKey: e.target.value }))}
                    style={{ width: 280, height: 38 }} />
                </Field>

                <Field label="Consumer Secret">
                  <input className="input" type="password" value={daraja.consumerSecret}
                    onChange={e => setDaraja(p => ({ ...p, consumerSecret: e.target.value }))}
                    style={{ width: 280, height: 38 }} />
                </Field>

                <Field label="Passkey" hint="Online passkey for STK Push">
                  <input className="input" type="password" value={daraja.passkey}
                    onChange={e => setDaraja(p => ({ ...p, passkey: e.target.value }))}
                    style={{ width: 280, height: 38 }} />
                </Field>

                <Field label="Short Code" hint="Paybill/Till number">
                  <input className="input" type="text" value={daraja.shortCode}
                    onChange={e => setDaraja(p => ({ ...p, shortCode: e.target.value }))}
                    style={{ width: 180, height: 38 }} />
                </Field>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <h4 style={{ fontSize: 14, marginBottom: 12 }}>🧪 Test M-Pesa Payment</h4>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                      <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Test Phone (254...)</label>
                      <input className="input" type="text" value={testPhone}
                        onChange={e => setTestPhone(e.target.value)}
                        style={{ width: 180, height: 38 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Amount (KES)</label>
                      <input className="input" type="number" min={1} max={1000} value={testAmount}
                        onChange={e => setTestAmount(Number(e.target.value))}
                        style={{ width: 100, height: 38 }} />
                    </div>
                    <button className="btn btn-gold" onClick={testMpesa} disabled={testingMpesa} style={{ height: 38 }}>
                      {testingMpesa ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Sending...</> : '💳 Send Test Payment'}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    Sends a real STK Push to the test phone via Daraja.
                  </p>
                </div>

                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-gold" onClick={() => saveConfig('payments')} disabled={saving}>
                    {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : '💾 Save Payment Settings'}
                  </button>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 18, marginBottom: 20 }}>🏦 Bank Transfer</h3>
              <div style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
                {[
                  { key: 'bankName', label: 'Bank Name' },
                  { key: 'accountName', label: 'Account Name' },
                  { key: 'accountNumber', label: 'Account Number' },
                  { key: 'branch', label: 'Branch' },
                  { key: 'swiftCode', label: 'SWIFT Code' },
                ].map(f => (
                  <Field key={f.key} label={f.label}>
                    <input className="input" type="text" value={bank[f.key]}
                      onChange={e => setBank(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: 280, height: 38 }} />
                  </Field>
                ))}
                <Field label="Reconciliation Email" hint="Bank statement email for auto-reconciliation">
                  <input className="input" type="email" value={bank.reconciliationEmail}
                    onChange={e => setBank(p => ({ ...p, reconciliationEmail: e.target.value }))}
                    style={{ width: 280, height: 38 }} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ═══ FEES & PROMOS ═══ */}
        {tab === 'fees' && (
          <div style={{ display: 'grid', gap: 24 }}>
            <section style={{ background: '#111', padding: 24, borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 24 }}>Fee Structure</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {[
                  { key: 'listingFee', label: 'Standard Listing (KES)', def: 1000 },
                  { key: 'auctionRegistrationFee', label: 'Auction Entry (KES)', def: 2000 },
                  { key: 'ghostCheckFee', label: 'Ghost Check (KES)', def: 2500 },
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
        )}


        {/* ═══ PACKAGES ═══ */}
        {tab === 'packages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: '1rem', margin: 0, color: '#fff' }}>Listing Packages</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                    Edit package prices and limits here — no code changes needed. Toggle isFree to waive payment for any package.
                  </p>
                </div>
                <button onClick={() => {
                  const newPkg = { id: `pkg_${Date.now()}`, name: 'New Package', priceMonthly: 0, listingMax: 5, forRole: 'dealer', isActive: true, isFree: false, features: [], description: '' };
                  setPackages(p => [...p, newPkg]);
                }} style={{ padding: '8px 18px', background: 'var(--gold)', border: 'none', borderRadius: 9, color: '#000', fontSize: 12, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  + New Package
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {packages.map((pkg, i) => (
                  <div key={pkg.id || i} style={{ background: '#111', border: `1px solid ${pkg.isFree ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: '18px 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Name</div>
                        <input value={pkg.name} onChange={e => setPackages(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Price/mo (KES)</div>
                        <input type="number" min={0} value={pkg.priceMonthly} onChange={e => setPackages(p => p.map((x, j) => j === i ? { ...x, priceMonthly: Number(e.target.value) } : x))}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Listing Max (0=∞)</div>
                        <input type="number" min={0} value={pkg.listingMax} onChange={e => setPackages(p => p.map((x, j) => j === i ? { ...x, listingMax: Number(e.target.value) } : x))}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>For</div>
                        <select value={pkg.forRole} onChange={e => setPackages(p => p.map((x, j) => j === i ? { ...x, forRole: e.target.value } : x))}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#111', color: '#fff', fontSize: 12, outline: 'none' }}>
                          <option value="dealer">Dealer</option>
                          <option value="seller">Seller</option>
                          <option value="both">Both</option>
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Free (Waived)</div>
                        <button onClick={() => setPackages(p => p.map((x, j) => j === i ? { ...x, isFree: !x.isFree } : x))}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${pkg.isFree ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, background: pkg.isFree ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)', color: pkg.isFree ? '#22c55e' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          {pkg.isFree ? '✓ Free' : 'Paid'}
                        </button>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Active</div>
                        <button onClick={() => setPackages(p => p.map((x, j) => j === i ? { ...x, isActive: !x.isActive } : x))}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${pkg.isActive ? 'rgba(212,168,67,0.3)' : 'rgba(255,255,255,0.08)'}`, background: pkg.isActive ? 'rgba(212,168,67,0.08)' : 'rgba(255,255,255,0.03)', color: pkg.isActive ? 'var(--gold)' : 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          {pkg.isActive ? 'On' : 'Off'}
                        </button>
                      </div>
                      <button onClick={() => setPackages(p => p.filter((_, j) => j !== i))}
                        style={{ padding: '7px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, color: 'rgba(239,68,68,0.7)', fontSize: 12, cursor: 'pointer' }}>✕</button>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <input placeholder="Description (shown to users)" value={pkg.description || ''}
                        onChange={e => setPackages(p => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn btn-gold" style={{ width: '100%', marginTop: 20 }} disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await adminAPI.updatePackages(packages);
                    toast('Packages saved ✓', 'success');
                  } catch { toast('Failed to save', 'error'); } finally { setSaving(false); }
                }}>
                {saving ? 'Saving…' : '💾 Save All Packages'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ RECONCILIATION ═══ */}
        {tab === 'reconciliation' && (
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, marginBottom: 20 }}>🔄 Auto-Reconciliation</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Automatically match M-Pesa and bank deposits to platform transactions.
            </p>
            <div style={{ display: 'grid', gap: 20, maxWidth: 700 }}>
              <Field label="Auto-Reconciliation">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={reconcile.autoReconcile}
                    onChange={e => setReconcile(p => ({ ...p, autoReconcile: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: 13 }}>Enabled</span>
                </label>
              </Field>

              <Field label="Match Threshold (minutes)" hint="Max time diff to match payment to transaction">
                <input className="input" type="number" min={60} max={10080} value={reconcile.matchThresholdMins}
                  onChange={e => setReconcile(p => ({ ...p, matchThresholdMins: Number(e.target.value) }))}
                  style={{ width: 120, height: 38 }} />
              </Field>

              <Field label="Schedule">
                <select className="input" value={reconcile.schedule}
                  onChange={e => setReconcile(p => ({ ...p, schedule: e.target.value }))}
                  style={{ width: 180, height: 38 }}>
                  <option value="every hour">Every hour</option>
                  <option value="every 6 hours">Every 6 hours</option>
                  <option value="every 12 hours">Every 12 hours</option>
                  <option value="daily">Daily</option>
                </select>
              </Field>

              <Field label="Default Narration" hint="Narration to match in bank statements">
                <input className="input" type="text" value={reconcile.defaultNarration}
                  onChange={e => setReconcile(p => ({ ...p, defaultNarration: e.target.value }))}
                  style={{ width: 280, height: 38 }} />
              </Field>

              <Field label="Notify on Mismatch">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={reconcile.notifyOnMismatch}
                    onChange={e => setReconcile(p => ({ ...p, notifyOnMismatch: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: 13 }}>Send email alert</span>
                </label>
              </Field>
            </div>
            <div style={{ marginTop: 20 }}>
              <button className="btn btn-gold" onClick={() => saveConfig('reconciliation')} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : '💾 Save Reconciliation Settings'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ AUDIT LOG ═══ */}
        {tab === 'audit' && isSuperAdmin && (
          <div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem' }}>Immutable Audit Log</h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{auditLog.length} entries</span>
              </div>
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Action</th>
                      <th>Admin</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No audit entries yet</td></tr>
                    ) : auditLog.map((entry, i) => (
                      <tr key={entry._id || i}>
                        <td style={{ color: 'var(--text-dim)', fontFamily: 'monospace', fontSize: 12 }}>{auditLog.length - i}</td>
                        <td style={{ fontSize: 13 }}>{entry.action}</td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{entry.admin}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-KE') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>System Tools</h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={async () => {
                  if (!window.confirm('This will re-seed the database and may take 10-15 seconds. Continue?')) return;
                  setLoading(true);
                  try {
                    const res = await adminAPI.reseed();
                    toast.success(`Reseeded: ${res.result.webhost.length} webhost, ${res.result.admin.length} admin, ${res.result.demos.length} demos, ${res.result.cars} cars`);
                  } catch (e) {
                    toast.error(e?.response?.data?.message || e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Reseed Database
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
