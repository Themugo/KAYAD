import '../styles/dashboard.css';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { favoritesAPI, escrowAPI, paymentsAPI, carsAPI, chatAPI, bidsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { EnterpriseCard, EnterpriseKPI, EnterpriseTimeline, EnterpriseQuickActions, EnterpriseTable, EnterpriseMetricRow, DashboardHeader } from '../components/enterprise/EnterpriseDashboard';

export default function BuyerDashboard() {
  const { user, isDealer, isAdmin } = useAuth();
  const { connected } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [escrows, setEscrows] = useState([]);
  const [payments, setPayments] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [chats, setChats] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);

  useEffect(() => {
    if (isDealer) { navigate('/dealer', { replace: true }); return; }
    if (isAdmin) { navigate('/admin', { replace: true }); return; }
  }, [isDealer, isAdmin, navigate]);

  useEffect(() => {
    let hadError = false;
    const withFallback = (p, fallback) => p.catch(() => { hadError = true; return fallback; });
    Promise.all([
      withFallback(favoritesAPI.list(), { favorites: [] }),
      withFallback(escrowAPI.mine(), { escrows: [] }),
      withFallback(paymentsAPI.myPayments(), { payments: [] }),
      withFallback(chatAPI.inbox(), { chats: [] }),
    ]).then(([fav, esc, pay, chatRes]) => {
      setFavorites(fav.favorites || []);
      setEscrows(esc.escrows || []);
      setPayments(pay.payments || []);
      setChats(chatRes.chats || []);
      if (hadError) toast('Some data failed to load', 'warning');
    }).finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    carsAPI.list({ sort: 'views', limit: 6 })
      .then(data => setTrending(data.cars || []))
      .catch(() => setTrending([]))
      .finally(() => setTrendingLoading(false));
  }, []);

  useEffect(() => {
    const tryFetchBids = async () => {
      try {
        const data = await bidsAPI.myBids();
        if (data) setMyBids(data.bids || data.data || data || []);
      } catch {}
    };
    tryFetchBids();
  }, []);

  if (isDealer || isAdmin) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const totalSpent = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const activeEscrows = escrows.filter(e => e.status === 'pending' || e.status === 'active').length;
  const wonAuctions = myBids.filter(b => b.status === 'won').length;

  return (
    <div className="page dashboard-page">
      <DashboardHeader badge="Buyer Dashboard" greeting={greeting} name={user?.name?.split(' ')[0] || 'Buyer'}
        subtitle="Browse, bid, and buy with escrow protection"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
            <span style={{ fontSize: 9, color: connected ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)', fontWeight: 600 }}>{connected ? 'Connected' : 'Offline'}</span>
          </div>
        }
      />

      <div className="dash-body">
        {loading ? (
          <div className="dash-loading-center"><div className="spinner" /></div>
        ) : (
          <>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
              <EnterpriseKPI icon="💰" label="Total Spent" value={`KES ${totalSpent.toLocaleString()}`} accent="var(--gold)" />
              <EnterpriseKPI icon="🛡️" label="Active Escrows" value={activeEscrows} accent="#22c55e" />
              <EnterpriseKPI icon="⚡" label="Won Auctions" value={wonAuctions} accent="#3b82f6" />
              <EnterpriseKPI icon="❤️" label="Saved Vehicles" value={favorites.length} accent="var(--gold)" />
              <EnterpriseKPI icon="💬" label="Messages" value={chats.length} accent="#8b5cf6" />
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Quick Actions</div>
              <EnterpriseQuickActions actions={[
                { to: '/browse', icon: '🚗', label: 'Browse Showroom', desc: 'Explore all vehicles' },
                { to: '/auctions', icon: '⚡', label: 'Live Auctions', desc: 'Bid in real-time' },
                { to: '/favorites', icon: '❤️', label: 'My Favorites', desc: 'Saved vehicles' },
                { to: '/inspection', icon: '🔍', label: 'Book Inspection', desc: 'Pre-purchase vehicle check' },
              ]} />
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24, marginBottom: 28 }}>
              {/* Trending Vehicles */}
              <EnterpriseCard header="🔥 Trending Vehicles">
                {trendingLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>
                ) : trending.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {trending.slice(0, 4).map(car => (
                      <Link key={car._id} to={`/cars/${car._id}`} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', textDecoration: 'none', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(212,168,67,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}>
                        <div style={{ width: 80, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                          <img src={car.images?.[0] || car.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: 12, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.title}</div>
                          <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>KES {(car.price || 0).toLocaleString()}</div>
                          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>👁 {(car.views || 0).toLocaleString()} views</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No trending vehicles</div>
                )}
              </EnterpriseCard>

              {/* At a Glance */}
              <EnterpriseCard header="📊 At a Glance">
                <EnterpriseMetricRow items={[
                  { icon: '💬', value: chats.length, label: 'Messages' },
                  { icon: '🔍', value: 0, label: 'Saved Searches' },
                  { icon: '❤️', value: favorites.length, label: 'Favorites' },
                  { icon: '⚡', value: myBids.length, label: 'Active Bids' },
                ]} />
                <div style={{ marginTop: 20 }}>
                  <EnterpriseTimeline items={[
                    { title: `${wonAuctions} auction${wonAuctions !== 1 ? 's' : ''} won`, description: 'Congratulations on your successful bids!', color: '#22c55e' },
                    { title: `${activeEscrows} escrow${activeEscrows !== 1 ? 's' : ''} active`, description: 'Payments currently protected', color: '#3b82f6' },
                    { title: `${favorites.length} saved vehicle${favorites.length !== 1 ? 's' : ''}`, description: 'Ready to compare and buy', color: 'var(--gold)' },
                    { title: `${chats.length} active conversation${chats.length !== 1 ? 's' : ''}`, description: 'Chat with dealers and sellers', color: '#8b5cf6' },
                  ]} />
                </div>
              </EnterpriseCard>
            </div>

            {/* Favorites Section */}
            {favorites.length > 0 && (
              <EnterpriseCard header="❤️ Your Favorites" action={<Link to="/favorites" style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>View All →</Link>}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                  {favorites.slice(0, 4).map(car => (
                    <div key={car._id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ height: 120, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {car.images?.[0]?.url || car.image
                          ? <img src={car.images?.[0]?.url || car.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                          : <span style={{ fontSize: 32 }}>🚗</span>
                        }
                      </div>
                      <div style={{ padding: 14 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', marginBottom: 4 }}>{car.title || car.name || 'Vehicle'}</div>
                        <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontWeight: 700, fontSize: '0.95rem' }}>
                          KES {(car.price || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </EnterpriseCard>
            )}

            {favorites.length === 0 && !loading && (
              <EnterpriseCard header="❤️ Favorites">
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>❤️</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16 }}>Save vehicles to your favorites to track them here</div>
                  <Link to="/browse" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Browse Vehicles</Link>
                </div>
              </EnterpriseCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}
