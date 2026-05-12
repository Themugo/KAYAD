import { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/api';

const DEFAULTS = {
  platformName: 'Giclan Motors',
  supportEmail: 'support@giclanmotors.co.ke',
  supportPhone: '254700100200',
  dealerCommission: 5,
  bidCommitmentPct: 5,
  escrowReleaseDays: 3,
  maxListingImages: 8,
  allowGuestBrowsing: true,
  requireDealerApproval: true,
};

const DEPARTMENTS = [
  { id: 'finance', label: 'Finance', icon: '💰', desc: 'Payments, escrows, transactions, revenue' },
  { id: 'hr', label: 'HR', icon: '👥', desc: 'User management, dealer approvals, profiles' },
  { id: 'marketing', label: 'Marketing', icon: '📢', desc: 'Car listings, promotions, analytics, views' },
  { id: 'tech-support', label: 'Technical Support', icon: '🛠', desc: 'User support, reports, system health' },
];

const PERMISSION_MAP = {
  finance: ['view_payments', 'view_escrows', 'view_transactions', 'view_revenue', 'reconcile'],
  hr: ['view_users', 'approve_dealers', 'manage_profiles'],
  marketing: ['view_cars', 'manage_promotions', 'view_analytics', 'feature_cars'],
  'tech-support': ['view_users', 'view_cars', 'view_bids', 'view_auctions', 'view_reports'],
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

  // Test payment state
  const [testPhone, setTestPhone] = useState('254708374149');
  const [testAmount, setTestAmount] = useState(1);
  const [testingMpesa, setTestingMpesa] = useState(false);

  // Subadmins
  const [subadmins, setSubadmins] = useState([]);
  const [showAddSubadmin, setShowAddSubadmin] = useState(false);
  const [newSub, setNewSub] = useState({ name: '', email: '', password: '', department: 'finance' });

  // Audit log
  const [auditLog, setAuditLog] = useState([]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { config: c } = await adminAPI.getConfig();
      if (c) {
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
        if (c.daraja) setDaraja(c.daraja);
        if (c.bank) setBank(c.bank);
        if (c.reconciliation) setReconcile(c.reconciliation);
      }
    } catch { /* demo fallback — keep defaults */ }

    try {
      const { subadmins: subs } = await adminAPI.listSubadmins();
      setSubadmins(subs || []);
    } catch { /* ignore */ }

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

  const addSubadmin = async () => {
    if (!newSub.name || !newSub.email || !newSub.password) {
      toast('Name, email, and password required', 'error');
      return;
    }
    try {
      await adminAPI.createSubadmin(newSub);
      toast(`Subadmin ${newSub.name} created`, 'success');
      setShowAddSubadmin(false);
      setNewSub({ name: '', email: '', password: '', department: 'finance' });
      const { subadmins: subs } = await adminAPI.listSubadmins();
      setSubadmins(subs || []);
    } catch {
      toast('Failed to create subadmin', 'error');
    }
  };

  const toggleSubadmin = async (id) => {
    try {
      await adminAPI.toggleSubadmin(id);
      setSubadmins(prev => prev.map(s => s._id === id ? { ...s, isBanned: !s.isBanned } : s));
      toast('Subadmin toggled', 'success');
    } catch {
      toast('Failed to toggle', 'error');
    }
  };

  const deleteSubadmin = async (id) => {
    if (!confirm('Remove this subadmin?')) return;
    try {
      await adminAPI.deleteSubadmin(id);
      setSubadmins(prev => prev.filter(s => s._id !== id));
      toast('Subadmin removed', 'success');
    } catch {
      toast('Failed to remove', 'error');
    }
  };

  const resetDemo = async () => {
    if (!confirm('Reset all demo data to factory defaults? This cannot be undone.')) return;
    try {
      await adminAPI.resetDemo();
      toast('Demo data reset complete', 'success');
      await loadConfig();
    } catch {
      toast('Reset failed', 'error');
    }
  };

  const Field = ({ label, hint, children }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
        {label}
        {hint && <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{hint}</div>}
      </label>
      {children}
    </div>
  );

  const tabs = [
    { id: 'general', label: '⚙ General' },
    { id: 'payments', label: '💳 Payments' },
    { id: 'reconciliation', label: '🔄 Reconciliation' },
    { id: 'subadmins', label: '👥 Sub-Admins' },
    { id: 'audit', label: '📋 Audit Log' },
  ];

  if (!isSuperAdmin) tabs.splice(4, 1);

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
                  { key: 'supportEmail', label: 'Support Email', type: 'email' },
                  { key: 'supportPhone', label: 'Support Phone', type: 'text' },
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

            <div className="card" style={{ padding: 24, border: '1px solid rgba(212,168,67,0.2)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>🔄 Demo Management</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                Reset all demo data to factory defaults.
              </p>
              <button className="btn btn-gold" onClick={resetDemo}>🔄 Reset Demo Data</button>
            </div>
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

        {/* ═══ SUB-ADMINS ═══ */}
        {tab === 'subadmins' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18 }}>👥 Sub-Admin Management</h3>
              <button className="btn btn-gold btn-sm" onClick={() => setShowAddSubadmin(true)}>
                + Add Sub-Admin
              </button>
            </div>

            {showAddSubadmin && (
              <div className="card" style={{ padding: 24, marginBottom: 20, border: '1px solid var(--gold-muted)' }}>
                <h4 style={{ fontSize: 14, marginBottom: 16 }}>New Sub-Admin</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="input-group">
                    <label className="input-label">Full Name</label>
                    <input className="input" value={newSub.name}
                      onChange={e => setNewSub(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Mary Wanjiku" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Email</label>
                    <input className="input" type="email" value={newSub.email}
                      onChange={e => setNewSub(p => ({ ...p, email: e.target.value }))} placeholder="mary@giclanmotors.co.ke" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Password</label>
                    <input className="input" type="password" value={newSub.password}
                      onChange={e => setNewSub(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Department</label>
                    <select className="input" value={newSub.department}
                      onChange={e => setNewSub(p => ({ ...p, department: e.target.value }))}
                      style={{ height: 38 }}>
                      {DEPARTMENTS.map(d => (
                        <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                  <button className="btn btn-gold" onClick={addSubadmin}>Create Sub-Admin</button>
                  <button className="btn btn-outline" onClick={() => setShowAddSubadmin(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: 16 }}>
              {DEPARTMENTS.map(dept => {
                const members = subadmins.filter(s => s.department === dept.id);
                const perms = PERMISSION_MAP[dept.id] || [];
                return (
                  <div key={dept.id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <h4 style={{ fontSize: 15, marginBottom: 2 }}>{dept.icon} {dept.label}</h4>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dept.desc}</p>
                      </div>
                      <span className="badge badge-muted">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      {perms.map(p => (
                        <span key={p} style={{ fontSize: 11, padding: '2px 8px', background: 'var(--gold-glow)', borderRadius: 4, color: 'var(--gold-light)' }}>
                          {p.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>

                    {members.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic' }}>No sub-admins assigned</p>
                    ) : members.map(m => (
                      <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.email}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className={`badge ${!m.isBanned ? 'badge-green' : 'badge-muted'}`}>
                            {!m.isBanned ? 'Active' : 'Inactive'}
                          </span>
                          <button className="btn btn-sm btn-outline"
                            onClick={() => toggleSubadmin(m._id)}
                            style={{ fontSize: 11, padding: '4px 10px' }}>
                            {!m.isBanned ? 'Deactivate' : 'Activate'}
                          </button>
                          <button className="btn btn-sm btn-outline"
                            onClick={() => deleteSubadmin(m._id)}
                            style={{ fontSize: 11, padding: '4px 10px', color: 'var(--red)', borderColor: 'var(--red)' }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
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
        )}
      </div>
    </div>
  );
}
