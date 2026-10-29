import { useState, useEffect, useMemo, Children, cloneElement, isValidElement } from 'react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/api';
import AdminSettingsBranding from './AdminSettingsBranding';
import AdminSettingsOnboarding from './AdminSettingsOnboarding';

const DEFAULTS = {
  platformName: 'KAYAD',
  supportEmail: 'support@kayad.space',
  supportPhone: '254700100200',
  dealerCommission: 5,
  bidCommitmentPct: 5,
  escrowReleaseDays: 3,
  maxListingImages: 8,
  allowGuestBrowsing: true,
  requireDealerApproval: true,
};

// Default branding with KAYAD navy/blue theme
const DEFAULT_BRANDING = {
  logoType: 'image',
  logoText: 'KAYAD',
  logoUrl: '/branding/kayad-road-mark.svg',
  brandTagline: "Kenya's Trusted Vehicle Marketplace",
  primaryColor: '#176B87',
  primaryLight: '#13B8A6',
  primaryDark: '#0A3340',
  primaryGlow: 'rgba(22, 132, 255, 0.25)',
  accentColor: '#176B87',
  backgroundColor: '#F7F9FC',
  surfaceColor: '#EEF7F5',
  cardColor: '#FFFFFF',
  textColor: '#0A3340',
  textMutedColor: '#64748B',
  textDimColor: '#94A3B8',
  borderColor: '#D7E7E4',
  successColor: '#10B981',
  dangerColor: '#EF4444',
  warningColor: '#176b87',
  infoColor: '#176B87',
};

