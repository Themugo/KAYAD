import { useState, useEffect } from 'react';
import api from '../../api/api';

export default function AdManager() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ads')
      .then(({ data }) => setAds(data.ads || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page" style={{ background: '#08090A' }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <div className="section-eyebrow">Admin</div>
            <h2 style={{ fontStyle: 'italic' }}>AD <span style={{ color: 'var(--gold)' }}>TRAFFIC CONTROL</span></h2>
          </div>
          <button style={{ background: 'var(--gold)', color: 'black', padding: '12px 24px', borderRadius: 100, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
            + New Campaign
          </button>
        </div>

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
                  <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 10, padding: '4px 8px', borderRadius: 4, fontWeight: 700 }}>
                    {ad.isActive ? 'ACTIVE' : 'PAUSED'}
                  </span>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {ad._id?.slice(-8)}</p>
                </div>
                <h4 style={{ fontWeight: 700, color: 'white' }}>{ad.clientName} — {ad.placement?.replace('_', ' ')}</h4>
                <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
