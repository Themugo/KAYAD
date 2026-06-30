import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { favoritesAPI, escrowAPI, paymentsAPI, carsAPI, chatAPI, savedSearchAPI, bidsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import BackButton from '../components/BackButton';
import GlassCard from '../components/dashboard/GlassCard';
import KPICard from '../components/dashboard/KPICard';
import StatRow from '../components/dashboard/StatRow';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import QuickActions from '../components/dashboard/QuickActions';
import { DollarSign, Shield, Gavel, Heart, Car, Clock, MessageCircle, TrendingUp } from 'lucide-react';
import CartyGrid from '../components/CartyGrid';

export default function BuyerDashboard() {
  const { user, isDealer, isAdmin, logout } = useAuth();
  const { connected } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [favorites,  setFavorites]  = useState([]);
  const [escrows,    setEscrows]    = useState([]);
  const [payments,   setPayments]   = useState([]);
  const [myBids,     setMyBids]     = useState([]);
  const [chats,      setChats]      = useState([]);
  const [watchlist,  setWatchlist]  = useState([]);
  const [trending,   setTrending]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [bidLoading, setBidLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [tab,        setTab]        = useState('overview');

  useEffect(() => {
    if (isDealer) { navigate('/dealer', { replace: true }); return; }
    if (isAdmin) { navigate('/admin', { replace: true }); return; }
  }, [isDealer, isAdmin, navigate]);

  useEffect(() => {
    let hadError = false;
    const withFallback = (p, fallback) => {
      return p.catch(() => { hadError = true; return fallback; });
    };
    Promise.all([
      withFallback(favoritesAPI.list(), { favorites: [] }),
      withFallback(escrowAPI.mine(), { escrows: [] }),
      withFallback(paymentsAPI.myPayments(), { payments: [] }),
      withFallback(chatAPI.inbox(), { chats: [] }),
      withFallback(savedSearchAPI.list(), { searches: [] }),
    ]).then(([fav, esc, pay, chatRes, searchRes]) => {
      setFavorites(fav.favorites || []);
      setEscrows(esc.escrows || []);
      setPayments(pay.payments || []);
      setChats(chatRes.chats || []);
      setWatchlist(searchRes.searches || []);
      if (hadError) toast('Some data failed to load', 'warning');
    }).finally(() => setLoading(false));
  }, []);

  // Fetch trending cars
  useEffect(() => {
    carsAPI.list({ sort: 'views', limit: 6 })
      .then(data => setTrending(data.cars || []))
      .catch(() => setTrending([]))
      .finally(() => setTrendingLoading(false));
  }, []);

  // Attempt to fetch user's bids — fall back gracefully if no endpoint exists
  useEffect(() => {
    const tryFetchBids = async () => {
      try {
        const res = await fetch('/api/bids/my', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setMyBids(data.bids || data || []);
        }
      } catch { /* fallback */ }
      setBidLoading(false);
    };
    tryFetchBids();
  }, []);

  if (isDealer || isAdmin) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Calculate KPIs
  const totalSpent = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const activeEscrows = escrows.filter(e => e.status === 'pending' || e.status === 'active').length;
  const wonAuctions = myBids.filter(b => b.status === 'won').length;

  // Activity feed data
  const activities = [
    { id: '1', icon: Heart, title: 'Added to favorites', description: 'Toyota Land Cruiser Prado', timestamp: '2h ago', color: 'gold' },
    { id: '2', icon: Gavel, title: 'Placed bid', description: 'Mazida CX-5 - KES 2,500,000', timestamp: '5h ago', color: 'blue' },
    { id: '3', icon: Shield, title: 'Escrow initiated', description: 'Subaru Forester - KES 3,100,000', timestamp: '1d ago', color: 'green' },
  ];

  // Quick actions
  const quickActions = [
    { id: '1', label: 'Browse Showroom', icon: Car, to: '/showroom', color: 'gold' },
    { id: '2', label: 'View Auctions', icon: Gavel, to: '/auctions', color: 'blue' },
    { id: '3', label: 'My Favorites', icon: Heart, to: '/favorites', color: 'gold' },
  ];

  return (
    <div className="page" style={{ background: '#0a0a0a', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '40px 0 36px',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
          <BackButton fallback="/" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, marginBottom: 12, padding: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              Buyer Dashboard
            </span>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: connected ? 'var(--green)' : 'var(--red)',
              display: 'inline-block',
              animation: connected ? 'pulse-dot 1.5s infinite' : 'none',
            }} />
            <span style={{ fontSize: 9, color: connected ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)', fontWeight: 600 }}>
              {connected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: '#fff', margin: 0 }}>
            {greeting}, <span style={{ color: 'var(--gold)' }}>{user?.name?.split(' ')[0] || 'Buyer'}</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 8 }}>
            Browse, bid, and buy with escrow protection
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '36px 28px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* KPI Row */}
            <StatRow style={{ marginBottom: 32 }}>
              <KPICard
                title="Total Spent"
                value={`KES ${totalSpent.toLocaleString()}`}
                icon={DollarSign}
                trend={12}
                color="gold"
              />
              <KPICard
                title="Active Escrows"
                value={activeEscrows}
                icon={Shield}
                trend={5}
                color="green"
              />
              <KPICard
                title="Won Auctions"
                value={wonAuctions}
                icon={Gavel}
                trend={8}
                color="blue"
              />
              <KPICard
                title="Saved Vehicles"
                value={favorites.length}
                icon={Heart}
                trend={15}
                color="gold"
              />
            </StatRow>

            {/* Quick Actions */}
            <div style={{ marginBottom: 32 }}>
              <h3 className="font-display font-bold text-white text-lg mb-4">Quick Actions</h3>
              <QuickActions actions={quickActions} />
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              {/* Activity Feed */}
              <div className="lg:col-span-2">
                <ActivityFeed activities={activities} />
              </div>

              {/* Watchlist */}
              <div className="lg:col-span-1">
                <GlassCard>
                  <h3 className="font-display font-bold text-white text-lg mb-4">Trending Vehicles</h3>
                  {trendingLoading ? (
                    <div className="text-center py-8">
                      <div className="spinner" />
                    </div>
                  ) : trending.length > 0 ? (
                    <div className="space-y-3">
                      {trending.slice(0, 4).map(car => (
                        <Link key={car._id} to={`/car/${car._id}`} className="block no-underline">
                          <div className="flex gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                            <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
                              <img src={car.images?.[0] || car.coverImage} alt={car.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium text-xs truncate">{car.title}</p>
                              <p className="text-gold font-bold text-xs">KES {(car.price || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm text-center py-8">No trending vehicles</p>
                  )}
                </GlassCard>
              </div>
            </div>

            {/* Favorites */}
            <div style={{ marginTop: 32 }}>
              <div className="flex items-end justify-between mb-4">
                <h3 className="font-display font-bold text-white text-xl">Your Favorites</h3>
                <Link to="/favorites" className="text-gold text-sm font-bold no-underline">View All →</Link>
              </div>
              {favorites.length > 0 ? (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {favorites.slice(0, 4).map(car => (
                    <CartyGrid key={car._id} car={car} isMobile={false} />
                  ))}
                </div>
              ) : (
                <GlassCard>
                  <div className="text-center py-12">
                    <Heart size={48} className="text-white/20 mx-auto mb-4" />
                    <h3 className="font-display font-bold text-white text-lg mb-2">No Favorites Yet</h3>
                    <p className="text-white/50 text-sm mb-6">Start saving vehicles you're interested in</p>
                    <Link to="/showroom" className="btn btn-gold">Browse Showroom</Link>
                  </div>
                </GlassCard>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