export default function AdminSettings() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Platform config
  const [config, setConfig] = useState(DEFAULTS);
  const [daraja, setDaraja] = useState({ environment: 'sandbox', consumerKey: '', consumerSecret: '', passkey: '', shortCode: '' });
  const [bank, setBank] = useState({ bankName: '', accountName: '', accountNumber: '', branch: '', swiftCode: '', reconciliationEmail: '' });
  const [reconcile, setReconcile] = useState({ autoReconcile: true, matchThresholdMins: 1440, schedule: 'every 6 hours', notifyOnMismatch: true, defaultNarration: '' });

  // Branding state
  const [branding, setBranding] = useState(DEFAULT_BRANDING);

  // Test payment state
  const [testPhone, setTestPhone] = useState('254708374149');
  const [testAmount, setTestAmount] = useState(1);
  const [testingMpesa, setTestingMpesa] = useState(false);

  // Audit log
  const [auditLog, setAuditLog] = useState([]);

  // Distinguishes "no config saved yet, defaults are correct" from "the
  // request to load config actually failed" — a failed fetch must never be
  // visually indistinguishable from a legitimately empty/default config.
  const [configLoadError, setConfigLoadError] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [auditLogLoadError, setAuditLogLoadError] = useState(null);

  const loadConfig = async () => {
    setLoading(true);
    setConfigLoadError(null);
    setConfigLoaded(false);
    setAuditLogLoadError(null);
    try {
      const response = await adminAPI.getConfig();
      const c = response?.config;
      if (!c || typeof c !== 'object' || Array.isArray(c)) {
        throw new Error('The settings service returned an invalid configuration response.');
      }
      setConfig({
          platformName: c.platformName || DEFAULTS.platformName,
          supportEmail: c.supportEmail || DEFAULTS.supportEmail,
          supportPhone: c.supportPhone || DEFAULTS.supportPhone,
          dealerCommission: c.dealerCommission ?? DEFAULTS.dealerCommission,
          bidCommitmentPct: c.bidCommitmentPct ?? DEFAULTS.bidCommitmentPct,
          escrowReleaseDays: c.escrowReleaseDays ?? DEFAULTS.escrowReleaseDays,
          maxListingImages: c.maxListingImages ?? DEFAULTS.maxListingImages,
          allowGuestBrowsing: c.allowGuestBrowsing ?? DEFAULTS.allowGuestBrowsing,
          requireDealerApproval: c.requireDealerApproval ?? DEFAULTS.requireDealerApproval,
      });
      setDaraja({ environment: 'sandbox', consumerKey: '', consumerSecret: '', passkey: '', shortCode: '', ...(c.daraja && typeof c.daraja === 'object' && !Array.isArray(c.daraja) ? c.daraja : {}) });
      setBank({ bankName: '', accountName: '', accountNumber: '', branch: '', swiftCode: '', reconciliationEmail: '', ...(c.bank && typeof c.bank === 'object' && !Array.isArray(c.bank) ? c.bank : {}) });
      setReconcile({ autoReconcile: true, matchThresholdMins: 1440, schedule: 'every 6 hours', notifyOnMismatch: true, defaultNarration: '', ...(c.reconciliation && typeof c.reconciliation === 'object' && !Array.isArray(c.reconciliation) ? c.reconciliation : {}) });
      // Load branding config
      if (c.branding && typeof c.branding === 'object' && !Array.isArray(c.branding)) {
        setBranding({ ...DEFAULT_BRANDING, ...c.branding });
      }
      setConfigLoaded(true);
    } catch {
      // The request itself failed (network/auth/server error) — this is NOT
      // the same thing as "no config exists yet". Surface it so an admin
      // never mistakes an unreachable config for a confirmed, saved default.
      setConfigLoaded(false);
      setConfigLoadError('Could not load saved settings from the server. The values shown below may not reflect what is actually configured. Saving is disabled until the saved configuration loads successfully. Check the connection and retry.');
    }

    try {
      const response = await adminAPI.getAuditLog({ limit: 100 });
      if (!Array.isArray(response?.entries)) throw new Error('Invalid audit-log response');
      setAuditLog(response.entries);
      setAuditLogLoadError(null);
    } catch {
      setAuditLogLoadError('Audit log could not be loaded from the server. Retry to distinguish a retrieval failure from an empty log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConfig(); }, []);

  const saveConfig = async (section) => {
    if (!configLoaded || configLoadError) {
      toast('Settings have not been loaded from the server. Reload successfully before saving.', 'error');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const body = {};
      if (!section || section === 'general') {
        Object.assign(body, {
          platformName: config.platformName,
          supportEmail: config.supportEmail,
          supportPhone: config.supportPhone,
          dealerCommission: Number(config.dealerCommission),
          bidCommitmentPct: Number(config.bidCommitmentPct),
          escrowReleaseDays: Number(config.escrowReleaseDays),
          maxListingImages: Number(config.maxListingImages),
          allowGuestBrowsing: config.allowGuestBrowsing,
          requireDealerApproval: config.requireDealerApproval,
        });
      }
      if (!section || section === 'payments') {
        body.daraja = daraja;
        body.bank = bank;
      }
      if (!section || section === 'reconciliation') {
        body.reconciliation = reconcile;
      }
      if (!section || section === 'branding') {
        body.branding = branding;
      }
      const savedResponse = await adminAPI.updateConfig(body);
      if (!savedResponse || savedResponse.success === false || !savedResponse.config) {
        throw new Error('The server did not confirm the saved configuration.');
      }
      toast('Settings saved', 'success');
      await loadConfig();
    } catch {
      toast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const testMpesa = async () => {
    if (daraja.environment === 'production') {
      toast('STK testing is disabled while Daraja is set to production. Switch to sandbox before testing.', 'error');
      return;
    }
    if (!/^254[17]\d{8}$/.test(String(testPhone)) || !Number.isFinite(Number(testAmount)) || Number(testAmount) < 1 || Number(testAmount) > 1000) {
      toast('Enter a valid Kenyan mobile number (2547… or 2541…) and an amount from KES 1 to 1,000.', 'error');
      return;
    }
    setTestingMpesa(true);
    try {
      await adminAPI.testMpesa({ phone: testPhone, amount: Number(testAmount) });
      toast('Daraja accepted the STK Push request. This does not confirm payment settlement.', 'success');
    } catch {
      toast('M-Pesa test failed — check Daraja config', 'error');
    } finally {
      setTestingMpesa(false);
    }
  };



  const Field = ({ label, hint, children }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
        {label}
        {hint && <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{hint}</div>}
      </label>
      {Children.map(children, child => (isValidElement(child) && child.props['aria-label'] === undefined ? cloneElement(child, { 'aria-label': label }) : child))}
    </div>
  );

  const tabs = useMemo(() => {
    const all = [
      { id: 'general', label: 'General' },
      { id: 'onboarding', label: 'Onboarding' },
      { id: 'branding', label: 'Branding' },
      { id: 'payments', label: 'Payments' },
      { id: 'reconciliation', label: 'Reconciliation' },
      { id: 'audit', label: 'Audit Log' },
    ];
    return isSuperAdmin ? all : all.filter((t) => ['general', 'onboarding', 'branding', 'payments'].includes(t.id));
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

        {configLoadError && (
          <div role="alert" style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 13 }}>
            <div>{configLoadError}</div>
            <button type="button" className="btn btn-sm btn-outline" onClick={loadConfig} disabled={loading || saving} style={{ marginTop: 10 }}>
              {loading ? 'Reloading…' : 'Retry loading settings'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`btn btn-sm ${tab === t.id ? 'btn-gold' : 'btn-outline'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ ONBOARDING (Stage 5) ═══ */}
        {tab === 'onboarding' && <AdminSettingsOnboarding />}

        {/* ═══ BRANDING ═══ */}
        {tab === 'branding' && (
          <AdminSettingsBranding
            branding={branding}
            setBranding={setBranding}
            config={config}
            setConfig={setConfig}
            saveConfig={saveConfig}
            saving={saving}
            canSave={configLoaded && !configLoadError}
          />
        )}

        {/* ═══ GENERAL ═══ */}
        {tab === 'general' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Platform Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { key: 'platformName', label: 'Platform Name', type: 'text' },
                  { key: 'supportEmail', label: 'Support Email', type: 'email' },
                  { key: 'supportPhone', label: 'Support Phone', type: 'text' },
                ].map(f => (
                  <div key={f.key} className="input-group">
                    <label className="input-label">{f.label}</label>
                    <input aria-label={f.label} className="input" type={f.type} value={config[f.key]}
                      onChange={e => setConfig(p => ({ ...p, [f.key]: f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value }))} />
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
                ].map(f => (
                  <div key={f.key} className="input-group">
                    <label className="input-label">{f.label}</label>
                    <input aria-label={f.label} className="input" type={f.type} min={f.min} max={f.max} value={config[f.key]}
                      onChange={e => setConfig(p => ({ ...p, [f.key]: f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Toggle Options</h3>
              {[
                { key: 'allowGuestBrowsing', label: 'Allow Guest Browsing' },
                { key: 'requireDealerApproval', label: 'Require Dealer Approval' },
              ].map(f => (
                <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '8px 0' }}>
                  <input type="checkbox" checked={config[f.key]} onChange={e => setConfig(p => ({ ...p, [f.key]: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} />
                  <span style={{ fontSize: 14 }}>{f.label}</span>
                </label>
              ))}
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-gold" onClick={() => saveConfig('general')} disabled={saving || !configLoaded} style={{ width: '100%' }}>
                  {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : 'Save General Settings'}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ═══ PAYMENTS ═══ */}
        {tab === 'payments' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18 }}>Daraja / M-Pesa</h3>
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
                  <input className="input" type="password" autoComplete="new-password" value={daraja.consumerKey || ''}
                    placeholder={daraja.hasConsumerKey ? 'Saved — leave blank to keep current key' : 'Enter consumer key'}
                    onChange={e => setDaraja(p => ({ ...p, consumerKey: e.target.value }))}
                    style={{ width: 280, height: 38 }} />
                </Field>

                <Field label="Consumer Secret">
                  <input className="input" type="password" autoComplete="new-password" value={daraja.consumerSecret || ''}
                    placeholder={daraja.hasConsumerSecret ? 'Saved — leave blank to keep current secret' : 'Enter consumer secret'}
                    onChange={e => setDaraja(p => ({ ...p, consumerSecret: e.target.value }))}
                    style={{ width: 280, height: 38 }} />
                </Field>

                <Field label="Passkey" hint="Online passkey for STK Push">
                  <input className="input" type="password" autoComplete="new-password" value={daraja.passkey || ''}
                    placeholder={daraja.hasPasskey ? 'Saved — leave blank to keep current passkey' : 'Enter passkey'}
                    onChange={e => setDaraja(p => ({ ...p, passkey: e.target.value }))}
                    style={{ width: 280, height: 38 }} />
                </Field>

                <Field label="Short Code" hint="Paybill/Till number">
                  <input className="input" type="text" value={daraja.shortCode}
                    onChange={e => setDaraja(p => ({ ...p, shortCode: e.target.value }))}
                    style={{ width: 180, height: 38 }} />
                </Field>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <h4 style={{ fontSize: 14, marginBottom: 12 }}>Test M-Pesa Payment</h4>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                      <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Test Phone (254...)</label>
                      <input aria-label="Test phone number" className="input" type="text" value={testPhone}
                        onChange={e => setTestPhone(e.target.value)}
                        style={{ width: 180, height: 38 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Amount (KES)</label>
                      <input aria-label="Test amount in KES" className="input" type="number" min={1} max={1000} value={testAmount}
                        onChange={e => setTestAmount(Number(e.target.value))}
                        style={{ width: 100, height: 38 }} />
                    </div>
                    <button className="btn btn-gold" onClick={testMpesa} disabled={testingMpesa} style={{ height: 38 }}>
                      {testingMpesa ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Sending...</> : 'Send Test Payment'}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    Test requests are blocked when the backend NODE_ENV is production. Save Daraja settings first. A successful response confirms an STK request was accepted, not that a payment settled.
                  </p>
                </div>

                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-gold" onClick={() => saveConfig('payments')} disabled={saving || !configLoaded}>
                    {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : 'Save Payment Settings'}
                  </button>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 18, marginBottom: 20 }}>Bank Transfer</h3>
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

        {/* ═══ RECONCILIATION ═══ */}
        {tab === 'reconciliation' && (
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, marginBottom: 20 }}>Auto-Reconciliation</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              These are saved reconciliation preferences. The currently deployed reconciliation worker runs fixed 15-minute, hourly and daily jobs; changing the schedule here does not reschedule those jobs. Notification and matching preferences also require worker-level integration before they can be treated as operational controls.
            </p>
            <div style={{ display: 'grid', gap: 20, maxWidth: 700 }}>
              <Field label="Auto-Reconciliation">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={reconcile.autoReconcile}
                    onChange={e => setReconcile(p => ({ ...p, autoReconcile: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} />
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
                    style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} />
                  <span style={{ fontSize: 13 }}>Send email alert</span>
                </label>
              </Field>
            </div>
            <div style={{ marginTop: 20 }}>
              <button className="btn btn-gold" onClick={() => saveConfig('reconciliation')} disabled={saving || !configLoaded}>
                {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : 'Save Reconciliation Settings'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ AUDIT LOG ═══ */}
        {tab === 'audit' && isSuperAdmin && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem' }}>Immutable Audit Log</h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{auditLog.length} entries</span>
            </div>
            {auditLogLoadError && <div role="alert" style={{ padding: 12, color: '#991B1B', background: '#FEF2F2' }}>
              {auditLogLoadError} <button type="button" className="btn btn-sm btn-outline" onClick={loadConfig} disabled={loading}>Retry</button>
            </div>}
            {!auditLogLoadError && <div style={{ maxHeight: 500, overflowY: 'auto' }}>
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
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}
