import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, DollarSign, Eye, Heart, ShoppingCart, Clock, CheckCircle,
  TrendingUp, Star, Bell, Settings, Search, Calendar, ArrowUpRight,
  ArrowRight, ChevronRight, Truck, Shield, MessageSquare
} from 'lucide-react';
import { 
  EnterpriseCard, DashboardHeader, EnterpriseKPI, EnterpriseTimeline,
  EnterpriseQuickActions, EnterpriseChart, EnterpriseTable, EnterpriseStatus, 
  EnterpriseMetricRow, TabNavigation, SectionLabel, GridLayout, GridAuto, 
  EnterpriseEmptyState, EdsColors
} from '../../components/enterprise/EnterpriseDesignSystem';

export default function BuyerDashboardRedesigned() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [user, setUser] = useState({ name: 'Buyer' });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        activeBids: 3,
        wonAuctions: 2,
        totalSpent: 16500000,
        favorites: 12,
        totalViews: 845,
        searches: 45,
      });
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const formatKES = (num) => {
    if (num >= 1000000) return `KES ${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `KES ${(num / 1000).toFixed(0)}K`;
    return `KES ${num}`;
  };

  const recentActivity = [
    { id: 1, title: 'Outbid on Toyota Land Cruiser', description: 'Your bid of KES 11.2M was exceeded', time: '5m ago', color: EdsColors.red },
    { id: 2, title: 'New vehicle matches search', description: 'Mercedes GLE 2023 added to favorites', time: '1h ago', color: EdsColors.gold },
    { id: 3, title: 'Auction won: Honda Civic 2020', description: 'Final price: KES 2.2M', time: '2d ago', color: EdsColors.emerald },
    { id: 4, title: 'Inspection completed', description: 'Toyota Corolla — Score: 88/100', time: '3d ago', color: EdsColors.blue },
  ];

  const savedVehicles = [
    { id: 1, title: 'Toyota Land Cruiser V8 2023', price: 12500000, views: 2847, status: 'live', statusColor: EdsColors.emerald },
    { id: 2, title: 'Mercedes GLE 2023', price: 8400000, views: 1923, status: 'live', statusColor: EdsColors.emerald },
    { id: 3, title: 'BMW X5 M Sport', price: 7200000, views: 1654, status: 'auction_ended', statusColor: EdsColors.gold },
  ];

  const bidHistory = [
    { id: 1, vehicle: 'Toyota Land Cruiser V8', myBid: 11200000, currentBid: 11500000, status: 'outbid', time: '5m ago' },
    { id: 2, vehicle: 'Mercedes GLE 2023', myBid: 7800000, currentBid: 7800000, status: 'winning', time: '2h ago' },
    { id: 3, vehicle: 'Honda Civic 2020', myBid: 2200000, currentBid: 2200000, status: 'won', time: '2d ago' },
  ];

  const quickActions = [
    { id: 1, icon: <Search size={18} />, label: 'Browse Vehicles', description: 'Find your next car', to: '/cars' },
    { id: 2, icon: <Heart size={18} />, label: 'Saved Items', description: `${stats?.favorites || 0} vehicles`, to: '/favorites' },
    { id: 3, icon: <ShoppingCart size={18} />, label: 'Active Bids', description: `${stats?.activeBids || 0} auctions`, to: '/auctions' },
    { id: 4, icon: <Car size={18} />, label: 'My Purchases', description: 'View won auctions', to: '/purchases' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp size={14} /> },
    { id: 'bids', label: 'My Bids', icon: <DollarSign size={14} />, count: stats?.activeBids },
    { id: 'saved', label: 'Saved', icon: <Heart size={14} />, count: stats?.favorites },
  ];

  if (loading || !stats) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <DashboardHeader 
        badge="Buyer Hub"
        badgeColor={EdsColors.blue}
        greeting="Welcome back"
        name={user.name.split(' ')[0]}
        subtitle="Find and bid on your perfect vehicle"
        date={new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
        actions={
          <Link 
            to="/cars" 
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              background: EdsColors.blue,
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Search size={14} /> Browse Vehicles
          </Link>
        }
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px 28px' }}>
        {/* Tab Navigation */}
        <TabNavigation tabs={tabs} active={tab} onChange={setTab} />

        {tab === 'overview' && (
          <>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
              <EnterpriseKPI 
                icon={<ShoppingCart size={18} />}
                label="Active Bids" 
                value={stats.activeBids} 
                accent={EdsColors.orange}
              />
              <EnterpriseKPI 
                icon={<CheckCircle size={18} />}
                label="Won Auctions" 
                value={stats.wonAuctions} 
                accent={EdsColors.emerald}
              />
              <EnterpriseKPI 
                icon={<DollarSign size={18} />}
                label="Total Spent" 
                value={formatKES(stats.totalSpent)} 
                accent={EdsColors.gold}
              />
              <EnterpriseKPI 
                icon={<Heart size={18} />}
                label="Favorites" 
                value={stats.favorites} 
                accent={EdsColors.red}
              />
              <EnterpriseKPI 
                icon={<Eye size={18} />}
                label="Vehicles Viewed" 
                value={stats.totalViews} 
                accent={EdsColors.blue}
              />
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Quick Actions</SectionLabel>
              <EnterpriseQuickActions actions={quickActions} columns={4} density="compact" />
            </div>

            {/* Main Grid */}
            <GridLayout columns={2} gap={24} style={{ marginBottom: 24 }}>
              {/* Active Bids */}
              <EnterpriseCard 
                header="Active Bids" 
                icon={<ShoppingCart size={16} color={EdsColors.orange} />}
                action={{ label: 'View All', to: '/auctions' }}
                padding="md"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bidHistory.filter(b => b.status !== 'won').slice(0, 3).map(bid => (
                    <div 
                      key={bid.id}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background: EdsColors.surface,
                        border: `1px solid ${EdsColors.border}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: EdsColors.text }}>
                          {bid.vehicle}
                        </div>
                        <EnterpriseStatus 
                          label={bid.status === 'winning' ? 'Winning' : 'Outbid'} 
                          color={bid.status === 'winning' ? EdsColors.emerald : EdsColors.red} 
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <div>
                          <span style={{ color: EdsColors.textMuted }}>Your bid: </span>
                          <span style={{ color: EdsColors.gold, fontWeight: 600 }}>{formatKES(bid.myBid)}</span>
                        </div>
                        <div>
                          <span style={{ color: EdsColors.textMuted }}>Current: </span>
                          <span style={{ color: EdsColors.text }}>{formatKES(bid.currentBid)}</span>
                        </div>
                        <span style={{ color: EdsColors.textDim, fontSize: 11 }}>{bid.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </EnterpriseCard>

              {/* Recent Activity */}
              <EnterpriseCard 
                header="Recent Activity" 
                icon={<Clock size={16} color={EdsColors.gold} />}
                padding="md"
              >
                <EnterpriseTimeline items={recentActivity} maxItems={4} density="compact" />
              </EnterpriseCard>
            </GridLayout>

            {/* Saved Vehicles */}
            <SectionLabel action={<Link to="/favorites" style={{ color: EdsColors.gold, fontSize: 11, fontWeight: 600 }}>View All →</Link>}>
              Saved Vehicles
            </SectionLabel>
            <GridAuto minWidth={260}>
              {savedVehicles.map(vehicle => (
                <div 
                  key={vehicle.id}
                  style={{
                    background: EdsColors.card,
                    border: `1px solid ${EdsColors.border}`,
                    borderRadius: 16,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ 
                    height: 140, 
                    background: EdsColors.surface,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <Car size={40} color={EdsColors.textDim} />
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: `${EdsColors.red}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}>
                      <Heart size={16} color={EdsColors.red} fill={EdsColors.red} />
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: EdsColors.text, marginBottom: 6 }}>
                      {vehicle.title}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', color: EdsColors.gold, fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
                      {formatKES(vehicle.price)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: EdsColors.textMuted }}>
                        <Eye size={12} /> {vehicle.views.toLocaleString()}
                      </div>
                      <EnterpriseStatus label={vehicle.status === 'live' ? 'Live Auction' : 'Ended'} color={vehicle.statusColor} />
                    </div>
                  </div>
                </div>
              ))}
            </GridAuto>
          </>
        )}

        {tab === 'bids' && (
          <EnterpriseCard header="Bid History" padding="md">
            <EnterpriseTable
              columns={[
                { key: 'vehicle', label: 'Vehicle' },
                { key: 'myBid', label: 'Your Bid', align: 'right' },
                { key: 'currentBid', label: 'Current Bid', align: 'right' },
                { key: 'status', label: 'Status', align: 'center' },
                { key: 'time', label: 'Time', align: 'center' },
              ]}
              rows={bidHistory.map(b => ({
                ...b,
                vehicle: <span style={{ fontWeight: 600 }}>{b.vehicle}</span>,
                myBid: <span style={{ color: EdsColors.gold, fontWeight: 600 }}>{formatKES(b.myBid)}</span>,
                currentBid: <span style={{ color: EdsColors.text }}>{formatKES(b.currentBid)}</span>,
                status: (
                  <EnterpriseStatus 
                    label={b.status === 'winning' ? 'Winning' : b.status === 'outbid' ? 'Outbid' : 'Won'} 
                    color={b.status === 'winning' ? EdsColors.emerald : b.status === 'outbid' ? EdsColors.red : EdsColors.gold} 
                  />
                ),
                time: <span style={{ color: EdsColors.textMuted, fontSize: 12 }}>{b.time}</span>,
              }))}
              striped
            />
          </EnterpriseCard>
        )}

        {tab === 'saved' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {savedVehicles.map(vehicle => (
              <div 
                key={vehicle.id}
                style={{
                  background: EdsColors.card,
                  border: `1px solid ${EdsColors.border}`,
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                <div style={{ 
                  height: 160, 
                  background: EdsColors.surface,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Car size={48} color={EdsColors.textDim} />
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: EdsColors.text, marginBottom: 4 }}>
                    {vehicle.title}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', color: EdsColors.gold, fontWeight: 700, fontSize: '1.2rem', marginBottom: 12 }}>
                    {formatKES(vehicle.price)}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link 
                      to={`/cars/${vehicle.id}`}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: EdsColors.gold,
                        color: '#000',
                        fontSize: 11,
                        fontWeight: 700,
                        textDecoration: 'none',
                        textAlign: 'center',
                      }}
                    >
                      View Details
                    </Link>
                    <button 
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: `${EdsColors.red}15`,
                        border: `1px solid ${EdsColors.red}30`,
                        color: EdsColors.red,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Heart size={16} fill={EdsColors.red} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
