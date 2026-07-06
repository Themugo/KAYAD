import '../styles/dashboard.css';
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
        const res = await fetch('/api/bids/my', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setMyBids(data.bids || data || []);
        }
      } catch (error) {
        console.warn('Unable to load bids', error);
      }
    };
    tryFetchBids();
  }, []);

  if (isDealer || isAdmin) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const totalSpent = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const activeEscrows = escrows.filter(e => e.status === 'pending' || e.status === 'active').length;
  const wonAuctions = myBids.filter(b => b.status === 'won').length;

  const quickActions = [
    { id: '1', label: 'Browse Showroom', icon: Car, to: '/showroom', color: 'gold' },
    { id: '2', label: 'View Auctions', icon: Gavel, to: '/auctions', color: 'blue' },
    { id: '3', label: 'My Favorites', icon: Heart, to: '/favorites', color: 'gold' },
  ];

  return (
    <div className="page dashboard-page">
      <div className="dash-header">
        <div className="dash-header-inner">
          <BackButton fallback="/" className="dash-back-btn" />
          <div className="dash-badge-row">
            <span className="dash-badge">Buyer Dashboard</span>
            <span className="dash-status-dot" style={{ background: connected ? '#22c55e' : '#ef4444' }} />
            <span className="dash-status-text" style={{ color: connected ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)' }}>
              {connected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <h1 className="dash-greeting">
            {greeting}, <span className="dash-greeting-name">{user?.name?.split(' ')[0] || 'Buyer'}</span>
          </h1>
          <p className="dash-subtitle">
            Browse, bid, and buy with escrow protection
          </p>
        </div>
      </div>

      <div className="dash-body">
        {loading ? (
          <div className="dash-loading-center"><div className="spinner" /></div>
        ) : (
          <>
            <StatRow className="dash-kpi-row">
              <KPICard title="Total Spent" value={`KES ${totalSpent.toLocaleString()}`} icon={DollarSign} trend={null} color="gold" description="Lifetime purchases" />
              <KPICard title="Active Escrows" value={activeEscrows} icon={Shield} trend={null} color="green" description="Protected transactions" />
              <KPICard title="Won Auctions" value={wonAuctions} icon={Gavel} trend={null} color="blue" description="Successful bids" />
              <KPICard title="Saved Vehicles" value={favorites.length} icon={Heart} trend={null} color="gold" description="Watchlist & favorites" />
            </StatRow>

            <div className="dash-actions-section">
              <div className="dash-section-title">
                <div className="dash-section-accent" />
                <h3 className="dash-actions-title">Quick Actions</h3>
              </div>
              <QuickActions actions={quickActions} />
            </div>

            <div className="dash-grid-2">
              <div className="dash-col-left">
                <GlassCard>
                  <div className="trending-card flex-row">
                    <TrendingUp size={18} className="icon-gold" />
                    <h3 className="card-heading">
                      Trending Vehicles
                    </h3>
                  </div>
                  {trendingLoading ? (
                    <div className="spinner-wrapper"><div className="spinner" /></div>
                  ) : trending.length > 0 ? (
                    <div className="trending-grid">
                      {trending.slice(0, 4).map(car => (
                        <Link key={car._id} to={`/car/${car._id}`} className="link-unstyled">
                          <div className="trending-item">
                            <div className="trending-thumb">
                              <img src={car.images?.[0] || car.coverImage} alt={car.title} loading="lazy" />
                            </div>
                            <div className="trending-info">
                              <p className="trending-title">{car.title}</p>
                              <p className="trending-price">KES {(car.price || 0).toLocaleString()}</p>
                              <p className="trending-views"><Eye size={10} /> {car.views || 0} views</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="trending-empty">No trending vehicles</p>
                  )}
                </GlassCard>
              </div>

              <div className="dash-col-right">
                <GlassCard>
                  <div className="glance-card flex-row">
                    <Clock size={18} className="icon-gold" />
                    <h3 className="card-heading">
                      At a Glance
                    </h3>
                  </div>
                  <div className="glance-list">
                    {[
                      { icon: MessageCircle, label: 'Messages', value: chats.length, color: '#3B82F6' },
                      { icon: Clock, label: 'Saved Searches', value: watchlist.length, color: '#F59E0B' },
                      { icon: Heart, label: 'Favorites', value: favorites.length, color: '#EF4444' },
                      { icon: TrendingUp, label: 'Watched Cars', value: watchlist.length, color: '#22C55E' },
                    ].map((item, i) => (
                      <div key={i} className={`glance-item${i < 3 ? ' glance-item-bordered' : ''}`}>
                        <span className="glance-label">
                          <item.icon size={14} style={{ color: item.color }} /> {item.label}
                        </span>
                        <span className="glance-value">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </div>

            {favorites.length > 0 && (
              <div className="favorites-section">
                <div className="favorites-header">
                  <h3 className="font-display font-bold text-white text-xl">Your Favorites</h3>
                  <Link to="/favorites" className="text-gold text-sm font-bold no-underline">View All →</Link>
                </div>
                <div className="favorites-grid">
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
