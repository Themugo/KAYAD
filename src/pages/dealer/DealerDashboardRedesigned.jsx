import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Car, DollarSign, Eye, ShoppingCart, TrendingUp, TrendingDown,
  Plus, Settings, BarChart3, Lock, MessageSquare, Clock, CheckCircle,
  AlertCircle, ArrowUpRight, ArrowDownRight, Target, PieChart, Calendar
} from 'lucide-react';
import { 
  EnterpriseCard, DashboardHeader, EnterpriseKPI, EnterpriseTimeline,
  EnterpriseNotifications, EnterpriseTaskSummary, EnterpriseQuickActions,
  EnterpriseChart, EnterpriseTable, EnterpriseStatus, EnterpriseMetricRow,
  RevenueCard, LeadManagement, InquiryManagement, AuctionStats, 
  TabNavigation, SectionLabel, GridLayout, GridAuto, EnterpriseEmptyState,
  TicketCard, EdsColors
} from '../../components/enterprise/EnterpriseDesignSystem';

export default function DealerDashboardRedesigned() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState({ name: 'Dealer', businessName: 'Nairobi Auto Hub' });

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        totalListings: 24,
        activeListings: 18,
        totalViews: 45632,
        totalBids: 156,
        liveAuctions: 3,
        pendingEscrows: 4,
        totalRevenue: 45600000,
        thisMonthRevenue: 8500000,
        totalInquiries: 234,
        thisMonthInquiries: 45,
        convertedLeads: 12,
        conversionRate: '15%',
        pendingPayments: 2,
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
    { id: 1, title: 'New view on Toyota V8', description: 'Nairobi, Kenya', time: '10m ago', color: EdsColors.blue },
    { id: 2, title: 'Bid placed: KES 11.2M on Mercedes GLE', description: 'By James K.', time: '1h ago', color: EdsColors.orange },
    { id: 3, title: 'New inquiry from Sarah W.', description: '"Is this vehicle still available?"', time: '2h ago', color: EdsColors.gold },
    { id: 4, title: 'Escrow payment received', description: 'KES 8.4M — BMW X5', time: '5h ago', color: EdsColors.emerald },
    { id: 5, title: 'Vehicle inspection scheduled', description: 'Toyota Land Cruiser — Tomorrow 9AM', time: '6h ago', color: EdsColors.purple },
  ];

  const recentListings = [
    { id: 1, title: 'Toyota Land Cruiser V8 2023', price: 'KES 12.5M', views: 2847, inquiries: 45, bids: 12, status: 'live', statusColor: EdsColors.emerald },
    { id: 2, title: 'Mercedes GLE 2023', price: 'KES 8.4M', views: 1923, inquiries: 32, bids: 8, status: 'live', statusColor: EdsColors.emerald },
    { id: 3, title: 'BMW X5 M Sport', price: 'KES 7.2M', views: 1654, inquiries: 28, bids: 5, status: 'sold', statusColor: EdsColors.gold },
    { id: 4, title: 'Audi Q7 2022', price: 'KES 6.8M', views: 1432, inquiries: 24, bids: 3, status: 'listed', statusColor: EdsColors.blue },
  ];

  const earningsData = [450, 520, 380, 610, 550, 720, 680, 750, 690, 820, 780, 910];
  const viewsData = [120, 145, 132, 168, 195, 178, 220, 245, 198, 265, 242, 280];

  const quickActions = [
    { id: 1, icon: <Plus size={18} />, label: 'List New Car', description: 'Add vehicle to marketplace', to: '/dealer/add-car' },
    { id: 2, icon: <BarChart3 size={18} />, label: 'Analytics', description: 'Views, bids, earnings', to: '/dealer/analytics' },
    { id: 3, icon: <Settings size={18} />, label: 'Settings', description: 'Payments & profile', to: '/dealer/settings' },
    { id: 4, icon: <Lock size={18} />, label: 'Check Escrow', description: 'View payment status', to: '/escrow' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
    { id: 'listings', label: 'Listings', icon: <Car size={14} />, count: stats?.totalListings },
    { id: 'leads', label: 'Leads', icon: <Target size={14} />, count: stats?.totalInquiries },
    { id: 'earnings', label: 'Earnings', icon: <DollarSign size={14} /> },
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
        badge="Dealer Hub"
        badgeColor={EdsColors.gold}
        greeting="Welcome back"
        name={user.name.split(' ')[0]}
        subtitle={user.businessName ? `🏪 ${user.businessName}` : 'Manage your inventory and track performance'}
        date={new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
        actions={
          <Link 
            to="/dealer/add-car" 
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
            <Plus size={14} /> List New Car
          </Link>
        }
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px 28px' }}>
        {/* Tab Navigation */}
        <TabNavigation tabs={tabs} active={tab} onChange={setTab} />

        {tab === 'overview' && (
          <>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
              <EnterpriseKPI 
                icon={<Car size={18} />}
                label="Total Listings" 
                value={stats.totalListings} 
                accent={EdsColors.gold}
              />
              <EnterpriseKPI 
                icon={<CheckCircle size={18} />}
                label="Active" 
                value={stats.activeListings} 
                accent={EdsColors.emerald}
              />
              <EnterpriseKPI 
                icon={<Eye size={18} />}
                label="Total Views" 
                value={stats.totalViews.toLocaleString()} 
                trend={5}
                accent={EdsColors.blue}
              />
              <EnterpriseKPI 
                icon={<TrendingUp size={18} />}
                label="Total Bids" 
                value={stats.totalBids} 
                accent={EdsColors.orange}
              />
              <EnterpriseKPI 
                icon={<Clock size={18} />}
                label="Live Auctions" 
                value={stats.liveAuctions} 
                accent={EdsColors.red}
              />
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Quick Actions</SectionLabel>
              <EnterpriseQuickActions actions={quickActions} columns={4} density="compact" />
            </div>

            {/* Main Grid */}
            <GridLayout columns={2} gap={24} style={{ marginBottom: 24 }}>
              {/* Recent Listings */}
              <EnterpriseCard 
                header="Recent Listings" 
                icon={<Car size={16} color={EdsColors.gold} />}
                action={{ label: 'View All', to: '/dealer/cars' }}
                padding="md"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {recentListings.slice(0, 4).map(listing => (
                    <div 
                      key={listing.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 12,
                        background: EdsColors.surface,
                        border: `1px solid ${EdsColors.border}`,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: EdsColors.text, marginBottom: 4 }}>
                          {listing.title}
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: EdsColors.textMuted }}>
                          <span><Eye size={10} /> {listing.views.toLocaleString()}</span>
                          <span><MessageSquare size={10} /> {listing.inquiries}</span>
                          <span><TrendingUp size={10} /> {listing.bids} bids</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: EdsColors.gold, marginBottom: 4 }}>
                          {listing.price}
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
                icon={<TrendingUp size={16} color={EdsColors.emerald} />}
                padding="md"
              >
                <EnterpriseTimeline items={recentActivity} maxItems={5} density="compact" />
              </EnterpriseCard>
            </GridLayout>

            {/* Secondary Grid */}
            <GridLayout columns={2} gap={24} style={{ marginBottom: 24 }}>
              {/* Views Chart */}
              <EnterpriseCard 
                header="Views (Last 7 Days)" 
                icon={<Eye size={16} color={EdsColors.blue} />}
                padding="md"
              >
                <EnterpriseChart 
                  data={viewsData.slice(-7)} 
                  labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                  height={140}
                  color={EdsColors.blue}
                />
              </EnterpriseCard>

              {/* Lead Management */}
              <LeadManagement 
                total={stats.totalInquiries}
                thisMonth={stats.thisMonthInquiries}
                converted={stats.convertedLeads}
                rate={stats.conversionRate}
                trend={8}
              />
            </GridLayout>

            {/* Earnings Overview */}
            <GridLayout columns={2} gap={24}>
              <div style={{ gridColumn: 'span 2' }}>
                <RevenueCard 
                  total={formatKES(stats.totalRevenue)}
                  pending={formatKES(stats.pendingEscrows * 2500000)}
                  released={formatKES(stats.totalRevenue - stats.pendingEscrows * 2500000)}
                  thisMonth={formatKES(stats.thisMonthRevenue)}
                  trend={12}
                />
              </div>
            </GridLayout>
          </>
        )}

        {tab === 'listings' && (
          <EnterpriseCard header="All Listings" padding="md">
            <EnterpriseTable
              columns={[
                { key: 'title', label: 'Vehicle' },
                { key: 'price', label: 'Price', align: 'right' },
                { key: 'views', label: 'Views', align: 'center' },
                { key: 'inquiries', label: 'Inquiries', align: 'center' },
                { key: 'bids', label: 'Bids', align: 'center' },
                { key: 'status', label: 'Status', align: 'center' },
              ]}
              rows={recentListings.map(l => ({
                ...l,
                title: <span style={{ fontWeight: 600 }}>{l.title}</span>,
                price: <span style={{ color: EdsColors.gold, fontWeight: 600 }}>{l.price}</span>,
                views: <span style={{ color: EdsColors.textMuted }}>{l.views.toLocaleString()}</span>,
                inquiries: <span style={{ color: EdsColors.textMuted }}>{l.inquiries}</span>,
                bids: <span style={{ color: EdsColors.textMuted }}>{l.bids}</span>,
                status: <EnterpriseStatus label={l.status} color={l.statusColor} />,
              }))}
              striped
            />
          </EnterpriseCard>
        )}

        {tab === 'leads' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <LeadManagement 
              total={stats.totalInquiries}
              thisMonth={stats.thisMonthInquiries}
              converted={stats.convertedLeads}
              rate={stats.conversionRate}
              trend={8}
            />
            <EnterpriseCard header="Recent Inquiries" padding="md">
              <EnterpriseTimeline items={[
                { id: 1, title: 'Sarah W. - Toyota Land Cruiser', description: '"Is this still available?"', time: '2h ago', color: EdsColors.gold },
                { id: 2, title: 'James K. - Mercedes GLE', description: '"Can I schedule a test drive?"', time: '4h ago', color: EdsColors.blue },
                { id: 3, title: 'Aisha M. - BMW X5', description: '"What\'s the negotiable price?"', time: '6h ago', color: EdsColors.purple },
              ]} />
            </EnterpriseCard>
          </div>
        )}

        {tab === 'earnings' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              <EnterpriseKPI 
                icon={<DollarSign size={18} />}
                label="Total Earned" 
                value={formatKES(stats.totalRevenue)} 
                accent={EdsColors.gold}
              />
              <EnterpriseKPI 
                icon={<Clock size={18} />}
                label="In Escrow" 
                value={formatKES(stats.pendingEscrows * 2500000)} 
                accent={EdsColors.orange}
              />
              <EnterpriseKPI 
                icon={<CheckCircle size={18} />}
                label="Released" 
                value={formatKES(stats.totalRevenue - stats.pendingEscrows * 2500000)} 
                accent={EdsColors.emerald}
              />
              <EnterpriseKPI 
                icon={<Calendar size={18} />}
                label="This Month" 
                value={formatKES(stats.thisMonthRevenue)} 
                trend={12}
                accent={EdsColors.blue}
              />
            </div>
            <EnterpriseCard header="Monthly Earnings" padding="md">
              <EnterpriseChart 
                data={earningsData} 
                labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
                height={200}
                color={EdsColors.gold}
                type="line"
              />
            </EnterpriseCard>
          </>
        )}
      </div>
    </div>
  );
}
