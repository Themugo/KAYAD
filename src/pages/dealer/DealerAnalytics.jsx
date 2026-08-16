import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { timeAgo, compactNumber } from '../../utils/helpers';

const BAR_COLORS = ['var(--gold)', 'var(--gold-muted)', 'var(--blue)', 'var(--green)', 'var(--orange)'];

function MiniBar({ value, max, color = 'var(--gold)', label, sub }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sub}</span>
      </div>
      <div style={{ height: 6, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function DealerAnalytics() {
  const { toast } = useToast();
  const [summary, setSummary]   = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState('30');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dealerAPI.summary(),
      dealerAPI.earnings({ days: period }),
      dealerAPI.analytics({ days: period }),
    ]).then(([s, e, a]) => {
      setSummary(s.summary || s.data || s);
      setEarnings(e.earnings || e.data || e);
      setAnalytics(a.analytics || a.data || a);
    }).catch(() => toast('Failed to load analytics', 'error'))
    .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  const topCars = analytics?.topCars || analytics?.cars || [];
  const maxViews = Math.max(...topCars.map(c => c.views || 0), 1);
  const maxBids  = Math.max(...topCars.map(c => c.bidsCount || 0), 1);

  const monthlyEarnings = earnings?.monthly || earnings?.byMonth || [];
  const maxMonthly = Math.max(...monthlyEarnings.map(m => m.amount || m.total || 0), 1);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="section-eyebrow">Dealer Hub</div>
            <h2>Analytics & Earnings</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { val: '7',   label: '7 Days' },
              { val: '30',  label: '30 Days' },
              { val: '90',  label: '3 Months' },
              { val: '365', label: '1 Year' },
            ].map(p => (
              <button key={p.val}
                className={`btn btn-sm ${period === p.val ? 'btn-gold' : 'btn-outline'}`}
                onClick={() => setPeriod(p.val)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Top KPIs ─── */}
        <div className="grid-4" style={{ marginBottom: 28 }}>
          {[
            { label: 'Total Listings',    val: summary?.totalCars || 0,                    icon: '🚗', color: 'var(--text)' },
            { label: 'Total Views',       val: compactNumber(analytics?.totalViews || 0),  icon: '👁', color: 'var(--blue)' },
            { label: 'Total Bids',        val: analytics?.totalBids || 0,                  icon: '⚡', color: 'var(--gold-light)' },
            { label: `Revenue (${period}d)`, val: formatKES(earnings?.total || 0),         icon: '💰', color: 'var(--green)' },
          ].map(s => (
            <div key={s.label} className="stat-box">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ color: s.color }}>{s.val}</div>
                </div>
                <span style={{ fontSize: 26 }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>

          {/* ─── Monthly Revenue Chart ─── */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>📈 Revenue Over Time</h3>
            {monthlyEarnings.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                <p style={{ fontSize: 13 }}>No earnings data yet</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, marginBottom: 10 }}>
                  {monthlyEarnings.slice(-12).map((m, i) => {
                    const val = m.amount || m.total || 0;
                    const pct = maxMonthly > 0 ? (val / maxMonthly) * 100 : 0;
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>{formatKES(val).replace('KES ', '')}</div>
                        <div style={{
                          width: '100%', borderRadius: '3px 3px 0 0',
                          height: `${Math.max(4, pct)}%`,
                          background: i === monthlyEarnings.slice(-12).length - 1
                            ? 'var(--gold)' : 'var(--gold-muted)',
                          minHeight: 4, transition: 'height 0.4s ease',
                          cursor: 'default',
                        }} title={`${m.month || m.label || ''}: ${formatKES(val)}`} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)' }}>
                  {monthlyEarnings.slice(-12).filter((_, i) => i % 3 === 0).map((m, i) => (
                    <span key={i}>{m.month || m.label || `M${i + 1}`}</span>
                  ))}
                </div>
                <div className="gold-line" style={{ margin: '16px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total period</span>
                  <span className="price-tag" style={{ fontSize: '1rem' }}>{formatKES(earnings?.total || 0)}</span>
                </div>
              </>
            )}
          </div>

          {/* ─── Listing Status Breakdown ─── */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>🗂 Listing Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Active Listings',  val: summary?.activeCars    || 0, color: 'var(--green)' },
                { label: 'Live Auctions',    val: summary?.liveAuctions  || 0, color: 'var(--red)' },
                { label: 'Sold',             val: summary?.soldCars      || 0, color: 'var(--gold)' },
                { label: 'Pending Bids',     val: summary?.pendingBids   || 0, color: 'var(--blue)' },
                { label: 'Draft',            val: summary?.draftCars     || 0, color: 'var(--text-muted)' },
              ].map((s, i) => {
                const total = summary?.totalCars || 1;
                return <MiniBar key={s.label} label={s.label} sub={s.val} value={s.val} max={total} color={BAR_COLORS[i]} />;
              })}
            </div>

            {/* Conversion rate */}
            {summary?.totalCars > 0 && (
              <div style={{ marginTop: 20, background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sell-Through Rate</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--gold-light)', marginTop: 4 }}>
                  {Math.round(((summary?.soldCars || 0) / summary.totalCars) * 100)}%
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>

          {/* ─── Top Performing Cars ─── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1rem' }}>🔥 Top Listings</h3>
              <Link to="/dealer" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>View All →</Link>
            </div>
            {topCars.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <div className="empty-icon">🚗</div>
                <h3>No listing data</h3>
                <Link to="/dealer/add-car" className="btn btn-gold btn-sm" style={{ marginTop: 12 }}>Add First Car</Link>
              </div>
            ) : topCars.slice(0, 5).map((car, i) => (
              <div key={car._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: i === 0 ? 'var(--gold)' : 'var(--surface)',
                  border: `1px solid ${i === 0 ? 'var(--gold)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                  color: i === 0 ? '#0A1628' : 'var(--text-muted)',
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/cars/${car._id}`} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                    {car.title}
                  </Link>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    👁 {car.views || 0} · ⚡ {car.bidsCount || 0} bids · ❤️ {car.favoritesCount || 0}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="price-tag" style={{ fontSize: '0.85rem' }}>{formatKES(car.currentBid || car.price)}</div>
                  <span className={`badge ${car.auctionStatus === 'live' ? 'badge-green' : car.status === 'sold' ? 'badge-gold' : 'badge-muted'}`} style={{ marginTop: 3, fontSize: 9 }}>
                    {car.auctionStatus === 'live' ? '🔴 LIVE' : car.status || 'Active'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Quick Tips ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: 16 }}>💡 Boost Your Listings</h3>
              {[
                { icon: '📷', tip: 'Add 6+ high-quality photos. Listings with more images get 3× more views.' },
                { icon: '⚡', tip: 'Enable live auctions. They generate 5× more bids than fixed-price.' },
                { icon: '✅', tip: 'Keep your dealer profile complete and verified for trust badge.' },
                { icon: '📍', tip: 'Specify exact city location to appear in local searches.' },
              ].map(t => (
                <div key={t.icon} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.tip}</p>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: 14 }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link to="/dealer/add-car"  className="btn btn-gold btn-sm" style={{ justifyContent: 'center' }}>+ New Listing</Link>
                <Link to="/dealer"          className="btn btn-outline btn-sm" style={{ justifyContent: 'center' }}>Dashboard</Link>
                <Link to="/admin/auctions"  className="btn btn-outline btn-sm" style={{ justifyContent: 'center' }}>Auction Control</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
