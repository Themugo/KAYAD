import { MiniBarChart, BreakdownBars } from '../../../components/AdminWidgets';

export default function AdminChartsRow({ stats }) {
  const s = stats || {};
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 16, marginBottom: 28 }} className="overview-row">
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Platform at a Glance</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Live totals across the marketplace</div>
        </div>
        <div style={{ padding: '24px 22px 18px' }}>
          <MiniBarChart
            data={[
              { label: 'Users',    value: Number(s.totalUsers) || 0,     color: '#3b82f6' },
              { label: 'Cars',     value: Number(s.totalCars) || 0,      color: 'var(--gold)' },
              { label: 'Auctions', value: Number(s.activeAuctions) || 0, color: '#f97316' },
              { label: 'Bids',     value: Number(s.totalBids) || 0,      color: '#06b6d4' },
              { label: 'Escrows',  value: Number(s.totalEscrows) || 0,   color: '#ef4444' },
            ]}
            height={160}
            format={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : `${v || 0}`)}
          />
        </div>
      </div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>User Composition</span>
        </div>
        <div style={{ padding: '20px 22px' }}>
          <BreakdownBars
            total={Number(s.totalUsers) || 0}
            data={[
              { name: 'Dealers',            count: Number(s.totalDealers) || 0,      color: 'var(--gold)' },
              { name: 'Individual Sellers', count: Number(s.individualSellers) || 0, color: '#3b82f6' },
              { name: 'Brokers',            count: Number(s.brokers) || 0,           color: '#a855f7' },
              { name: 'Buyers & Others',    count: Math.max((Number(s.totalUsers) || 0) - ((Number(s.totalDealers) || 0) + (Number(s.individualSellers) || 0) + (Number(s.brokers) || 0)), 0), color: '#22c55e' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
