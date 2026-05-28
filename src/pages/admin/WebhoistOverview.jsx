import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/api';

export default function WebhoistOverview() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminAPI.stats().catch(() => ({})),
      adminAPI.getAuditLog({ limit: 20 }).catch(() => ({ entries: [] })),
    ]).then(([s, l]) => {
      setStats(s);
      setLogs(l.entries || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading-center" style={{ padding: 80 }}><div className="spinner" /></div>;
  }

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers ?? '—', color: '#3B82F6' },
    { label: 'Total Cars', value: stats?.totalCars ?? '—', color: '#10B981' },
    { label: 'Active Auctions', value: stats?.activeAuctions ?? '—', color: '#F59E0B' },
    { label: 'Pending Escrows', value: stats?.pendingEscrows ?? '—', color: '#EF4444' },
    { label: 'Staff Accounts', value: stats?.staffCount ?? '—', color: '#8B5CF6' },
    { label: 'Total Revenue', value: stats?.totalRevenue ? `KES ${Number(stats.totalRevenue).toLocaleString()}` : '—', color: 'var(--gold)' },
  ];

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 24, paddingBottom: 40, maxWidth: 1100 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>System Overview</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Platform-wide statistics &amp; activity — visible to superadmin only
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
          {cards.map(c => (
            <div key={c.label} className="card" style={{ padding: '16px 20px', borderLeft: `3px solid ${c.color}` }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: c.color, marginTop: 6 }}>{c.value}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Recent Admin Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {logs.length === 0 ? (
              <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No recent activity</div>
            ) : logs.map(e => (
              <div key={e._id} className="card" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <code style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'monospace' }}>{e.action}</code>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.admin || e.adminId?.name || 'System'}</span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 'auto' }}>
                  {new Date(e.createdAt).toLocaleString('en-KE')}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <a href="/admin/security-log" className="btn btn-sm btn-outline" style={{ textDecoration: 'none' }}>
              View Full Security Log →
            </a>
          </div>
        </div>

        <div style={{ marginTop: 32, padding: '16px 20px', background: 'rgba(212,196,168,0.05)', borderRadius: 12, border: '1px solid rgba(212,196,168,0.15)' }}>
          <div style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600, marginBottom: 8 }}>Webhoist Access</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            You are logged in as the platform owner (<strong>webhoist</strong>). You have full system access: all admin panels,
            all security logs, all user data, and the ability to override any permission check.
          </p>
        </div>
      </div>
    </div>
  );
}
