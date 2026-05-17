import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authAPI } from '../../api/api';

const Field = ({ label, children }) => (
  <div className="input-group">{label && <label className="input-label">{label}</label>}{children}</div>
);

const TEAM_ROLES = [
  { id: 'admin', label: 'Admin', desc: 'Full access to all dealer operations', color: 'var(--gold)' },
  { id: 'sales', label: 'Sales Rep', desc: 'View/edit listings, manage bids, chat with buyers', color: '#60a5fa' },
  { id: 'inventory', label: 'Inventory Manager', desc: 'Add/edit/delete listings, manage photos & pricing', color: '#34d399' },
  { id: 'finance', label: 'Finance', desc: 'View earnings, payments, escrow transactions', color: '#f59e0b' },
  { id: 'support', label: 'Support', desc: 'View listings, chat with buyers, manage reviews', color: '#a78bfa' },
];

const ROLE_PERMISSIONS = {
  admin:     ['listings:create','listings:edit','listings:delete','listings:view','bids:view','bids:manage','earnings:view','payments:view','chat:view','chat:send','reviews:manage','team:manage','settings:all'],
  sales:     ['listings:view','listings:edit','bids:view','bids:manage','chat:view','chat:send','reviews:view'],
  inventory: ['listings:create','listings:edit','listings:delete','listings:view','bids:view'],
  finance:   ['listings:view','earnings:view','payments:view','bids:view'],
  support:   ['listings:view','chat:view','chat:send','reviews:view','reviews:manage'],
};

const PERMISSION_LABELS = {
  'listings:create': 'Create Listings',
  'listings:edit': 'Edit Listings',
  'listings:delete': 'Delete Listings',
  'listings:view': 'View Listings',
  'bids:view': 'View Bids',
  'bids:manage': 'Manage Bids (accept/reject)',
  'earnings:view': 'View Earnings',
  'payments:view': 'View Payments',
  'chat:view': 'View Chats',
  'chat:send': 'Send Messages',
  'reviews:view': 'View Reviews',
  'reviews:manage': 'Moderate Reviews',
  'team:manage': 'Manage Team Members',
  'settings:all': 'Access All Settings',
};

