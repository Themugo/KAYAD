import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, Wifi, WifiOff, Settings, Users, Car, Shield, DollarSign, Megaphone } from 'lucide-react';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const SECTIONS = [
  { key: 'users', label: 'Users', desc: 'Manage all accounts', icon: Users, path: '/admin/users' },
  { key: 'cars', label: 'Listings', desc: 'Vehicle listings', icon: Car, path: '/admin/cars' },
  { key: 'staff', label: 'Staff Team', desc: 'Department accounts', icon: Shield, path: '/admin/users' },
  { key: 'settings', label: 'Platform Config', desc: 'System settings', icon: Settings, path: '/admin/settings' },
  { key: 'panic', label: 'Security Log', desc: 'Security & emergency controls', icon: AlertTriangle, path: '/admin/security', danger: true },
];

function SectionCard({ title, children, accent = 'var(--gold)' }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.07)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: 'rgba(15, 23, 42, 0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16, borderBottom: '1px solid rgba(15, 23, 42, 0.05)', paddingBottom: 12 }}>
        <span style={{ color: accent, marginRight: 8 }}>◆</span> {title}
      </div>
      {children}
    </div>
  );
}

function StatRow({ label, value, color = '#fff' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(15, 23, 42, 0.03)', fontSize: 13 }}>
      <span style={{ color: 'rgba(15, 23, 42, 0.45)' }}>{label}</span>
      <span style={{ color, fontWeight: 600, fontFamily: 'monospace' }}>{value ?? '—'}</span>
    </div>
  );
}

