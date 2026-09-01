import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, Wifi, WifiOff, Settings, Users, Car, Shield, DollarSign, Megaphone } from 'lucide-react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

const SECTIONS = [
  { key: 'users', label: 'Users', desc: 'Manage all accounts', icon: Users, path: '/admin/users' },
  { key: 'cars', label: 'Listings', desc: 'Vehicle listings', icon: Car, path: '/admin/cars' },
  { key: 'staff', label: 'Staff Team', desc: 'Department accounts', icon: Shield, path: '/admin/users' },
  { key: 'settings', label: 'Platform Config', desc: 'System settings', icon: Settings, path: '/admin/settings' },
  { key: 'panic', label: 'Security Log', desc: 'Security & emergency controls', icon: AlertTriangle, path: '/admin/security', danger: true },
];

const CS = {
  pageBg: { background: '#F8FAFC', minHeight: '100vh' },
  pageContainer: { maxWidth: 1000, margin: '0 auto', padding: '32px 32px 60px' },
  headerRow: { marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  h1Title: { fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: '#0F172A', marginBottom: 4, fontStyle: 'italic' },
  subtitle: { color: 'rgba(15, 23, 42, 0.35)', fontSize: 14 },
  refreshRight: { textAlign: 'right' },
  refreshBtn: { padding: '8px 16px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.05)', border: '1px solid rgba(15, 23, 42, 0.1)', color: 'rgba(15, 23, 42, 0.6)', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  updateTime: { fontSize: 10, color: 'rgba(15, 23, 42, 0.25)', marginTop: 4 },
  lastChecked: { fontSize: 11, color: 'rgba(15, 23, 42, 0.35)', marginTop: 2 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 },
  statCard: { padding: '10px 12px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.02)', border: '1px solid rgba(15, 23, 42, 0.05)' },
  statLabel: { fontSize: 10, color: 'rgba(15, 23, 42, 0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 },
  quickNavGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 },
  noUnderline: { textDecoration: 'none' },
  navDesc: { fontSize: 11, color: 'rgba(15, 23, 42, 0.4)', marginTop: 2 },
  loadingContainer: { padding: 24 },
  btnRow: { display: 'flex', gap: 10 },
  dangerBtn: { padding: '10px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  normalBtn: { padding: '10px 20px', background: 'rgba(15, 23, 42, 0.05)', border: '1px solid rgba(15, 23, 42, 0.1)', borderRadius: 10, color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  warningBox: { marginTop: 12, padding: '10px 14px', background: 'rgba(251,191,36,0.06)', borderRadius: 8, fontSize: 12, color: 'rgba(15, 23, 42, 0.5)' },
  noData: { color: 'rgba(15, 23, 42, 0.4)', fontSize: 13, padding: 12 },
  staffDesc: { fontSize: 13, lineHeight: 1.8, color: 'rgba(15, 23, 42, 0.6)' },
  staffGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  goldCard: { padding: 14, borderRadius: 10, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.1)' },
  goldTitle: { fontSize: 12, fontWeight: 700, color: 'var(--gold)', marginBottom: 6 },
  goldList: { margin: 0, paddingLeft: 16, fontSize: 12, color: 'rgba(15, 23, 42, 0.5)', lineHeight: 2 },
  blueCard: { padding: 14, borderRadius: 10, background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)' },
  blueTitle: { fontSize: 12, fontWeight: 700, color: '#3b82f6', marginBottom: 6 },
  blueList: { margin: 0, paddingLeft: 16, fontSize: 12, color: 'rgba(15, 23, 42, 0.5)', lineHeight: 2 },
  deptGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 },
  deptLink: { textDecoration: 'none' },
  deptCard: { padding: '10px 12px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.02)', border: '1px solid rgba(15, 23, 42, 0.05)', fontSize: 12, textAlign: 'center' },
};

const sectionCardStyles = {
  container: { background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.07)', borderRadius: 16, padding: 24, marginBottom: 20 },
  header: { fontSize: 11, color: 'rgba(15, 23, 42, 0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16, borderBottom: '1px solid rgba(15, 23, 42, 0.05)', paddingBottom: 12 },
};

const statRowStyles = {
  row: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(15, 23, 42, 0.03)', fontSize: 13 },
  label: { color: 'rgba(15, 23, 42, 0.45)' },
};

const getHealthBannerStyle = (status) => ({
  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', borderRadius: 10,
  background: status === 'healthy' ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)',
  border: `1px solid ${status === 'healthy' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}`,
});

const getNavCardStyle = (danger) => ({
  padding: '14px 16px', borderRadius: 10,
  border: `1px solid ${danger ? 'rgba(239,68,68,0.2)' : 'rgba(15, 23, 42, 0.06)'}`,
  background: danger ? 'rgba(239,68,68,0.04)' : 'rgba(15, 23, 42, 0.02)',
  transition: 'border-color 0.2s',
});

const getNavIconStyle = (danger) => ({ color: danger ? '#ef4444' : 'var(--gold)', marginBottom: 4 });
const getNavLabelStyle = (danger) => ({ fontWeight: 700, fontSize: 13, color: danger ? '#ef4444' : '#fff' });
const getStatValueStyle = (color) => ({ fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-display)', color });
const getHealthStatusColor = (status) => status === 'healthy' ? '#22c55e' : '#ef4444';
const getDeptIconStyle = (color) => ({ color, marginBottom: 2 });
const getDeptLabelStyle = (color) => ({ color, fontWeight: 600 });

const healthStatusBar = (status) => ({ fontWeight: 700, fontSize: 14, color: getHealthStatusColor(status), textTransform: 'uppercase' });
const healthIcon = (status) => ({ color: getHealthStatusColor(status) });
const accentStrong = { color: '#f59e0b' };
const staffStrong = { color: '#0F172A' };
const goldStrong = { color: 'var(--gold)' };
const blueStrong = { color: '#3b82f6' };
const staffPara = { marginBottom: 12 };

function SectionCard({ title, children, accent = 'var(--gold)' }) {
  return (
    <div style={sectionCardStyles.container}>
      <div style={sectionCardStyles.header}>
        <span style={{ color: accent, marginRight: 8 }}>◆</span> {title}
      </div>
      {children}
    </div>
  );
}

function StatRow({ label, value, color = '#fff' }) {
  return (
    <div style={statRowStyles.row}>
      <span style={statRowStyles.label}>{label}</span>
      <span style={{ color, fontWeight: 600, fontFamily: 'monospace' }}>{value ?? '—'}</span>
    </div>
  );
}

export default function ControlRoom() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);


  const [lastRefresh, setLastRefresh] = useState(null);

  const loadData = () => {
    Promise.all([
      adminAPI.systemHealth().catch(() => null),
    ]).then(([h]) => {
      setHealth(h?.health || h);
      setLastRefresh(new Date());
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 30000);
    return () => clearInterval(iv);
  }, []);


  return (
    <ErrorBoundary>
    <div style={CS.pageBg}>
      <div style={CS.pageContainer}>
        <div style={CS.headerRow}>
          <div>
            <h1 style={CS.h1Title}>Control Room</h1>
            <p style={CS.subtitle}>Platform status and system management</p>
          </div>
          <div style={CS.refreshRight}>
            <button onClick={loadData} style={CS.refreshBtn}>
              ↻ Refresh
            </button>
            {lastRefresh && <div style={CS.updateTime}>Updated {lastRefresh.toLocaleTimeString()}</div>}
          </div>
        </div>

        {/* System Health */}
        {health && (
          <SectionCard title="System Health" accent={health.status === 'healthy' ? '#22c55e' : '#ef4444'}>
            <div style={getHealthBannerStyle(health.status)}>
              {health.status === 'healthy' ? <Wifi size={20} style={healthIcon(health.status)} /> : <WifiOff size={20} style={healthIcon(health.status)} />}
              <div>
                <div style={healthStatusBar(health.status)}>
                  {health.status === 'healthy' ? 'All Systems Operational' : 'System Warning'}
                </div>
                <div style={CS.lastChecked}>
                  Last checked: {new Date(health.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
            <div style={CS.statsGrid}>
              {[
                { label: 'Total Users', value: health.users, color: '#3b82f6' },
                { label: 'Total Listings', value: health.listings, color: 'var(--gold)' },
                { label: 'Live Auctions', value: health.liveAuctions, color: '#f97316' },
                { label: 'Held Escrows', value: health.heldEscrows, color: '#22c55e' },
                { label: 'Pending Moderation', value: health.pendingModeration, color: '#8b5cf6' },
                { label: 'Critical Alerts (24h)', value: health.criticalAlerts24h, color: health.criticalAlerts24h > 0 ? '#ef4444' : 'rgba(15, 23, 42, 0.3)' },
              ].map(s => (
                <div key={s.label} style={CS.statCard}>
                  <div style={getStatValueStyle(s.color)}>{s.value}</div>
                  <div style={CS.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Quick Navigation */}
        <SectionCard title="Quick Navigation">
          <div style={CS.quickNavGrid}>
            {SECTIONS.map(s => (
              <Link key={s.key} to={s.path} style={CS.noUnderline}>
                <div style={getNavCardStyle(s.danger)}>
                  <s.icon size={16} style={getNavIconStyle(s.danger)} />
                  <div style={getNavLabelStyle(s.danger)}>{s.label}</div>
                  <div style={CS.navDesc}>{s.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        {/* Demo Data Management (superadmin only) */}

        {/* System Management Staff */}
        <SectionCard title="System Management Staff" accent="#3b82f6">
          <div style={CS.staffDesc}>
            <p style={staffPara}>
              The <strong style={staffStrong}>Control Room</strong> is the operations hub for <strong style={goldStrong}>Webhost</strong> (superadmin) and <strong style={blueStrong}>Admin</strong> roles.
            </p>
            <div style={CS.staffGrid}>
              <div style={CS.goldCard}>
                <div style={CS.goldTitle}>👑 Webhost / Superadmin</div>
                <ul style={CS.goldList}>
                  <li>Full system access &amp; configuration</li>
                  <li>Staff account management (CRUD)</li>
                  <li>Demo data lifecycle (seed / cleanup)</li>
                  <li>Kill-switch &amp; emergency controls</li>
                  <li>User hard-delete &amp; deactivation</li>
                </ul>
              </div>
              <div style={CS.blueCard}>
                <div style={CS.blueTitle}>⚙ Platform Admin</div>
                <ul style={CS.blueList}>
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
          <div style={CS.deptGrid}>
            {[
              { role: 'marketing', label: 'Marketing', icon: Megaphone, color: '#8b5cf6', path: '/admin/reports' },
              { role: 'technical_support', label: 'Tech Support', icon: Users, color: '#22c55e', path: '/admin/users' },
              { role: 'hr', label: 'HR', icon: Users, color: '#f97316', path: '/admin/sellers' },
              { role: 'accounts', label: 'Accounts', icon: DollarSign, color: '#06b6d4', path: '/admin/reports' },
              { role: 'escrow_officer', label: 'Escrow', icon: Shield, color: '#22c55e', path: '/admin/escrows' },
              { role: 'ad_manager', label: 'Ad Manager', icon: Megaphone, color: '#f97316', path: '/admin/reports' },
              { role: 'moderator', label: 'Moderator', icon: Shield, color: '#3b82f6', path: '/admin/cars' },
            ].map(d => (
              <Link key={d.role} to={d.path} style={CS.deptLink}>
                <div style={CS.deptCard}>
                  <d.icon size={14} style={getDeptIconStyle(d.color)} />
                  <div style={getDeptLabelStyle(d.color)}>{d.label}</div>
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
