import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { favoritesAPI, escrowAPI, paymentsAPI, carsAPI, chatAPI, savedSearchAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import BackButton from '../components/BackButton';
import GlassCard from '../components/dashboard/GlassCard';
import KPICard from '../components/dashboard/KPICard';
import StatRow from '../components/dashboard/StatRow';
import QuickActions from '../components/dashboard/QuickActions';
import { DollarSign, Shield, Gavel, Heart, Car, MessageCircle, TrendingUp, Clock, Eye } from 'lucide-react';
import CartyGrid from '../components/CartyGrid';

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
  const [watchlist, setWatchlist] = useState([]);
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

  useEffect(() => {
    carsAPI.list({ sort: 'views', limit: 6 })
      .then(data => setTrending(data.cars || []))
      .catch(() => setTrending([]))
      .finally(() => setTrendingLoading(false));
  }, []);

  useEffect(() => {
    const tryFetchBids = async () => {
      try {
        const res = await fetch('/api/bids/my', { credentials: 'include' });
        if (res.ok) { const data = await res.json(); setMyBids(data.bids || data || []); }
      } catch { }
    };
    tryFetchBids();
  }, []);

  if (isDealer || isAdmin) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const totalSpent = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const activeEscrows = escrows.filter(e => e.status === 'pending' || e.status === 'active').length;
  const wonAuctions = myBids.filter(b => b.status === 'won').length;
  const unreadChats = chats.filter(c => c.unreadCount > 0).length;
  const totalViews = favorites.reduce((sum, f) => sum + (f.views || 0), 0);

  const quickActions = [
    { id: '1', label: 'Browse Showroom', icon: Car, to: '/showroom', color: 'gold' },
    { id: '2', label: 'View Auctions', icon: Gavel, to: '/auctions', color: 'blue' },
    { id: '3', label: 'My Favorites', icon: Heart, to: '/favorites', color: 'gold' },
  ];

  return (
    <div className="page" style={{ background: '#0a0a0a', minHeight: '100vh' }}>
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
              background: connected ? '#22c55e' : '#ef4444',
              display: 'inline-block',
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
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
        ) : (
          <>
            <StatRow style={{ marginBottom: 36 }}>
              <KPICard title="Total Spent" value={`KES ${totalSpent.toLocaleString()}`} icon={DollarSign} trend={null} color="gold" />
              <KPICard title="Active Escrows" value={activeEscrows} icon={Shield} trend={null} color="green" />
              <KPICard title="Won Auctions" value={wonAuctions} icon={Gavel} trend={null} color="blue" />
              <KPICard title="Saved Vehicles" value={favorites.length} icon={Heart} trend={null} color="gold" />
            </StatRow>

            <div style={{ marginBottom: 36 }}>
              <h3 className="font-display font-bold text-white text-lg mb-4">Quick Actions</h3>
              <QuickActions actions={quickActions} />
            </div>

            <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <GlassCard>
                  <h3 className="font-display font-bold text-white text-lg mb-4">Trending Vehicles</h3>
                  {trendingLoading ? (
                    <div className="text-center py-8"><div className="spinner" /></div>
                  ) : trending.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {trending.slice(0, 4).map(car => (
                        <Link key={car._id} to={`/car/${car._id}`} className="block no-underline group">
                          <div className="flex gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                            <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
                              <img src={car.images?.[0] || car.coverImage} alt={car.title} className="w-full h-full object-cover" loading="lazy" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium text-xs truncate">{car.title}</p>
                              <p className="text-gold font-bold text-xs">KES {(car.price || 0).toLocaleString()}</p>
                              <p className="text-white/30 text-[10px] mt-1">
                                <Eye size={10} className="inline mr-1" />{car.views || 0} views
                              </p>
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

              <div className="lg:col-span-1 space-y-6">
                <GlassCard>
                  <h3 className="font-display font-bold text-white text-lg mb-4">At a Glance</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                      <span className="text-xs text-white/40 flex items-center gap-2"><MessageCircle size={12} /> Messages</span>
                      <span className="text-sm font-semibold text-white">{chats.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                      <span className="text-xs text-white/40 flex items-center gap-2"><Clock size={12} /> Saved Searches</span>
                      <span className="text-sm font-semibold text-white">{watchlist.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                      <span className="text-xs text-white/40 flex items-center gap-2"><Heart size={12} /> Favorites</span>
                      <span className="text-sm font-semibold text-white">{favorites.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-xs text-white/40 flex items-center gap-2"><TrendingUp size={12} /> Watched Cars</span>
                      <span className="text-sm font-semibold text-white">{watchlist.length}</span>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>

            {favorites.length > 0 && (
              <div style={{ marginTop: 36 }}>
                <div className="flex items-end justify-between mb-4">
                  <h3 className="font-display font-bold text-white text-xl">Your Favorites</h3>
                  <Link to="/favorites" className="text-gold text-sm font-bold no-underline">View All →</Link>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {favorites.slice(0, 4).map(car => (
                    <CartyGrid key={car._id} car={car} isMobile={false} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
