import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, default as api } from '../../api/api';
import AdminSettingsGeneral from './AdminSettingsGeneral';
import AdminSettingsBranding from './AdminSettingsBranding';
import AdminSettingsPayments from './AdminSettingsPayments';
import AdminSettingsPackages from './AdminSettingsPackages';

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
  requireDealerApproval: false,
  dealerTrialDays: 14,
  waivePayments: true,
  freeMarket: true,
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
  primaryColor: '#D4C4A8',
  accentColor: '#E8DAC4',
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
          baseFontSize: c.baseFontSize ?? DEFAULTS.baseFontSize,
          lineHeight: c.lineHeight ?? DEFAULTS.lineHeight,
          listingFee: c.listingFee ?? 1000,
          auctionRegistrationFee: c.auctionRegistrationFee ?? 2000,
          ghostCheckFee: c.ghostCheckFee ?? 2500,
          commissionPercentage: c.commissionPercentage ?? 2,
          platformVat: c.platformVat ?? 16,
          buyerPremiumPct: c.buyerPremiumPct ?? 0,
          activePromos: c.activePromos || [],
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
      if (!section || section === 'fees') {
        Object.assign(body, {
          listingFee: Number(config.listingFee || 0),
          auctionRegistrationFee: Number(config.auctionRegistrationFee || 0),
          ghostCheckFee: Number(config.ghostCheckFee || 0),
          commissionPercentage: Number(config.commissionPercentage || 0),
          platformVat: Number(config.platformVat || 0),
          buyerPremiumPct: Number(config.buyerPremiumPct || 0),
          activePromos: config.activePromos || [],
        });
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

        {tab === 'general' && <AdminSettingsGeneral {...{ config, setConfig, saveConfig, saving }} />}

        {tab === 'branding' && <AdminSettingsBranding {...{ branding, setBranding, config, setConfig, saveConfig, saving }} />}

        {tab === 'payments' && <AdminSettingsPayments {...{ daraja, setDaraja, bank, setBank, saveConfig, saving, testPhone, setTestPhone, testAmount, setTestAmount, testingMpesa, testMpesa }} />}

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


        {tab === 'packages' && <AdminSettingsPackages {...{ packages, setPackages, saving, setSaving }} />}

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
