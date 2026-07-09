import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { dealerAPI } from '../../api/api';
import usePageMeta from '../../hooks/usePageMeta';

export default function DealerSetup() {
  usePageMeta('Dealer Setup', 'Configure your dealer account on Kayad.');
    const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    phone: '',
    location: '',
    escrowMandatory: false,
    chatEnabled: true,
    showPhone: true,
    showEmail: true,
    showLocation: true,
  });

  useEffect(() => {
    let ignore = false;
    dealerAPI.getProfile().then(d => {
      if (ignore) return;
      const p = d.dealer || d.data || d;
      if (p) {
        setForm({
          businessName: p.businessName || '',
          phone: p.phone || '',
          location: p.location || '',
          escrowMandatory: p.escrowMandatory || false,
          chatEnabled: p.chatEnabled !== false,
          showPhone: p.visibility?.showPhone !== false,
          showEmail: p.visibility?.showEmail !== false,
          showLocation: p.visibility?.showLocation !== false,
        });
      }
    }).catch(() => {}).finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await dealerAPI.updateProfile({
        ...form,
        visibility: {
          showPhone: form.showPhone,
          showEmail: form.showEmail,
          showLocation: form.showLocation,
        },
      });
      toast('Settings saved!', 'success');
      navigate('/dealer');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 100, paddingBottom: 60, maxWidth: 640 }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '1.6rem' }}>Dealer Setup</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>Configure your dealer account settings.</p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">Business Name</label>
              <input className="input" value={form.businessName} onChange={e => setForm(p => ({ ...p, businessName: e.target.value }))} placeholder="Your dealership name" />
            </div>

            <div className="input-group">
              <label className="input-label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+254 7XX XXX XXX" />
            </div>

            <div className="input-group">
              <label className="input-label">Location</label>
              <input className="input" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Nairobi, Kenya" />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Preferences</div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.escrowMandatory} onChange={e => setForm(p => ({ ...p, escrowMandatory: e.target.checked }))} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Require escrow for all transactions</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.chatEnabled} onChange={e => setForm(p => ({ ...p, chatEnabled: e.target.checked }))} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enable chat with buyers</span>
              </label>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Profile Visibility</div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.showPhone} onChange={e => setForm(p => ({ ...p, showPhone: e.target.checked }))} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Show phone number</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.showEmail} onChange={e => setForm(p => ({ ...p, showEmail: e.target.checked }))} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Show email address</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.showLocation} onChange={e => setForm(p => ({ ...p, showLocation: e.target.checked }))} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Show location</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => navigate('/dealer')} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-gold" style={{ flex: 1 }}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
