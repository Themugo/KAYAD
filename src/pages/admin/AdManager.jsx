import { useState, useEffect } from 'react';
import { adsAPI } from '../../api/api';

const PLACEMENTS = [
  { value: 'navbar_banner', label: 'Navbar Banner' },
  { value: 'homepage_banner', label: 'Homepage Banner' },
  { value: 'auction_sidebar', label: 'Auction Sidebar' },
  { value: 'sneak_peek_top', label: 'Sneak Peek Top' },
  { value: 'bid_modal', label: 'Bid Modal' },
];

const emptyForm = () => ({
  clientName: '',
  imageUrl: '',
  targetLink: '',
  placement: 'navbar_banner',
  isActive: true,
});

export default function AdManager() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adsAPI.adminList()
      .then(({ ads: list }) => setAds(list || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = async () => {
    if (!form.clientName) return;
    setSaving(true);
    try {
      if (editing) {
        await adsAPI.update(editing, form);
      } else {
        await adsAPI.create(form);
      }
      setShowForm(false);
      setForm(emptyForm());
      setEditing(null);
      load();
    } catch (err) {
      console.error('Failed to save ad', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (ad) => {
    setForm({
      clientName: ad.clientName,
      imageUrl: ad.imageUrl || '',
      targetLink: ad.targetLink || '',
      placement: ad.placement,
      isActive: ad.isActive,
    });
    setEditing(ad._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this ad campaign?')) return;
    try {
      await adsAPI.remove(id);
      load();
    } catch (err) {
      console.error('Failed to delete ad', err);
    }
  };

  const handleToggleActive = async (ad) => {
    try {
      await adsAPI.update(ad._id, { isActive: !ad.isActive });
      load();
    } catch (err) {
      console.error('Failed to toggle ad', err);
    }
  };

  return (
    <div className="page" style={{ background: '#08090A' }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <div className="section-eyebrow">Admin</div>
            <h2 style={{ fontStyle: 'italic' }}>AD <span style={{ color: 'var(--gold)' }}>TRAFFIC CONTROL</span></h2>
          </div>
          <button onClick={() => { setShowForm(!showForm); setForm(emptyForm()); setEditing(null); }}
            style={{ background: 'var(--gold)', color: 'black', padding: '12px 24px', borderRadius: 100, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
            {showForm ? 'Cancel' : '+ New Campaign'}
          </button>
        </div>

        {showForm && (
          <div style={{ background: '#111', padding: 32, borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 40 }}>
            <h4 style={{ marginBottom: 24, color: 'var(--gold)' }}>{editing ? 'Edit Campaign' : 'New Campaign'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Client Name *</label>
                <input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Target Link</label>
                <input value={form.targetLink} onChange={e => setForm({ ...form, targetLink: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Image URL</label>
                <input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Placement</label>
                <select value={form.placement} onChange={e => setForm({ ...form, placement: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontSize: 13 }}>
                  {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                  Active
                </label>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving || !form.clientName}
              style={{ marginTop: 24, background: 'var(--gold)', color: 'black', padding: '12px 32px', borderRadius: 100, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', opacity: saving || !form.clientName ? 0.5 : 1 }}>
              {saving ? 'Saving...' : editing ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : ads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📢</div>
            <h3>No ad campaigns yet</h3>
            <p style={{ fontSize: 13, marginTop: 8 }}>Create your first campaign to start monetizing placements.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ads.map(ad => (
              <div key={ad._id} style={{ background: '#111', padding: 24, borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{
                      background: ad.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: ad.isActive ? '#10b981' : '#ef4444',
                      fontSize: 10, padding: '4px 8px', borderRadius: 4, fontWeight: 700,
                    }}>
                      {ad.isActive ? 'ACTIVE' : 'PAUSED'}
                    </span>
                    <span style={{ background: 'rgba(37, 99, 235,0.1)', color: 'var(--gold)', fontSize: 10, padding: '4px 8px', borderRadius: 4, fontWeight: 500 }}>
                      {PLACEMENTS.find(p => p.value === ad.placement)?.label || ad.placement}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => handleToggleActive(ad)}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {ad.isActive ? 'Pause' : 'Activate'}
                    </button>
                    <button onClick={() => handleEdit(ad)}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: 'var(--gold)', cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(ad._id)}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: 'var(--red)', cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
                <h4 style={{ fontWeight: 700, color: 'white' }}>{ad.clientName}</h4>
                {ad.targetLink && (
                  <p style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4, wordBreak: 'break-all' }}>{ad.targetLink}</p>
                )}
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: 'black', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Impressions</p>
                    <p style={{ fontSize: '1.125rem', fontFamily: 'monospace', color: 'white' }}>{ad.viewCount?.toLocaleString() || 0}</p>
                  </div>
                  <div style={{ background: 'black', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clicks</p>
                    <p style={{ fontSize: '1.125rem', fontFamily: 'monospace', color: 'var(--gold)' }}>{ad.clickCount?.toLocaleString() || 0}</p>
                  </div>
                </div>
                {ad.budgetRemaining > 0 && (
                  <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
                    Budget remaining: KES {ad.budgetRemaining.toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