export default function DealerSettings() {
  const { user, isDealer } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('business');
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [business, setBusiness] = useState({
    businessName: '', location: '', phone: '', bio: '', email: '', website: '',
  });

  const [payments, setPayments] = useState({
    mpesaBusiness: '', mpesaBusinessName: '', bankName: '', bankAccount: '', bankBranch: '',
  });

  const [notifications, setNotifications] = useState({
    emailBids: true, emailPayments: true, emailEscrow: true, emailMarketing: false, smsAlerts: true,
  });

  const [visibility, setVisibility] = useState({
    showPhone: true, showEmail: true, showLocation: true, chatEnabled: true, autoApproveReviews: false,
  });

  const [team, setTeam] = useState([
    { id: '1', name: user?.name || 'You', email: user?.email || '', role: 'admin', status: 'active', joined: 'Account Owner' },
    { id: '2', name: 'James Mwangi', email: 'james@nairobi-autohub.com', role: 'sales', status: 'active', joined: '2 months ago' },
    { id: '3', name: 'Grace Wanjiku', email: 'grace@nairobi-autohub.com', role: 'inventory', status: 'active', joined: '1 month ago' },
  ]);

  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ name: '', email: '', role: 'sales' });

  useEffect(() => {
    if (user) {
      setBusiness({
        businessName: user.businessName || '',
        location: user.location || '',
        phone: user.phone || '',
        bio: user.bio || '',
        email: user.email || '',
        website: user.website || '',
      });
      setPayments({
        mpesaBusiness: user.mpesaBusiness || '',
        mpesaBusinessName: user.mpesaBusinessName || '',
        bankName: user.bankName || '',
        bankAccount: user.bankAccount || '',
        bankBranch: user.bankBranch || '',
      });
      if (user.visibility) setVisibility(prev => ({ ...prev, ...user.visibility }));
      setLoadingProfile(false);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {};
      if (tab === 'business') Object.assign(body, business);
      else if (tab === 'payments') Object.assign(body, payments);
      else if (tab === 'notifications') body.notifications = notifications;
      else if (tab === 'exposure') body.visibility = visibility;
      if (Object.keys(body).length > 0) await authAPI.updateProfile(body);
      toast('Settings saved', 'success');
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const handleInvite = () => {
    if (!invite.name || !invite.email) { toast('Name and email required', 'error'); return; }
    const newMember = {
      id: String(Date.now()), name: invite.name, email: invite.email,
      role: invite.role, status: 'invited', joined: 'Just now',
    };
    setTeam(prev => [...prev, newMember]);
    setInvite({ name: '', email: '', role: 'sales' });
    setShowInvite(false);
    toast(`Invitation sent to ${invite.name}`, 'success');
  };

  const handleRemoveMember = (id) => {
    if (id === '1') { toast('Cannot remove yourself', 'error'); return; }
    setTeam(prev => prev.filter(m => m.id !== id));
    toast('Team member removed', 'info');
  };

  const tabs = [
    { key: 'business', label: '🏪 Business' },
    ...(isDealer ? [{ key: 'payments', label: '💳 Payments' }] : []),
    { key: 'team', label: '👥 Team' },
    { key: 'notifications', label: '🔔 Notifications' },
    { key: 'exposure', label: '👁 Visibility' },
  ];

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 900 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Dealer Hub</div>
          <h2>Business Settings</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage your dealership profile, team, payments, and preferences</p>
        </div>

        <div className="tabs" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 28 }}>
          {/* ═══ BUSINESS PROFILE ═══ */}
          {tab === 'business' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ marginBottom: 4 }}>Business Profile</h3>
              <Field label="Business Name">
                <input className="input" value={business.businessName}
                  onChange={e => setBusiness(p => ({ ...p, businessName: e.target.value }))} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Email Address">
                  <input className="input" type="email" value={business.email}
                    onChange={e => setBusiness(p => ({ ...p, email: e.target.value }))} />
                </Field>
                <Field label="Phone Number">
                  <input className="input" value={business.phone}
                    onChange={e => setBusiness(p => ({ ...p, phone: e.target.value }))} />
                </Field>
                <Field label="Location / City">
                  <input className="input" value={business.location}
                    onChange={e => setBusiness(p => ({ ...p, location: e.target.value }))} />
                </Field>
                <Field label="Website">
                  <input className="input" placeholder="https://" value={business.website}
                    onChange={e => setBusiness(p => ({ ...p, website: e.target.value }))} />
                </Field>
              </div>
              <Field label="About / Bio">
                <textarea className="input" rows={3} value={business.bio}
                  onChange={e => setBusiness(p => ({ ...p, bio: e.target.value }))} />
              </Field>

              {isDealer && (
                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 16, marginTop: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Dealer Stats</div>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Rating', val: user?.dealerRating ? `⭐ ${user.dealerRating}/5` : '—' },
                      { label: 'Status', val: user?.approved ? '✅ Approved' : '⏳ Pending' },
                      { label: 'Listings', val: '12 active' },
                      { label: 'Team Size', val: `${team.length} members` },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: 2 }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ PAYMENTS ═══ */}
          {tab === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ marginBottom: 4 }}>M-Pesa Business</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Buyers pay into this account for purchases.</p>
              <div className="grid-2">
                <Field label="M-Pesa Business Number">
                  <input className="input" value={payments.mpesaBusiness}
                    onChange={e => setPayments(p => ({ ...p, mpesaBusiness: e.target.value }))} />
                </Field>
                <Field label="Business Name (on M-Pesa)">
                  <input className="input" value={payments.mpesaBusinessName}
                    onChange={e => setPayments(p => ({ ...p, mpesaBusinessName: e.target.value }))} />
                </Field>
              </div>
              <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
              <h3 style={{ marginBottom: 4 }}>Bank Account</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>For payouts and settlements.</p>
              <div className="grid-2">
                <Field label="Bank Name">
                  <input className="input" value={payments.bankName}
                    onChange={e => setPayments(p => ({ ...p, bankName: e.target.value }))} />
                </Field>
                <Field label="Branch">
                  <input className="input" value={payments.bankBranch}
                    onChange={e => setPayments(p => ({ ...p, bankBranch: e.target.value }))} />
                </Field>
              </div>
              <Field label="Account Number">
                <input className="input" value={payments.bankAccount}
                  onChange={e => setPayments(p => ({ ...p, bankAccount: e.target.value }))} />
              </Field>
              <div style={{ background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.12)', borderRadius: 8, padding: 14, fontSize: 12, color: 'var(--text-muted)' }}>
                Payment details are encrypted and used for payouts only.
              </div>
            </div>
          )}

          {/* ═══ TEAM & RBAC ═══ */}
          {tab === 'team' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ marginBottom: 4 }}>Team Management</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Manage your dealership staff and their access levels</p>
                </div>
                <button className="btn btn-gold btn-sm" onClick={() => setShowInvite(true)}>+ Invite Member</button>
              </div>

              {/* Invite form */}
              {showInvite && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--gold)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <h4 style={{ fontSize: 14, marginBottom: 14 }}>Invite Team Member</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                    <Field label="Name">
                      <input className="input" placeholder="Full name" value={invite.name}
                        onChange={e => setInvite(p => ({ ...p, name: e.target.value }))} />
                    </Field>
                    <Field label="Email">
                      <input className="input" type="email" placeholder="email@example.com" value={invite.email}
                        onChange={e => setInvite(p => ({ ...p, email: e.target.value }))} />
                    </Field>
                    <Field label="Role">
                      <select className="input" value={invite.role} onChange={e => setInvite(p => ({ ...p, role: e.target.value }))}>
                        {TEAM_ROLES.filter(r => r.id !== 'admin').map(r => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                    </Field>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-gold btn-sm" onClick={handleInvite} style={{ height: 38 }}>Send</button>
                      <button className="btn btn-outline btn-sm" onClick={() => setShowInvite(false)} style={{ height: 38 }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Team members */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {team.map(m => {
                  const role = TEAM_ROLES.find(r => r.id === m.role);
                  return (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 10,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${role?.color || '#666'}, rgba(255,255,255,0.1))`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {m.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.email}</div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                        background: `${role?.color || '#666'}20`, color: role?.color || '#666',
                      }}>{role?.label || m.role}</span>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 10,
                        background: m.status === 'active' ? 'rgba(52,211,153,0.15)' : 'rgba(245,158,11,0.15)',
                        color: m.status === 'active' ? '#34d399' : '#f59e0b',
                      }}>{m.status}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.joined}</span>
                      {m.id !== '1' && (
                        <button onClick={() => handleRemoveMember(m.id)} style={{
                          background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer',
                          fontSize: 16, padding: '4px 8px', borderRadius: 6, opacity: 0.5,
                        }} onMouseEnter={e => e.target.style.opacity = '1'}
                           onMouseLeave={e => e.target.style.opacity = '0.5'}>✕</button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Role permissions matrix */}
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Role Permissions</h4>
                <div className="table-wrap">
                  <table className="data-table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: 130 }}>Permission</th>
                        {TEAM_ROLES.map(r => (
                          <th key={r.id} style={{ textAlign: 'center', color: r.color, fontSize: 10, minWidth: 80 }}>{r.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(PERMISSION_LABELS).map(([perm, label]) => (
                        <tr key={perm}>
                          <td style={{ fontSize: 11 }}>{label}</td>
                          {TEAM_ROLES.map(r => (
                            <td key={r.id} style={{ textAlign: 'center' }}>
                              {ROLE_PERMISSIONS[r.id]?.includes(perm) ? (
                                <span style={{ color: '#34d399', fontSize: 14 }}>✓</span>
                              ) : (
                                <span style={{ color: '#333', fontSize: 11 }}>—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ NOTIFICATIONS ═══ */}
          {tab === 'notifications' && (
            <div>
              <h3 style={{ marginBottom: 16 }}>Notification Preferences</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { key: 'emailBids', label: 'New bids on your listings', desc: 'Get notified when someone places a bid' },
                  { key: 'emailPayments', label: 'Payment confirmations', desc: 'M-Pesa payment received or verified' },
                  { key: 'emailEscrow', label: 'Escrow updates', desc: 'Escrow funded, released, or refunded' },
                  { key: 'emailMarketing', label: 'Marketing & promotions', desc: 'Tips, featured listing opportunities' },
                  { key: 'smsAlerts', label: 'SMS alerts', desc: 'Critical updates via text message' },
                ].map(n => (
                  <label key={n.key} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  }}>
                    <input type="checkbox" checked={notifications[n.key]}
                      onChange={e => setNotifications(p => ({ ...p, [n.key]: e.target.checked }))}
                      style={{ width: 18, height: 18, accentColor: 'var(--gold)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{n.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.desc}</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{notifications[n.key] ? '✅ On' : 'Off'}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ═══ VISIBILITY ═══ */}
          {tab === 'exposure' && (
            <div>
              <h3 style={{ marginBottom: 4 }}>Buyer Visibility</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                Control what buyers see on your listings and dealer profile.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { key: 'showPhone', label: 'Show Phone Number', desc: 'Display phone on car listings' },
                  { key: 'showEmail', label: 'Show Email Address', desc: 'Display email on dealer profile' },
                  { key: 'showLocation', label: 'Show Location', desc: 'Display business location on listings' },
                  { key: 'chatEnabled', label: 'Enable Chat', desc: 'Allow buyers to message you directly' },
                  { key: 'autoApproveReviews', label: 'Auto-approve Reviews', desc: 'Reviews appear immediately' },
                ].map(n => (
                  <label key={n.key} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  }}>
                    <input type="checkbox" checked={visibility[n.key]}
                      onChange={e => setVisibility(p => ({ ...p, [n.key]: e.target.checked }))}
                      style={{ width: 18, height: 18, accentColor: 'var(--gold)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{n.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.desc}</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{visibility[n.key] ? '✅ Visible' : 'Hidden'}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {tab !== 'team' && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-gold btn-lg" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Saving...</> : '💾 Save Settings'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}