export default function ControlRoom() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [demo, setDemo] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  const isSuperadmin = user?.role === 'superadmin';

  const [lastRefresh, setLastRefresh] = useState(null);

  const loadData = () => {
    Promise.all([
      adminAPI.demoStatus().catch(() => null),
      adminAPI.systemHealth().catch(() => null),
    ]).then(([d, h]) => {
      setDemo(d);
      setHealth(h?.health || h);
      setLastRefresh(new Date());
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 30000);
    return () => clearInterval(iv);
  }, []);

  const handleCleanup = async () => {
    if (!window.confirm('Delete ALL demo accounts, cars, bids, payments, and escrows? This cannot be undone.')) return;
    setCleaning(true);
    try {
      const result = await adminAPI.demoCleanup();
      toast(`🧹 Demo cleanup complete: ${result.deleted.users} users, ${result.deleted.cars} cars`, 'success');
      setDemo(null);
      adminAPI.demoStatus().then(setDemo).catch(() => {});
    } catch { toast('Cleanup failed', 'error'); }
    finally { setCleaning(false); }
  };

  return (
    <ErrorBoundary>
    <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 32px 60px' }}>
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: '#0F172A', marginBottom: 4, fontStyle: 'italic' }}>Control Room</h1>
            <p style={{ color: 'rgba(15, 23, 42, 0.35)', fontSize: 14 }}>Platform status and system management</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <button onClick={loadData} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.05)', border: '1px solid rgba(15, 23, 42, 0.1)', color: 'rgba(15, 23, 42, 0.6)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              ↻ Refresh
            </button>
            {lastRefresh && <div style={{ fontSize: 10, color: 'rgba(15, 23, 42, 0.25)', marginTop: 4 }}>Updated {lastRefresh.toLocaleTimeString()}</div>}
          </div>
        </div>

        {/* System Health */}
        {health && (
          <SectionCard title="System Health" accent={health.status === 'healthy' ? '#22c55e' : '#ef4444'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: health.status === 'healthy' ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)', border: `1px solid ${health.status === 'healthy' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}` }}>
              {health.status === 'healthy' ? <Wifi size={20} style={{ color: '#22c55e' }} /> : <WifiOff size={20} style={{ color: '#ef4444' }} />}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: health.status === 'healthy' ? '#22c55e' : '#ef4444', textTransform: 'uppercase' }}>
                  {health.status === 'healthy' ? 'All Systems Operational' : 'System Warning'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(15, 23, 42, 0.35)', marginTop: 2 }}>
                  Last checked: {new Date(health.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {[
                { label: 'Total Users', value: health.users, color: '#3b82f6' },
                { label: 'Total Listings', value: health.listings, color: 'var(--gold)' },
                { label: 'Live Auctions', value: health.liveAuctions, color: '#f97316' },
                { label: 'Held Escrows', value: health.heldEscrows, color: '#22c55e' },
                { label: 'Pending Moderation', value: health.pendingModeration, color: '#8b5cf6' },
                { label: 'Critical Alerts (24h)', value: health.criticalAlerts24h, color: health.criticalAlerts24h > 0 ? '#ef4444' : 'rgba(15, 23, 42, 0.3)' },
              ].map(s => (
                <div key={s.label} style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.02)', border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'rgba(15, 23, 42, 0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Quick Navigation */}
        <SectionCard title="Quick Navigation">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
            {SECTIONS.map(s => (
              <Link key={s.key} to={s.path} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '14px 16px', borderRadius: 10,
                  border: `1px solid ${s.danger ? 'rgba(239,68,68,0.2)' : 'rgba(15, 23, 42, 0.06)'}`,
                  background: s.danger ? 'rgba(239,68,68,0.04)' : 'rgba(15, 23, 42, 0.02)',
                  transition: 'border-color 0.2s',
                }}>
                  <s.icon size={16} style={{ color: s.danger ? '#ef4444' : 'var(--gold)', marginBottom: 4 }} />
                  <div style={{ fontWeight: 700, fontSize: 13, color: s.danger ? '#ef4444' : '#fff' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(15, 23, 42, 0.4)', marginTop: 2 }}>{s.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        {/* Demo Data Management (superadmin only) */}
        {isSuperadmin && (
          <SectionCard title="Demo Data Management" accent="#f59e0b">
            {loading ? (
              <div className="loading-center" style={{ padding: 24 }}><div className="spinner" /></div>
            ) : demo ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Active Demo Users', value: demo.status.activeDemoUsers, color: '#22c55e' },
                    { label: 'Deactivated Demo', value: demo.status.deactivatedDemoUsers, color: '#f97316' },
                    { label: 'Demo Cars', value: demo.status.demoCars, color: '#3b82f6' },
                    { label: 'Demo Bids', value: demo.status.demoBids, color: '#a855f7' },
                    { label: 'Demo Payments', value: demo.status.demoPayments, color: '#06b6d4' },
                    { label: 'Demo Escrows', value: demo.status.demoEscrows, color: '#22c55e' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(15, 23, 42, 0.02)', border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: 'rgba(15, 23, 42, 0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleCleanup} disabled={cleaning} style={{ padding: '10px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {cleaning ? 'Cleaning...' : '🧹 Delete All Demo Data'}
                  </button>
                  <button onClick={async () => { try { await adminAPI.reseed(); toast('✅ Database re-seeded', 'success'); adminAPI.demoStatus().then(setDemo).catch(() => {}); } catch { toast('Reseed failed', 'error'); } }} style={{ padding: '10px 20px', background: 'rgba(15, 23, 42, 0.05)', border: '1px solid rgba(15, 23, 42, 0.1)', borderRadius: 10, color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    🔄 Re-seed Database
                  </button>
                </div>
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(251,191,36,0.06)', borderRadius: 8, fontSize: 12, color: 'rgba(15, 23, 42, 0.5)' }}>
                  ⚠️ Deleting demo data removes all pre-seeded accounts and their associated data. This is permanent. Use <strong style={{ color: '#f59e0b' }}>Re-seed</strong> to restore demo data.
                </div>
              </>
            ) : (
              <div style={{ color: 'rgba(15, 23, 42, 0.4)', fontSize: 13, padding: 12 }}>Unable to load demo status</div>
            )}
          </SectionCard>
        )}

        {/* System Management Staff */}
        <SectionCard title="System Management Staff" accent="#3b82f6">
          <div style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(15, 23, 42, 0.6)' }}>
            <p style={{ marginBottom: 12 }}>
              The <strong style={{ color: '#0F172A' }}>Control Room</strong> is the operations hub for <strong style={{ color: 'var(--gold)' }}>Webhost</strong> (superadmin) and <strong style={{ color: '#3b82f6' }}>Admin</strong> roles.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ padding: 14, borderRadius: 10, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.1)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', marginBottom: 6 }}>👑 Webhost / Superadmin</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'rgba(15, 23, 42, 0.5)', lineHeight: 2 }}>
                  <li>Full system access &amp; configuration</li>
                  <li>Staff account management (CRUD)</li>
                  <li>Demo data lifecycle (seed / cleanup)</li>
                  <li>Kill-switch &amp; emergency controls</li>
                  <li>User hard-delete &amp; deactivation</li>
                </ul>
              </div>
              <div style={{ padding: 14, borderRadius: 10, background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', marginBottom: 6 }}>⚙ Platform Admin</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'rgba(15, 23, 42, 0.5)', lineHeight: 2 }}>
                  <li>User &amp; seller management</li>
                  <li>Escrow &amp; transaction oversight</li>
                  <li>Content moderation &amp; listings</li>
                  <li>Auction administration</li>
                  <li>Audit log review</li>
                </ul>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Staff Quick Links */}
        <SectionCard title="Staff Departments" accent="#8b5cf6">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {[
              { role: 'marketing', label: 'Marketing', icon: Megaphone, color: '#8b5cf6', path: '/admin/reports' },
              { role: 'technical_support', label: 'Tech Support', icon: Users, color: '#22c55e', path: '/admin/users' },
              { role: 'hr', label: 'HR', icon: Users, color: '#f97316', path: '/admin/sellers' },
              { role: 'accounts', label: 'Accounts', icon: DollarSign, color: '#06b6d4', path: '/admin/reports' },
              { role: 'escrow_officer', label: 'Escrow', icon: Shield, color: '#22c55e', path: '/admin/escrows' },
              { role: 'ad_manager', label: 'Ad Manager', icon: Megaphone, color: '#f97316', path: '/admin/reports' },
              { role: 'moderator', label: 'Moderator', icon: Shield, color: '#3b82f6', path: '/admin/cars' },
            ].map(d => (
              <Link key={d.role} to={d.path} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.02)', border: '1px solid rgba(15, 23, 42, 0.05)', fontSize: 12, textAlign: 'center' }}>
                  <d.icon size={14} style={{ color: d.color, marginBottom: 2 }} />
                  <div style={{ color: d.color, fontWeight: 600 }}>{d.label}</div>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
    </ErrorBoundary>
  );
}