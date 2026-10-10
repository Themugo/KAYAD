import { MiniBarChart, BreakdownBars } from '../../../components/features/admin/AdminWidgets';

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
              { label: 'Users',    value: Number(s.totalUsers) || 0,     color: '#176B87' },
              { label: 'Cars',     value: Number(s.totalCars) || 0,      color: 'var(--brand)' },
              { label: 'Auctions', value: Number(s.activeAuctions) || 0, color: '#176b87' },
              { label: 'Bids',     value: Number(s.totalBids) || 0,      color: '#13B8A6' },
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
              { name: 'Dealers',            count: Number(s.totalDealers) || 0,      color: 'var(--brand)' },
              { name: 'Individual Sellers', count: Number(s.individualSellers) || 0, color: '#176B87' },
              { name: 'Buyers & Others',    count: Math.max((Number(s.totalUsers) || 0) - ((Number(s.totalDealers) || 0) + (Number(s.individualSellers) || 0)), 0), color: '#22c55e' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
