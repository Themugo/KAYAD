import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, DollarSign, Eye, TrendingUp, MessageSquare, Clock, CheckCircle,
  Plus, Settings, BarChart3, Target, ArrowUpRight, Star, User, Calendar
} from 'lucide-react';
import { 
  EnterpriseCard, DashboardHeader, EnterpriseKPI, EnterpriseTimeline,
  EnterpriseQuickActions, EnterpriseChart, EnterpriseTable, EnterpriseStatus, 
  EnterpriseMetricRow, RevenueCard, LeadManagement, TabNavigation, SectionLabel, 
  GridLayout, GridAuto, EnterpriseEmptyState, EdsColors
} from '../../components/enterprise/EnterpriseDesignSystem';

export default function PrivateSellerDashboardRedesigned() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [user, setUser] = useState({ name: 'Seller' });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        activeListings: 3,
        soldVehicles: 2,
        totalViews: 4521,
        totalInquiries: 28,
        avgViewsPerListing: 1507,
        avgInquiriesPerListing: 9,
        avgSalePrice: 2800000,
        soldRate: '67%',
        pendingEscrows: 1,
        completedEscrows: 1,
        totalRevenue: 5600000,
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

  const myListings = [
    { id: 1, title: 'Toyota Corolla 2021', price: 2800000, views: 1245, inquiries: 8, status: 'active', statusColor: EdsColors.emerald },
    { id: 2, title: 'Honda Civic 2020', price: 2200000, views: 876, inquiries: 5, status: 'active', statusColor: EdsColors.emerald },
    { id: 3, title: 'Nissan Skyline 2019', price: 4500000, views: 2340, inquiries: 15, status: 'sold', statusColor: EdsColors.gold },
    { id: 4, title: 'Mazda CX-5 2022', price: 3200000, views: 1890, inquiries: 12, status: 'sold', statusColor: EdsColors.gold },
  ];

  const recentActivity = [
    { id: 1, title: 'New inquiry on Toyota Corolla', description: '"Is this available for test drive?"', time: '1h ago', color: EdsColors.gold },
    { id: 2, title: 'View spike on Honda Civic', description: '+45 views today', time: '3h ago', color: EdsColors.blue },
    { id: 3, title: 'Escrow confirmed for Nissan Skyline', description: 'KES 4.5M — buyer confirmed', time: '1d ago', color: EdsColors.emerald },
    { id: 4, title: 'Vehicle sold: Nissan Skyline', description: 'Final price: KES 4.5M', time: '2d ago', color: EdsColors.emerald },
  ];

  const escrowSummary = [
    { id: 1, vehicle: 'Mazda CX-5', amount: 3200000, status: 'completed', date: '2026-07-05' },
    { id: 2, vehicle: 'Nissan Skyline', amount: 4500000, status: 'completed', date: '2026-07-08' },
  ];

  const quickActions = [
    { id: 1, icon: <Plus size={18} />, label: 'List a Vehicle', description: 'Sell your car in minutes', to: '/sell' },
    { id: 2, icon: <Car size={18} />, label: 'My Listings', description: 'View and manage listings', to: '/seller' },
    { id: 3, icon: <BarChart3 size={18} />, label: 'View Analytics', description: 'Performance insights', to: '/seller/analytics' },
    { id: 4, icon: <Settings size={18} />, label: 'Support', description: 'Get help with selling', to: '/seller/support' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
    { id: 'listings', label: 'Listings', icon: <Car size={14} />, count: stats?.activeListings },
    { id: 'performance', label: 'Performance', icon: <TrendingUp size={14} /> },
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
        badge="Private Seller Hub"
        badgeColor={EdsColors.purple}
        greeting="Welcome back"
        name={user.name.split(' ')[0]}
        subtitle="Manage your vehicle listings and track sales"
        date={new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
        actions={
          <Link 
            to="/sell" 
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              background: EdsColors.gold,
              color: '#000',
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Plus size={14} /> List a Vehicle
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
                icon={<Car size={18} />}
                label="Active Listings" 
                value={stats.activeListings} 
                trend={12}
                accent={EdsColors.gold}
              />
              <EnterpriseKPI 
                icon={<CheckCircle size={18} />}
                label="Sold Vehicles" 
                value={stats.soldVehicles} 
                accent={EdsColors.emerald}
              />
              <EnterpriseKPI 
                icon={<Eye size={18} />}
                label="Total Views" 
                value={stats.totalViews.toLocaleString()} 
                trend={15}
                accent={EdsColors.blue}
              />
              <EnterpriseKPI 
                icon={<DollarSign size={18} />}
                label="Total Revenue" 
                value={formatKES(stats.totalRevenue)} 
                accent={EdsColors.gold}
              />
              <EnterpriseKPI 
                icon={<MessageSquare size={18} />}
                label="Inquiries" 
                value={stats.totalInquiries} 
                accent={EdsColors.purple}
              />
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Quick Actions</SectionLabel>
              <EnterpriseQuickActions actions={quickActions} columns={4} density="compact" />
            </div>

            {/* Main Grid */}
            <GridLayout columns={2} gap={24} style={{ marginBottom: 24 }}>
              {/* Listings Performance */}
              <EnterpriseCard 
                header="Listings Performance" 
                icon={<TrendingUp size={16} color={EdsColors.gold} />}
                action={{ label: 'View All', to: '/seller' }}
                padding="md"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {myListings.slice(0, 3).map(listing => (
                    <div 
                      key={listing.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 10,
                        background: EdsColors.surface,
                        border: `1px solid ${EdsColors.border}`,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: EdsColors.text, marginBottom: 2 }}>
                          {listing.title}
                        </div>
                        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: EdsColors.textMuted }}>
                          <span><Eye size={10} /> {listing.views.toLocaleString()}</span>
                          <span><MessageSquare size={10} /> {listing.inquiries}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: EdsColors.gold, marginBottom: 2 }}>
                          {formatKES(listing.price)}
                        </div>
                        <EnterpriseStatus label={listing.status} color={listing.statusColor} />
                      </div>
                    </div>
                  ))}
                </div>
              </EnterpriseCard>

              {/* Activity Feed */}
              <EnterpriseCard 
                header="Recent Activity" 
                icon={<Clock size={16} color={EdsColors.emerald} />}
                padding="md"
              >
                <EnterpriseTimeline items={recentActivity} maxItems={4} density="compact" />
              </EnterpriseCard>
            </GridLayout>

            {/* Secondary Grid */}
            <GridLayout columns={2} gap={24} style={{ marginBottom: 24 }}>
              {/* Escrow Summary */}
              <EnterpriseCard 
                header="Escrow Summary" 
                icon={<DollarSign size={16} color={EdsColors.gold} />}
                padding="md"
              >
                <EnterpriseMetricRow items={[
                  { icon: '⏳', value: stats.pendingEscrows, label: 'Pending' },
                  { icon: '✅', value: stats.completedEscrows, label: 'Completed' },
                  { icon: '💰', value: formatKES(stats.totalRevenue), label: 'Total Value' },
                ]} columns={3} />
                {escrowSummary.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <EnterpriseTimeline 
                      items={escrowSummary.map(e => ({
                        id: e.id,
                        title: `${e.vehicle} — ${formatKES(e.amount)}`,
                        description: e.status === 'completed' ? 'Payment confirmed' : 'Processing',
                        time: e.date,
                        color: e.status === 'completed' ? EdsColors.emerald : EdsColors.orange,
                      }))}
                      maxItems={3}
                      density="compact"
                    />
                  </div>
                )}
              </EnterpriseCard>

              {/* Performance Metrics */}
              <EnterpriseCard 
                header="Performance Metrics" 
                icon={<Target size={16} color={EdsColors.purple} />}
                padding="md"
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { icon: <Eye size={16} />, label: 'Avg Views/Listing', value: stats.avgViewsPerListing.toLocaleString() },
                    { icon: <MessageSquare size={16} />, label: 'Avg Inquiries/Listing', value: stats.avgInquiriesPerListing },
                    { icon: <DollarSign size={16} />, label: 'Avg Sale Price', value: formatKES(stats.avgSalePrice) },
                    { icon: <CheckCircle size={16} />, label: 'Sold Rate', value: stats.soldRate },
                  ].map((m, i) => (
                    <div 
                      key={i}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background: EdsColors.surface,
                        border: `1px solid ${EdsColors.border}`,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ color: EdsColors.gold, marginBottom: 6 }}>{m.icon}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-display)', color: EdsColors.text, marginBottom: 2 }}>
                        {m.value}
                      </div>
                      <div style={{ fontSize: 9, color: EdsColors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>
              </EnterpriseCard>
            </GridLayout>

            {/* My Vehicles Grid */}
            <SectionLabel action={<Link to="/seller" style={{ color: EdsColors.gold, fontSize: 11, fontWeight: 600 }}>View All →</Link>}>
              My Vehicles
            </SectionLabel>
            <GridAuto minWidth={240}>
              {myListings.slice(0, 4).map(car => (
                <div 
                  key={car.id}
                  style={{
                    background: EdsColors.card,
                    border: `1px solid ${EdsColors.border}`,
                    borderRadius: 16,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ 
                    height: 120, 
                    background: EdsColors.surface,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Car size={32} color={EdsColors.textDim} />
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: EdsColors.text, marginBottom: 4 }}>
                      {car.title}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', color: EdsColors.gold, fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>
                      {formatKES(car.price)}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: EdsColors.textMuted }}>
                      <span><Eye size={10} /> {car.views.toLocaleString()}</span>
                      <span><MessageSquare size={10} /> {car.inquiries}</span>
                    </div>
                  </div>
                </div>
              ))}
            </GridAuto>
          </>
        )}

        {tab === 'listings' && (
          <EnterpriseCard header="My Listings" padding="md">
            <EnterpriseTable
              columns={[
                { key: 'title', label: 'Vehicle' },
                { key: 'price', label: 'Price', align: 'right' },
                { key: 'views', label: 'Views', align: 'center' },
                { key: 'inquiries', label: 'Inquiries', align: 'center' },
                { key: 'status', label: 'Status', align: 'center' },
              ]}
              rows={myListings.map(l => ({
                ...l,
                title: <span style={{ fontWeight: 600 }}>{l.title}</span>,
                price: <span style={{ color: EdsColors.gold, fontWeight: 600 }}>{formatKES(l.price)}</span>,
                views: <span style={{ color: EdsColors.textMuted }}>{l.views.toLocaleString()}</span>,
                inquiries: <span style={{ color: EdsColors.textMuted }}>{l.inquiries}</span>,
                status: <EnterpriseStatus label={l.status} color={l.statusColor} />,
              }))}
              striped
            />
          </EnterpriseCard>
        )}

        {tab === 'performance' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              <EnterpriseKPI 
                icon={<Eye size={18} />}
                label="Total Views" 
                value={stats.totalViews.toLocaleString()} 
                trend={15}
                accent={EdsColors.blue}
              />
              <EnterpriseKPI 
                icon={<MessageSquare size={18} />}
                label="Total Inquiries" 
                value={stats.totalInquiries} 
                accent={EdsColors.purple}
              />
              <EnterpriseKPI 
                icon={<TrendingUp size={18} />}
                label="Avg Views/Listing" 
                value={stats.avgViewsPerListing.toLocaleString()} 
                accent={EdsColors.gold}
              />
              <EnterpriseKPI 
                icon={<Target size={18} />}
                label="Conversion Rate" 
                value={stats.soldRate} 
                accent={EdsColors.emerald}
              />
            </div>
            <GridLayout columns={2} gap={24}>
              <EnterpriseCard header="Views Trend" padding="md">
                <EnterpriseChart 
                  data={[120, 145, 132, 168, 195, 178, 220]} 
                  labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                  height={160}
                  color={EdsColors.blue}
                />
              </EnterpriseCard>
              <EnterpriseCard header="Inquiry Trend" padding="md">
                <EnterpriseChart 
                  data={[2, 4, 3, 5, 6, 4, 8]} 
                  labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                  height={160}
                  color={EdsColors.purple}
                />
              </EnterpriseCard>
            </GridLayout>
          </>
        )}
      </div>
    </div>
  );
}
