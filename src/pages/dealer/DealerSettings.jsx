import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authAPI } from '../../api/api';
import { Button } from '../../components/ui';

export default function DealerSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('business');
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [business, setBusiness] = useState({
    businessName: '',
    location: '',
    phone: '',
    bio: '',
  });

  const [payments, setPayments] = useState({
    mpesaBusiness: '',
    mpesaBusinessName: '',
    bankName: '',
    bankAccount: '',
    bankBranch: '',
  });

  const [notifications, setNotifications] = useState({
    emailBids: true,
    emailPayments: true,
    emailEscrow: true,
    emailMarketing: false,
    smsAlerts: true,
  });

  const [visibility, setVisibility] = useState({
    showPhone: true,
    showEmail: true,
    showLocation: true,
    chatEnabled: true,
    autoApproveReviews: false,
  });

  useEffect(() => {
    if (user) {
      setBusiness({
        businessName: user.businessName || '',
        location: user.location || '',
        phone: user.phone || '',
        bio: user.bio || '',
      });
      setPayments({
        mpesaBusiness: user.mpesaBusiness || '',
        mpesaBusinessName: user.mpesaBusinessName || '',
        bankName: user.bankName || '',
        bankAccount: user.bankAccount || '',
        bankBranch: user.bankBranch || '',
      });
      if (user.visibility) {
        setVisibility(prev => ({ ...prev, ...user.visibility }));
      }
      setLoadingProfile(false);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {};
      if (tab === 'business') {
        Object.assign(body, {
          businessName: business.businessName,
          location: business.location,
          phone: business.phone,
          bio: business.bio,
        });
      } else if (tab === 'payments') {
        Object.assign(body, {
          mpesaBusiness: payments.mpesaBusiness,
          mpesaBusinessName: payments.mpesaBusinessName,
          bankName: payments.bankName,
          bankAccount: payments.bankAccount,
          bankBranch: payments.bankBranch,
        });
      } else if (tab === 'exposure') {
        body.visibility = visibility;
      }

      if (Object.keys(body).length > 0) {
        await authAPI.updateProfile(body);
      }
      toast('Settings saved successfully', 'success');
    } catch {
      toast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children }) => (
    <div className="input-group">{label && <label className="input-label">{label}</label>}{children}</div>
  );

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 800 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Dealer Hub</div>
          <h2>Settings</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage your business profile, payments, and preferences</p>
        </div>

        <div className="tabs" style={{ marginBottom: 24 }}>
          {[
            { key: 'business', label: '🏪 Business' },
            { key: 'payments', label: '💳 Payments' },
            { key: 'notifications', label: '🔔 Notifications' },
            { key: 'exposure', label: '👁 Exposure' },
          ].map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 28 }}>
          {tab === 'business' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ marginBottom: 4 }}>Business Profile</h3>
              <Field label="Business Name">
                <input className="input" value={business.businessName}
                  onChange={e => setBusiness(p => ({ ...p, businessName: e.target.value }))} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Location / City">
                  <input className="input" value={business.location}
                    onChange={e => setBusiness(p => ({ ...p, location: e.target.value }))} />
                </Field>
                <Field label="Phone Number">
                  <input className="input" value={business.phone}
                    onChange={e => setBusiness(p => ({ ...p, phone: e.target.value }))} />
                </Field>
              </div>
              <Field label="About / Bio">
                <textarea className="input" rows={3} value={business.bio}
                  onChange={e => setBusiness(p => ({ ...p, bio: e.target.value }))} />
              </Field>

              <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 16, marginTop: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Your Dealer Stats</div>
                <div className="grid-3">
                  {[
                    { label: 'Rating', val: user?.dealerRating ? `⭐ ${user.dealerRating}/5` : '—' },
                    { label: 'Status', val: user?.approved ? '✅ Approved' : '⏳ Pending' },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: 2 }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ marginBottom: 4 }}>M-Pesa Business Settings</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
                Buyers pay into this account for purchases and bid commitments.
              </p>
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

              <h3 style={{ marginBottom: 4 }}>Bank Account (Escrow Payouts)</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
                Escrow funds are released to this account after buyer confirms receipt.
              </p>
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

              <div style={{ background: 'rgba(37, 99, 235,0.06)', border: '1px solid rgba(37, 99, 235,0.12)', borderRadius: 8, padding: 14, fontSize: 12, color: 'var(--text-muted)' }}>
                Your payment details are encrypted and only used for escrow payouts.
              </div>
            </div>
          )}

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
                    padding: '14px 0', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
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

          {tab === 'exposure' && (
            <div>
              <h3 style={{ marginBottom: 4 }}>Buyer Visibility</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                Control what buyers see when they view your listings and dealer profile.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { key: 'showPhone', label: 'Show Phone Number', desc: 'Display your phone number on car listings' },
                  { key: 'showEmail', label: 'Show Email Address', desc: 'Display your email on dealer profile' },
                  { key: 'showLocation', label: 'Show Location', desc: 'Display your business location on listings' },
                  { key: 'chatEnabled', label: 'Enable Chat', desc: 'Allow buyers to message you directly' },
                  { key: 'autoApproveReviews', label: 'Auto-approve Reviews', desc: 'Reviews appear immediately without moderation' },
                ].map(n => (
                  <label key={n.key} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 0', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
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
              <div style={{ background: 'rgba(37, 99, 235,0.06)', border: '1px solid rgba(37, 99, 235,0.12)', borderRadius: 8, padding: 14, fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
                Changes take effect immediately on all your active listings.
              </div>
            </div>
          )}

          {tab !== 'notifications' && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" size="lg" onClick={handleSave} loading={saving}>
                💾 Save Settings
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
