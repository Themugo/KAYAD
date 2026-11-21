import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import * as dealerApi from '../../services/dealerPlatformApi';

export default function DealerSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('business');
  const [saving, setSaving] = useState(false);
  const [unsupportedTab, setUnsupportedTab] = useState(null);

  const [business, setBusiness] = useState({
    businessName: '',
    location: '',
    phone: '',
    bio: '',
  });




  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(null);
    dealerApi.getDealerProfile(user.id)
      .then(({ data }) => {
        const profile = data?.data || {};
        setBusiness({
          businessName: profile.businessName || '',
          location: profile.location || '',
          phone: profile.phone || '',
          bio: profile.bio || '',
        });
      })
      .catch(() => setLoadError('Could not load your dealer profile. Please try again.'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleSave = async () => {
    if (tab !== 'business') return;
    setSaving(true);
    try {
      await dealerApi.updateDealerProfile(user.id, business);
      toast('Business profile saved successfully', 'success');
    } catch {
      toast('Failed to save business profile', 'error');
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
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage the dealer profile fields currently backed by the production schema</p>
        </div>

        <div className="tabs" style={{ marginBottom: 24 }}>
          {[
            { key: 'business', label: '🏪 Business' },
            { key: 'payments', label: '💳 Payments', unavailable: true },
            { key: 'notifications', label: '🔔 Notifications', unavailable: true },
            { key: 'exposure', label: '👁 Exposure', unavailable: true },
          ].map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => { setTab(t.key); setUnsupportedTab(t.unavailable ? t.key : null); }}>
              {t.label}{t.unavailable ? ' — unavailable' : ''}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 28 }}>
          {unsupportedTab && (
            <div style={{ padding: 18, border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
              <strong style={{ color: 'var(--text)' }}>Not available yet</strong>
              <p style={{ margin: '8px 0 0', fontSize: 13 }}>
                This dealer setting has no authoritative database contract in the current migration chain, so KAYAD will not fabricate or persist it locally.
              </p>
            </div>
          )}
          {loadError && <div style={{ padding: 18, border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', marginBottom: 16 }}>{loadError}</div>}
          {tab === 'business' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: loading ? 0.6 : 1 }}>
              <h3 style={{ marginBottom: 4 }}>Business Profile</h3>
              <Field label="Business Name">
                <input disabled={loading} className="input" value={business.businessName}
                  onChange={e => setBusiness(p => ({ ...p, businessName: e.target.value }))} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Location / City">
                  <input disabled={loading} className="input" value={business.location}
                    onChange={e => setBusiness(p => ({ ...p, location: e.target.value }))} />
                </Field>
                <Field label="Phone Number">
                  <input disabled={loading} className="input" value={business.phone}
                    onChange={e => setBusiness(p => ({ ...p, phone: e.target.value }))} />
                </Field>
              </div>
              <Field label="About / Bio">
                <textarea disabled={loading} className="input" rows={3} value={business.bio}
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

          {loadError && <div style={{ padding: 18, border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', marginBottom: 16 }}>{loadError}</div>}
          {tab === 'business' && (
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
