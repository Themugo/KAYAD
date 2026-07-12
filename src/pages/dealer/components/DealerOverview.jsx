// Enhanced overview tab — applies the dark-mockup design language
// (performance chart, quick actions, activity feed, inventory-by-type,
// top performers) on top of the existing live data. Pure presentation:
// it receives already-fetched data as props and adds no new API calls.

import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import {
  Plus, Gavel, BarChart3, Settings, Edit3, Trash2, Eye,
  TrendingUp, ChevronRight, Activity, Package, ArrowUpRight,
} from 'lucide-react';
import { StatCard, StatusBadge, DemoBadge, MiniBarChart, timeAgo } from './DashboardWidgets';
import DealerMarketInsights from '../../../components/DealerMarketInsights';
import { DealerKPIRow } from './DealerKPIWidgets';
import ConversionFunnelDashboard from './ConversionFunnelDashboard';

const cardStyle = {
  background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 'var(--radius-lg)', overflow: 'hidden',
};
const cardHeader = {
  padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const fmtK = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : `${v || 0}`);

export default function DealerOverview({ summary = {}, cars = [], totalRevenue = 0, trends = {}, onDelete, goToTab }) {
  const s = summary;

  // ── Derived analytics (all client-side from the cars already loaded) ──
  const monthly = useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-KE', { month: 'short' }), value: 0 });
    }
    const map = Object.fromEntries(buckets.map(b => [b.key, b]));
    cars.forEach(c => {
      const d = new Date(c.createdAt || Date.now());
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (map[key]) map[key].value += Number(c.price) || 0;
    });
    return buckets;
  }, [cars]);

  const inventoryTypes = useMemo(() => {
    const map = {};
    cars.forEach(c => { const t = c.bodyType || c.brand || 'Other'; map[t] = (map[t] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, count]) => ({ name, count, pct: cars.length ? Math.round((count / cars.length) * 100) : 0 }));
  }, [cars]);

  const topPerformers = useMemo(
    () => [...cars].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
    [cars]
  );

  const activity = useMemo(
    () => [...cars].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 6),
    [cars]
  );

  const recent = cars.slice(0, 5);
  const TYPE_COLORS = ['var(--gold)', '#3b82f6', '#22c55e', '#a855f7', '#f97316'];

  const quickActions = [
    { to: '/dealer/add-car', icon: Plus, label: 'New Listing', desc: 'List a vehicle', color: 'var(--gold)' },
    { to: '/dealer/auction-setup', icon: Gavel, label: 'Start Auction', desc: 'Set up bidding', color: '#f97316' },
    { to: '/dealer/analytics', icon: BarChart3, label: 'Analytics', desc: 'View reports', color: '#3b82f6' },
    { to: '/dealer/settings', icon: Settings, label: 'Settings', desc: 'Shop & payments', color: '#a855f7' },
  ];

  return (
    <>
      {/* ── KPI ROW ── */}
      <DealerKPIRow cars={cars} earnings={[]} escrows={[]} />

      {/* ── STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))', gap: 16, marginBottom: 20 }}>
        <StatCard icon="🚗" label="Listings"       value={s.totalCars || cars.length}        color="var(--gold)" trend={trends?.viewsToBids} />
        <StatCard icon="👁️" label="Total Views"    value={s.totalViews ?? 0}                  color="#3b82f6" trend={0} />
        <StatCard icon="🔨" label="Active Bids"     value={s.activeBids ?? 0}                  color="#f97316" to="/dealer" trend={2.5} />
        <StatCard icon="💰" label="Revenue"
          value={totalRevenue >= 1e6 ? `${(totalRevenue / 1e6).toFixed(1)}M` : totalRevenue ? `${Math.round(totalRevenue / 1000)}K` : '—'}
          sub="KES" color="#22c55e" trend={5.2} />
        <StatCard icon="💬" label="Inquiries"       value={s.totalInquiries || 0}              color="#8b5cf6" trend={trends?.viewsToInquiries} />
        <StatCard icon="❤️" label="Favorites"       value={s.totalFavorites || 0}              color="#ef4444" trend={trends?.viewsToFavorites} />
        <StatCard icon="📋" label="Draft Auctions"  value={s.draftAuctions ?? s.draftCount ?? 0} color="#6b7280" trend={0} />
        <StatCard icon="📊" label="Conversion"      value={s.conversionRate ? `${(s.conversionRate * 100).toFixed(1)}%` : '—'} color="#a855f7" trend={trends?.viewsToBids} />
      </div>

      {/* ── SokoAI Market Insights ── */}
      <DealerMarketInsights />

      {/* ── Conversion Funnel Dashboard ── */}
      <ConversionFunnelDashboard dealerId={summary?.dealer} />

      {/* ── ROW A: Performance chart + Quick actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16, marginBottom: 20 }} className="overview-row">
        {/* Performance chart */}
        <div style={cardStyle}>
          <div style={cardHeader}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Inventory Value Added</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Listing value by month · last 6 months</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--gold)', fontWeight: 700, background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.18)', borderRadius: 8, padding: '5px 10px' }}>
              <TrendingUp size={12} /> KES
            </span>
          </div>
          <div style={{ padding: '24px 22px 18px' }}>
            <MiniBarChart data={monthly} color="var(--gold)" height={170} format={(v) => `KES ${fmtK(v)}`} />
          </div>
        </div>

        {/* Quick actions */}
        <div style={cardStyle}>
          <div style={cardHeader}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Quick Actions</span>
          </div>
          <div style={{ padding: 14, display: 'grid', gap: 8 }}>
            {quickActions.map(a => (
              <Link key={a.to} to={a.to} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                textDecoration: 'none', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${a.color}40`; e.currentTarget.style.background = `${a.color}0d`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${a.color}16`, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <a.icon size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{a.desc}</div>
                </div>
                <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW B: Inventory by type + Top performers ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Inventory by type */}
        <div style={cardStyle}>
          <div style={cardHeader}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#fff' }}>
              <Package size={15} style={{ color: 'var(--gold)' }} /> Inventory by Type
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{cars.length} total</span>
          </div>
          <div style={{ padding: '18px 22px' }}>
            {inventoryTypes.length === 0 ? (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0' }}>No inventory yet</div>
            ) : inventoryTypes.map((t, i) => {
              const color = TYPE_COLORS[i % TYPE_COLORS.length];
              return (
                <div key={t.name} style={{ marginBottom: i === inventoryTypes.length - 1 ? 0 : 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>{t.name}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{t.count} · {t.pct}%</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 9999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ width: `${t.pct}%`, height: '100%', borderRadius: 9999, background: `linear-gradient(90deg, ${color}, ${color}aa)`, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top performers */}
        <div style={cardStyle}>
          <div style={cardHeader}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#fff' }}>
              <TrendingUp size={15} style={{ color: '#22c55e' }} /> Top Performing
            </span>
            <button onClick={() => goToTab?.('listings')} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>All →</button>
          </div>
          <div>
            {topPerformers.length === 0 ? (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '28px 0' }}>No listings to rank yet</div>
            ) : topPerformers.map((c, i) => (
              <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 22px', borderBottom: i === topPerformers.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ width: 20, fontSize: 13, fontWeight: 900, color: i === 0 ? 'var(--gold)' : 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-display)', fontStyle: 'italic', flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                    <Eye size={10} /> {c.views || 0} views
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic', flexShrink: 0 }}>KES {fmtK(Number(c.price) || 0)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW C: Recent listings + Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16 }} className="overview-row">
        {/* Recent listings (preserves edit/delete wiring) */}
        <div style={cardStyle}>
          <div style={cardHeader}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Recent Listings</span>
            <button onClick={() => goToTab?.('listings')} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View All →</button>
          </div>
          {recent.map(car => {
            const img = car.images?.[0]?.url || car.images?.[0] || car.image;
            return (
              <div key={car._id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {img ? <img src={img} alt={car.title} loading="lazy" decoding="async" style={{ width: 54, height: 40, objectFit: 'cover', borderRadius: 7, flexShrink: 0 }} />
                  : <div style={{ width: 54, height: 40, borderRadius: 7, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.title}</span>
                    {car.isDemo && <DemoBadge edited={!!car.demoEditedAt} />}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{car.views || 0} views · {car.year}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>KES {Number(car.price || 0).toLocaleString()}</div>
                </div>
                <StatusBadge status={car.status || (car.auctionStatus === 'live' ? 'active' : 'draft')} />
                <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
                  <Link to={`/dealer/edit/${car._id}`} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                    <Edit3 size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </Link>
                  <button onClick={() => onDelete?.(car._id)} aria-label="Delete listing" style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={12} style={{ color: 'rgba(239,68,68,0.6)' }} />
                  </button>
                </div>
              </div>
            );
          })}
          {cars.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🚗</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>No listings yet</div>
              <Link to="/dealer/add-car" style={{ padding: '10px 24px', background: 'var(--gold)', color: '#000', borderRadius: 9999, fontSize: 12, fontWeight: 900, textDecoration: 'none' }}>Add Your First Car</Link>
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div style={cardStyle}>
          <div style={cardHeader}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#fff' }}>
              <Activity size={15} style={{ color: '#3b82f6' }} /> Recent Activity
            </span>
          </div>
          <div style={{ padding: '8px 22px 18px' }}>
            {activity.length === 0 ? (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0' }}>No activity yet</div>
            ) : activity.map((c, i) => (
              <div key={c._id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i === activity.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', marginTop: 5 }} />
                  {i < activity.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.08)', marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                    Listed <span style={{ color: '#fff', fontWeight: 600 }}>{c.title}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{timeAgo(c.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
