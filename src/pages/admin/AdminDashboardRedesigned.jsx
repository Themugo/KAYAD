import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Car, DollarSign, ShoppingCart, TrendingUp, Eye, Star, Settings,
  Activity, AlertTriangle, CheckCircle, Clock, Bell, Shield, Zap, BarChart3,
  ArrowUpRight, Car as CarIcon, UserPlus, Lock, FileText, Ticket, Globe
} from 'lucide-react';
import { 
  EnterpriseCard, DashboardHeader, EnterpriseKPI, EnterpriseTimeline,
  EnterpriseNotifications, EnterpriseTaskSummary, EnterpriseQuickActions,
  EnterpriseChart, EnterpriseTable, EnterpriseStatus, EnterpriseMetricRow,
  RevenueCard, VehiclePerformance, AuctionStats, TabNavigation, SectionLabel,
  GridLayout, GridAuto, EnterpriseEmptyState, EdsColors
} from '../../components/enterprise/EnterpriseDesignSystem';

export default function AdminDashboardRedesigned() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCars: 0,
    revenue: 0,
    activeBids: 0,
  });

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setStats({
        totalUsers: 12847,
        totalCars: 3452,
        revenue: 245600000,
        activeBids: 847,
        totalDealers: 156,
        liveAuctions: 23,
        pendingEscrows: 45,
        disputes: 12,
        completedToday: 18,
      });
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Mock data for various sections
  const notifications = [
    { id: 1, icon: <CarIcon size={16} />, title: 'New vehicle pending moderation', description: 'Toyota Land Cruiser V8 — Nairobi Auto Hub', time: '5m ago', unread: true, color: EdsColors.gold },
    { id: 2, icon: <UserPlus size={16} />, title: 'New dealer registration', description: 'Mombasa Motors Ltd — awaiting verification', time: '15m ago', unread: true, color: EdsColors.blue },
    { id: 3, icon: <DollarSign size={16} />, title: 'High-value escrow released', description: 'KES 12.5M — Mercedes GLE 2023', time: '1h ago', unread: false, color: EdsColors.emerald },
    { id: 4, icon: <AlertTriangle size={16} />, title: 'Dispute raised on Escrow #4029', description: 'Buyer claims vehicle not delivered', time: '2h ago', unread: true, color: EdsColors.red },
    { id: 5, icon: <CheckCircle size={16} />, title: 'Inspection completed', description: 'Audi Q7 — Score: 92/100', time: '3h ago', unread: false, color: EdsColors.emerald },
  ];

  const activityFeed = [
    { id: 1, title: 'New vehicle listed: Toyota Land Cruiser V8', description: 'Listed by Nairobi Auto Hub · KES 12,500,000', time: '2m ago', color: EdsColors.emerald },
    { id: 2, title: 'Bid placed: KES 11,200,000 on Mercedes GLE', description: 'Bidder: James K. · Outbid 3 others', time: '15m ago', color: EdsColors.orange },
    { id: 3, title: 'New dealer registered: Mombasa Motors', description: 'Business verification pending', time: '1h ago', color: EdsColors.blue },
    { id: 4, title: 'Escrow released for BMW X5 M Sport', description: 'KES 8,400,000 · Buyer confirmed receipt', time: '2h ago', color: EdsColors.emerald },
    { id: 5, title: 'Inspection completed for Audi Q7', description: 'Score: 92/100 · Inspector: John M.', time: '3h ago', color: EdsColors.emerald },
    { id: 6, title: 'Payment processed: KES 450,000 deposit', description: 'Auction deposit · Mercedes GLE', time: '4h ago', color: EdsColors.blue },
  ];

  const topVehicles = [
    { id: 1, title: 'Toyota Land Cruiser V8', price: 'KES 12.5M', views: 2847, inquiries: 45, status: 'live', statusColor: EdsColors.emerald, image: null },
    { id: 2, title: 'Mercedes GLE 2023', price: 'KES 8.4M', views: 1923, inquiries: 32, status: 'live', statusColor: EdsColors.emerald, image: null },
    { id: 3, title: 'BMW X5 M Sport', price: 'KES 7.2M', views: 1654, inquiries: 28, status: 'sold', statusColor: EdsColors.gold, image: null },
    { id: 4, title: 'Audi Q7 2022', price: 'KES 6.8M', views: 1432, inquiries: 24, status: 'listed', statusColor: EdsColors.blue, image: null },
    { id: 5, title: 'Range Rover Sport', price: 'KES 9.5M', views: 1287, inquiries: 21, status: 'live', statusColor: EdsColors.emerald, image: null },
  ];

  const revenueData = [45, 52, 38, 65, 72, 58, 85, 68, 75, 88, 82, 95];
  const bidActivityData = [12, 25, 18, 30, 22, 35, 28, 42, 38, 45, 52, 48];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const quickActions = [
    { id: 1, icon: <Users size={18} />, label: 'Manage Users', description: 'View, verify, suspend accounts', to: '/admin/users' },
    { id: 2, icon: <CarIcon size={18} />, label: 'Vehicle Moderation', description: 'Approve or reject listings', to: '/admin/cars' },
    { id: 3, icon: <Lock size={18} />, label: 'Escrow Vault', description: 'Monitor & release payments', to: '/admin/escrows' },
    { id: 4, icon: <Zap size={18} />, label: 'Live Auctions', description: 'Monitor ongoing auctions', to: '/admin/auctions' },
    { id: 5, icon: <Shield size={18} />, label: 'Dealer Verifications', description: 'Approve dealer accounts', to: '/admin/dealers' },
    { id: 6, icon: <Settings size={18} />, label: 'Platform Settings', description: 'Fees, branding, packages', to: '/admin/settings' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={14} />, count: 6 },
    { id: 'alerts', label: 'Alerts', icon: <Bell size={14} />, count: 4 },
    { id: 'reports', label: 'Reports', icon: <FileText size={14} /> },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const formatKES = (num) => {
    if (num >= 1000000) return `KES ${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `KES ${(num / 1000).toFixed(0)}K`;
    return `KES ${num}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <DashboardHeader 
        badge="Platform Owner"
        badgeColor={EdsColors.gold}
        greeting="Welcome back"
        name="Admin"
        subtitle={`${stats.totalCars.toLocaleString()} vehicles · ${stats.totalDealers} dealers · ${stats.totalUsers.toLocaleString()} users`}
        date={new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={
          <Link 
            to="/admin/settings" 
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              background: `${EdsColors.gold}15`,
              border: `1px solid ${EdsColors.gold}30`,
              color: EdsColors.gold,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Settings size={14} /> Settings
          </Link>
        }
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px 28px' }}>
        {/* Tab Navigation */}
        <TabNavigation tabs={tabs} active={tab} onChange={setTab} />

        {tab === 'overview' && (
          <>
            {/* KPI Row - Top Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
              <EnterpriseKPI 
                icon={<Users size={20} />}
                label="Total Users" 
                value={stats.totalUsers.toLocaleString()} 
                trend={5}
                accent={EdsColors.blue}
              />
              <EnterpriseKPI 
                icon={<CarIcon size={20} />}
                label="Total Vehicles" 
                value={stats.totalCars.toLocaleString()} 
                trend={12}
                accent={EdsColors.emerald}
              />
              <EnterpriseKPI 
                icon={<DollarSign size={20} />}
                label="Total Revenue" 
                value={formatKES(stats.revenue)} 
                trend={8}
                accent={EdsColors.gold}
              />
              <EnterpriseKPI 
                icon={<ShoppingCart size={20} />}
                label="Active Bids" 
                value={stats.activeBids.toLocaleString()} 
                accent={EdsColors.orange}
              />
              <EnterpriseKPI 
                icon={<Globe size={20} />}
                label="Live Auctions" 
                value={stats.liveAuctions}
                accent={EdsColors.red}
              />
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Quick Actions</SectionLabel>
              <EnterpriseQuickActions actions={quickActions} columns={6} density="compact" />
            </div>

            {/* Main Content Grid */}
            <GridLayout columns={3} gap={24} style={{ marginBottom: 24 }}>
              {/* Revenue Overview */}
              <div style={{ gridColumn: 'span 2' }}>
                <EnterpriseCard 
                  header="Revenue Trend" 
                  icon={<TrendingUp size={16} color={EdsColors.gold} />}
                  action={{ label: 'View Reports', to: '/admin/reports' }}
                  padding="md"
                >
                  <EnterpriseChart 
                    data={revenueData} 
                    labels={months}
                    height={180}
                    color={EdsColors.gold}
                    type="bar"
                  />
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-around',
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: `1px solid ${EdsColors.border}`,
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: EdsColors.text }}>{formatKES(stats.revenue)}</div>
                      <div style={{ fontSize: 10, color: EdsColors.textMuted }}>Total Revenue</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: EdsColors.orange }}>{formatKES(stats.pendingEscrows * 500000)}</div>
                      <div style={{ fontSize: 10, color: EdsColors.textMuted }}>In Escrow</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: EdsColors.emerald }}>{stats.completedToday}</div>
                      <div style={{ fontSize: 10, color: EdsColors.textMuted }}>Completed Today</div>
                    </div>
                  </div>
                </EnterpriseCard>
              </div>

              {/* Notifications */}
              <div>
                <EnterpriseCard 
                  header="Notifications" 
                  icon={<Bell size={16} color={EdsColors.red} />}
                  padding="md"
                >
                  <EnterpriseNotifications 
                    items={notifications}
                    maxItems={5}
                  />
                </EnterpriseCard>
              </div>
            </GridLayout>

            {/* Secondary Grid */}
            <GridLayout columns={2} gap={24} style={{ marginBottom: 24 }}>
              {/* Bid Activity Chart */}
              <EnterpriseCard 
                header="Bid Activity (7 Days)" 
                icon={<Activity size={16} color={EdsColors.orange} />}
                padding="md"
              >
                <EnterpriseChart 
                  data={bidActivityData.slice(-7)} 
                  labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                  height={160}
                  color={EdsColors.orange}
                />
              </EnterpriseCard>

              {/* Task Summary */}
              <EnterpriseCard 
                header="Platform Health" 
                icon={<Shield size={16} color={EdsColors.emerald} />}
                padding="md"
              >
                <EnterpriseTaskSummary 
                  tasks={[
                    { label: 'Active Users', count: stats.totalUsers.toLocaleString(), color: EdsColors.blue },
                    { label: 'Live Auctions', count: stats.liveAuctions, color: EdsColors.emerald },
                    { label: 'Pending Escrow', count: stats.pendingEscrows, color: EdsColors.orange },
                    { label: 'Disputes', count: stats.disputes, color: EdsColors.red },
                  ]}
                  columns={4}
                />
              </EnterpriseCard>
            </GridLayout>

            {/* Top Vehicles */}
            <div style={{ marginBottom: 24 }}>
              <EnterpriseCard 
                header="Most Viewed Vehicles" 
                icon={<Eye size={16} color={EdsColors.gold} />}
                action={{ label: 'View All', to: '/admin/cars' }}
                padding="md"
              >
                <EnterpriseTable
                  columns={[
                    { key: 'title', label: 'Vehicle' },
                    { key: 'views', label: 'Views', align: 'center' },
                    { key: 'inquiries', label: 'Inquiries', align: 'center' },
                    { key: 'status', label: 'Status', align: 'center' },
                  ]}
                  rows={topVehicles.map(v => ({
                    ...v,
                    title: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {v.image && (
                          <img src={v.image} alt={v.title} style={{ width: 48, height: 32, objectFit: 'cover', borderRadius: 6 }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: EdsColors.text }}>{v.title}</div>
                          <div style={{ fontSize: 11, color: EdsColors.gold }}>{v.price}</div>
                        </div>
                      </div>
                    ),
                    views: <span style={{ color: EdsColors.textMuted }}>{v.views.toLocaleString()}</span>,
                    inquiries: <span style={{ color: EdsColors.textMuted }}>{v.inquiries}</span>,
                    status: <EnterpriseStatus label={v.status} color={v.statusColor} />,
                  }))}
                  striped
                />
              </EnterpriseCard>
            </div>

            {/* Activity Timeline */}
            <EnterpriseCard 
              header="Live Activity Feed" 
              icon={<Activity size={16} color={EdsColors.gold} />}
              padding="md"
            >
              <EnterpriseTimeline items={activityFeed} maxItems={6} />
            </EnterpriseCard>
          </>
        )}

        {tab === 'activity' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            <EnterpriseCard header="All Activity" padding="md">
              <EnterpriseTimeline items={activityFeed} />
            </EnterpriseCard>
            <EnterpriseCard header="Recent Registrations" padding="md">
              <EnterpriseTimeline items={[
                { id: 1, title: 'Premium Auto KE', description: 'Dealer · Nairobi', time: '30m ago', color: EdsColors.blue },
                { id: 2, title: 'Sarah Wanjiku', description: 'Buyer · Mombasa', time: '1h ago', color: EdsColors.emerald },
                { id: 3, title: 'Highland Cars Ltd', description: 'Dealer · Eldoret', time: '3h ago', color: EdsColors.blue },
                { id: 4, title: 'John Kamau', description: 'Seller · Nakuru', time: '5h ago', color: EdsColors.emerald },
              ]} />
            </EnterpriseCard>
          </div>
        )}

        {tab === 'alerts' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <EnterpriseCard header="High Priority Alerts" padding="md">
              <EnterpriseTimeline items={notifications.filter(n => n.unread).map(n => ({
                ...n,
                title: n.title,
                description: n.description,
              }))} />
            </EnterpriseCard>
            <EnterpriseCard header="System Health" padding="md">
              <EnterpriseTaskSummary tasks={[
                { label: 'API Uptime', count: '99.9%', color: EdsColors.emerald },
                { label: 'DB Status', count: 'Healthy', color: EdsColors.emerald },
                { label: 'Cache Hit', count: '94%', color: EdsColors.blue },
                { label: 'Active Workers', count: 12, color: EdsColors.gold },
              ]} columns={4} />
            </EnterpriseCard>
          </div>
        )}

        {tab === 'reports' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <EnterpriseCard header="Monthly Revenue" padding="md">
              <EnterpriseChart data={revenueData} labels={months} height={200} color={EdsColors.gold} type="line" />
            </EnterpriseCard>
            <EnterpriseCard header="User Growth" padding="md">
              <EnterpriseChart data={[1200, 1450, 1680, 1920, 2100, 2350, 2680, 2940, 3200, 3580, 3950, 4200]} labels={months} height={200} color={EdsColors.blue} type="line" />
            </EnterpriseCard>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
