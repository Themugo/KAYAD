import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, notifAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, Car, Gavel, Search, Megaphone, ShoppingCart, ClipboardCheck, TrendingUp,
} from 'lucide-react';

const QUICK_ACTIONS = [
  { id: 'add', icon: Plus, label: 'Add Vehicle', desc: 'List a new car for sale', to: '/dealer/add-car', color: 'var(--gold)', bg: 'rgba(212,196,168,0.12)' },
  { id: 'inventory', icon: Car, label: 'Manage Inventory', desc: 'View and edit listings', to: '/dealer/inventory', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { id: 'auction', icon: Gavel, label: 'Create Auction', desc: 'Start a live auction', to: '/dealer/auctions', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { id: 'inspection', icon: Search, label: 'Request Inspection', desc: 'Schedule pre-inspection', to: '/dealer/inspections', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  { id: 'promote', icon: Megaphone, label: 'Promote Listing', desc: 'Boost visibility', to: '/dealer/marketing', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'orders', icon: ShoppingCart, label: 'View Orders', desc: 'Track purchase orders', to: '/dealer/orders', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
];

function KPIBox({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: color || '#fff' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function DealerDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState(null);

  const canManageDemoCars = ['dealer', 'individual_seller'].includes(user?.role);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  useEffect(() => {
    let ignore = false;
    const carsPromise = canManageDemoCars
      ? Promise.all([
          dealerAPI.cars({ limit: 100 }).catch(() => ({ cars: [] })),
        ]).then(([ownedRes]) => {
          const owned = ownedRes.cars || ownedRes.data || [];
          return { cars: owned };
        })
      : dealerAPI.cars({ limit: 100 }).catch(() => ({ cars: [] }));
    Promise.all([
      dealerAPI.summary().catch(() => ({})),
      carsPromise,
      notifAPI.list({ limit: 1, unread: true }).catch(() => ({})),
      dealerAPI.analytics?.({ days: 30 }).catch(() => ({})),
      dealerAPI.milestones?.().catch(() => ({})),
    ]).then(([s, c, n, a, m]) => {
      if (ignore) return;
      setSummary(s.summary || s.data || s);
      setCars(c.cars || c.data || []);
      const mData = m?.milestones || m;
      const mStats = mData?.stats || m?.stats || {};
      if (mStats?.profileHealth) setHealthData(mStats.profileHealth);
    }).finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [canManageDemoCars]);

  const s = summary || {};
  const totalRevenue = s.totalRevenue || s.revenue || 0;
  const activeListings = cars.filter(c => c.status === 'active' || !c.status).length;
  const pendingApproval = cars.filter(c => c.status === 'pending').length;

  return (
    <div className="dealer-page">
      <div className="dealer-page-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Dealer Hub</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                Connected
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 className="dash-welcome">
                {greeting}, <span className="dash-welcome-name">{user?.businessName || user?.name || 'Dealer'}</span>
              </h1>
              {healthData && (() => {
                const score = healthData.score || 0;
                const tier = score >= 90 ? { label: 'Elite', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' }
                  : score >= 75 ? { label: 'Platinum', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' }
                  : score >= 50 ? { label: 'Gold', color: 'var(--gold)', bg: 'rgba(212,196,168,0.15)' }
                  : score >= 25 ? { label: 'Silver', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' }
                  : { label: 'Bronze', color: '#d97706', bg: 'rgba(217,119,6,0.15)' };
                return <span className="dash-status-pill" style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.color}40` }}>{tier.label} <span style={{ opacity: 0.6, fontWeight: 700 }}>{score}%</span></span>;
              })()}
            </div>
            <p className="dash-subtitle">{user?.location || 'Nairobi, Kenya'} · {dateStr} · {cars.length} listings</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/dealer/add-car"
              style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontSize: 12, fontWeight: 900, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <Plus size={14} /> New Listing
            </Link>
            <Link to="/dealer/auctions"
              style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.2)', color: 'var(--gold)', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Gavel size={13} /> Auction
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        ) : (
          <>
            <div className="dash-kpi-grid" style={{ marginTop: 28 }}>
              <KPIBox label="Active Listings" value={activeListings} sub="On marketplace" color="#22c55e" />
              <KPIBox label="Pending Approval" value={pendingApproval} sub="Awaiting review" color="#f97316" />
              <KPIBox label="Live Auctions" value={s.activeAuctions || 0} sub="Currently running" color="#ef4444" />
              <KPIBox label="Active Escrows" value={s.activeEscrows || 0} sub="In progress" color="#a855f7" />
              <KPIBox label="Leads Today" value={s.leadsToday || 0} sub="New inquiries" color="#3b82f6" />
              <KPIBox label="Revenue" value={`KES ${(totalRevenue >= 1e6 ? (totalRevenue / 1e6).toFixed(1) + 'M' : totalRevenue >= 1e3 ? Math.round(totalRevenue / 1e3) + 'K' : totalRevenue.toLocaleString())}`} sub="This month" color="var(--gold)" />
            </div>

            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontStyle: 'italic', fontSize: 16, color: '#fff', margin: '0 0 16px' }}>Quick Actions</h3>
            <div className="dash-actions-grid">
              {QUICK_ACTIONS.map(a => (
                <Link key={a.id} to={a.to} className="dash-action-card">
                  <div className="dash-action-icon" style={{ background: a.bg }}>
                    <a.icon size={18} style={{ color: a.color }} />
                  </div>
                  <div className="dash-action-info">
                    <div className="dash-action-label">{a.label}</div>
                    <div className="dash-action-desc">{a.desc}</div>
                  </div>
                  <TrendingUp size={14} style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
