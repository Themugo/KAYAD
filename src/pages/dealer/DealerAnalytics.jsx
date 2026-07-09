import { useState, useEffect } from 'react';
import { dealerAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { TrendingUp, BarChart3, Clock, DollarSign } from 'lucide-react';

const cardStyle = {
  background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 'var(--radius-lg)', overflow: 'hidden',
};
const cardHeader = {
  padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};

function MiniBar({ value, max, color = 'var(--gold)', label, sub }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{sub}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function DealerAnalytics() {
  const { toast } = useToast();
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dealerAPI.summary(),
      dealerAPI.analytics({ days: period }),
    ]).then(([s, a]) => {
      setSummary(s.summary || s.data || s);
      setAnalytics(a.analytics || a.data || a);
    }).catch(() => toast('Failed to load analytics', 'error'))
    .finally(() => setLoading(false));
  }, [period, toast]);

  if (loading) return <div className="page" style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>;

  const a = analytics || {};
  const _s = summary || {};
  const topCars = a.topCars || [];
  const maxViews = Math.max(...topCars.map(c => c.views || 0), 1);
  const priceComp = a.priceComparison || [];
  const timeToSell = a.timeToSell || [];
  const monthlyRev = a.monthlyRevenue || [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.8rem', color: '#fff', margin: '0 0 4px' }}>Analytics</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Performance insights for your inventory</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)} style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 12, outline: 'none' }}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { icon: '👁️', label: 'Total Views', value: (a.totalViews ?? 0).toLocaleString() },
          { icon: '🔨', label: 'Bids', value: String(a.totalBids ?? 0) },
          { icon: '💬', label: 'Inquiries', value: String(a.totalInquiries ?? 0) },
          { icon: '❤️', label: 'Favorites', value: String(a.totalFavorites ?? 0) },
          { icon: '📊', label: 'Conv. Rate', value: a.conversionRates?.viewsToBids ? `${a.conversionRates.viewsToBids}%` : '—' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{kpi.icon} {kpi.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Top cars */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={cardHeader}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#fff' }}><TrendingUp size={15} style={{ color: 'var(--gold)' }} /> Top Performing Listings</span>
        </div>
        <div style={{ padding: '16px 22px' }}>
          {topCars.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0' }}>No data yet</div>
          ) : topCars.map((c, _i) => (
            <MiniBar key={c._id} value={c.views || 0} max={maxViews} label={c.title || 'Untitled'} sub={`${c.views || 0} views · KES ${Number(c.price||0).toLocaleString()}`} />
          ))}
        </div>
      </div>

      {/* Price comparison */}
      {priceComp.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={cardHeader}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#fff' }}><DollarSign size={15} style={{ color: '#22c55e' }} /> Price Comparison</span>
          </div>
          <div style={{ padding: '16px 22px' }}>
            {priceComp.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < priceComp.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.brand} {p.model || ''}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>{p.count} listings</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>KES {p.dealerAvg?.toLocaleString() || '—'}</div>
                  {p.marketAvg && (
                    <div style={{ fontSize: 11, color: p.difference > 0 ? '#ef4444' : '#22c55e' }}>
                      {p.difference > 0 ? '▲' : '▼'} {Math.abs(p.difference)}% vs market avg KES {p.marketAvg.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time to sell */}
      {timeToSell.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={cardHeader}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#fff' }}><Clock size={15} style={{ color: '#3b82f6' }} /> Time to Sell by Brand</span>
          </div>
          <div style={{ padding: '16px 22px' }}>
            {timeToSell.map((t, i) => (
              <MiniBar key={i} value={t.avgDays} max={Math.max(...timeToSell.map(x => x.avgDays), 1)} label={t.brand} sub={`${t.avgDays}d avg · ${t.count} sold`} color="#3b82f6" />
            ))}
          </div>
        </div>
      )}

      {/* Monthly revenue */}
      {monthlyRev.length > 0 && (
        <div style={{ ...cardStyle }}>
          <div style={cardHeader}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#fff' }}><BarChart3 size={15} style={{ color: '#22c55e' }} /> Monthly Revenue</span>
          </div>
          <div style={{ padding: '16px 22px' }}>
            {monthlyRev.map((m, i) => {
              const maxRev = Math.max(...monthlyRev.map(x => x.total), 1);
              return (
                <MiniBar key={i} value={m.total} max={maxRev} label={`${m._id.month}/${m._id.year}`} sub={`KES ${(m.total || 0).toLocaleString()}`} color="#22c55e" />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
