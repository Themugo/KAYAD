import { StatCard } from './DashboardWidgets';

export default function DealerEarningsTab({ earnings }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', marginBottom: 20 }}>Earnings Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon="💰" label="Gross Revenue"  value={earnings?.gross    ? `${(earnings.gross/1e6).toFixed(1)}M`    : '—'} sub="KES" color="var(--gold)" />
        <StatCard icon="📈" label="Net Earnings"   value={earnings?.net      ? `${(earnings.net/1e6).toFixed(1)}M`      : '—'} sub="after commission" color="#22c55e" />
        <StatCard icon="📉" label="Commission Paid" value={earnings?.commission ? `${(earnings.commission/1e3).toFixed(0)}K` : '—'} sub="KES" color="#ef4444" />
      </div>
      {!earnings && (
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--card)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No earnings data yet — complete a sale to see your revenue.</div>
        </div>
      )}
    </div>
  );
}
