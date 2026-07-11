import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, carsAPI, formatKES } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/ui';
import {
  EnterpriseCard, EnterpriseKPI, EnterpriseRevenue, EnterpriseTimeline,
  EnterpriseChart, EnterpriseQuickActions, EnterpriseTable, EnterpriseBadge,
  EnterpriseMetricRow, DashboardHeader, EnterpriseTabs, EnterpriseProgress,
  EnterpriseNotifications, EnterpriseTokens
} from '../../components/enterprise/EnterpriseDashboard';

const MOCK_STATS = {
  totalViews: 12450,
  totalInquiries: 89,
  totalBids: 34,
  totalRevenue: 12450000,
  activeListings: 12,
  pendingEscrows: 3,
  avgRating: 4.8,
  responseRate: 94,
};

const LISTINGS_TREND = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 18 },
  { label: 'Wed', value: 15 },
  { label: 'Thu', value: 22 },
  { label: 'Fri', value: 19 },
  { label: 'Sat', value: 8 },
  { label: 'Sun', value: 6 },
];

const INQUIRIES_DATA = [
  { label: 'Jan', value: 15 },
  { label: 'Feb', value: 22 },
  { label: 'Mar', value: 18 },
  { label: 'Apr', value: 28 },
  { label: 'May', value: 24 },
  { label: 'Jun', value: 32 },
];

const RECENT_ACTIVITY = [
  { title: 'New inquiry received', description: 'Toyota Land Cruiser - James M.', time: '5m ago', color: EnterpriseTokens.info },
  { title: 'Bid accepted', description: 'Mercedes GLE - KES 12.5M', time: '1h ago', color: EnterpriseTokens.success },
  { title: 'Escrow initiated', description: 'BMW X5 - KES 7.8M', time: '2h ago', color: EnterpriseTokens.warning },
  { title: 'Listing viewed', description: 'Your Porsche Cayenne has 45 new views', time: '3h ago', color: EnterpriseTokens.gold },
  { title: 'Review received', description: '5-star review from Sarah O.', time: '5h ago', color: EnterpriseTokens.success },
];

const NOTIFICATIONS = [
  { icon: '📬', title: 'New inquiry', description: 'Someone is interested in your Toyota Land Cruiser', time: '5m ago', unread: true, color: EnterpriseTokens.info },
  { icon: '💰', title: 'Escrow payment', description: 'Buyer confirmed payment - KES 12.5M', time: '1h ago', unread: true, color: EnterpriseTokens.success },
  { icon: '⭐', title: 'New review', description: '5-star review from John K.', time: '3h ago', unread: false, color: EnterpriseTokens.gold },
  { icon: '📊', title: 'Performance update', description: 'Your listing got 150 views this week', time: '5h ago', unread: false, color: EnterpriseTokens.purple },
];

const TOP_LISTINGS = [
  { title: 'Toyota Land Cruiser 300', views: 2450, inquiries: 12, price: 'KES 18.5M', status: 'Active' },
  { title: 'Mercedes GLE 350d', views: 1890, inquiries: 8, price: 'KES 12.5M', status: 'Escrow' },
  { title: 'Porsche Cayenne S', views: 1650, inquiries: 6, price: 'KES 15.8M', status: 'Auction' },
  { title: 'BMW X5 xDrive30d', views: 1420, inquiries: 5, price: 'KES 7.5M', status: 'Active' },
];

const TABLE_COLUMNS = [
  { key: 'title', label: 'Vehicle' },
  { key: 'views', label: 'Views', align: 'right' },
  { key: 'inquiries', label: 'Inquiries', align: 'right' },
  { key: 'price', label: 'Price', align: 'right' },
  { key: 'status', label: 'Status' },
];

const DEALER_ACTIONS = [
  { icon: '➕', label: 'Add Listing', desc: 'Post a new vehicle', to: '/dealer/add-car' },
  { icon: '📊', label: 'Analytics', desc: 'View performance', to: '/dealer/analytics' },
  { icon: '🎫', label: 'Inquiries', desc: '89 total received', to: '/dealer/inquiries' },
  { icon: '💰', label: 'Earnings', desc: 'View transactions', to: '/dealer/earnings' },
  { icon: '🔒', label: 'Escrows', desc: '3 active', to: '/dealer/escrows' },
  { icon: '⚙️', label: 'Settings', desc: 'Manage account', to: '/dealer/settings' },
];

export default function DealerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [summary, setSummary] = useState(null);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        dealerAPI.summary().catch(() => ({})),
        dealerAPI.cars().catch(() => []),
      ]);
      setSummary(s);
      setCars(c.cars || c.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadDashboard(); }, []);

  const handleDelete = async (carId) => {
    if (!confirm('Delete this listing?')) return;
    try {
      await carsAPI.remove(carId);
      setCars(prev => prev.filter(c => c._id !== carId));
      toast('Listing deleted', 'info');
    } catch { toast('Failed to delete', 'error'); }
  };

  if (!user?.approved && user?.role === 'dealer') {
    return (
      <div style={{ background: EnterpriseTokens.bg, minHeight: '100vh', paddingTop: 88 }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: 40 }}>
          <EnterpriseCard header="⏳ Account Pending">
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <h3 style={{ marginBottom: 8, color: '#fff' }}>Awaiting Admin Approval</h3>
              <p style={{ color: EnterpriseTokens.textMuted, fontSize: 14 }}>Your dealer account is pending approval.</p>
            </div>
          </EnterpriseCard>
        </div>
      </div>
    );
  }

  const stats = MOCK_STATS;
  const s = summary || {};

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'listings', label: 'Listings', icon: '🚗', count: stats.activeListings },
    { id: 'performance', label: 'Performance', icon: '📈' },
    { id: 'inquiries', label: 'Inquiries', icon: '📬', count: stats.totalInquiries },
  ];

  return (
    <div style={{ background: EnterpriseTokens.bg, minHeight: '100vh' }}>
      <DashboardHeader
        badge="Dealer"
        greeting={'Welcome back, ' + (user?.businessName || user?.name || 'Dealer')}
        subtitle={stats.activeListings + ' active listings · ' + stats.totalViews.toLocaleString() + ' total views'}
        actions={
          <Link to="/dealer/add-car" style={{
            padding: '8px 16px',
            borderRadius: 10,
            background: EnterpriseTokens.goldBg,
            border: '1px solid ' + EnterpriseTokens.goldBorder,
            color: EnterpriseTokens.gold,
            fontSize: 11,
            fontWeight: 700,
            textDecoration: 'none',
          }}>
            + Add Listing
          </Link>
        }
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 28px' }}>
        <EnterpriseTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
              <EnterpriseKPI icon="👁️" label="Total Views" value={stats.totalViews.toLocaleString()} trend={15} accent={EnterpriseTokens.info} />
              <EnterpriseKPI icon="📬" label="Inquiries" value={stats.totalInquiries} trend={8} accent={EnterpriseTokens.success} />
              <EnterpriseKPI icon="🎁" label="Bids Received" value={stats.totalBids} accent={EnterpriseTokens.warning} />
              <EnterpriseKPI icon="⭐" label="Rating" value={stats.avgRating + '/5'} accent={EnterpriseTokens.gold} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <EnterpriseRevenue label="Total Revenue" value="KES 12.45M" sub="+22% vs last month" period="YTD 2026" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <EnterpriseCard header="Listings Performance" icon="📊">
                <EnterpriseChart data={LISTINGS_TREND} height={160} showLabels color={EnterpriseTokens.info} />
                <div style={{ marginTop: 16 }}>
                  <EnterpriseProgress value={94} max={100} label="Response Rate" color={EnterpriseTokens.success} showPercent />
                </div>
              </EnterpriseCard>

              <EnterpriseCard header="Inquiry Trend" icon="📈">
                <EnterpriseChart data={INQUIRIES_DATA} height={160} showLabels color={EnterpriseTokens.success} />
              </EnterpriseCard>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
              <EnterpriseCard header="Recent Activity" icon="🔔">
                <EnterpriseTimeline items={RECENT_ACTIVITY} maxHeight={280} />
              </EnterpriseCard>

              <EnterpriseCard header="Notifications" icon="📨">
                <EnterpriseNotifications items={NOTIFICATIONS} />
              </EnterpriseCard>

              <EnterpriseCard header="Quick Actions" icon="⚡">
                <EnterpriseQuickActions actions={DEALER_ACTIONS} cols={2} />
              </EnterpriseCard>
            </div>

            <EnterpriseCard header="Top Performing Listings" icon="🏆" action={{ label: 'View All', to: '/dealer/listings' }}>
              <EnterpriseTable
                columns={TABLE_COLUMNS}
                data={TOP_LISTINGS.map(l => ({
                  ...l,
                  status: l.status,
                }))}
                onRowClick={() => toast('Opening listing...')}
              />
            </EnterpriseCard>
          </>
        )}

        {activeTab === 'listings' && (
          <EnterpriseCard header="My Listings" icon="🚗">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {TOP_LISTINGS.map((listing, i) => (
                <div key={i} style={{
                  padding: 16,
                  background: EnterpriseTokens.surface,
                  borderRadius: 12,
                  border: '1px solid ' + EnterpriseTokens.border,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{listing.title}</div>
                    <EnterpriseBadge label={listing.status} color={EnterpriseTokens.success} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: EnterpriseTokens.textMuted }}>Views</div>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{listing.views.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: EnterpriseTokens.textMuted }}>Inquiries</div>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{listing.inquiries}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: EnterpriseTokens.gold }}>{listing.price}</div>
                </div>
              ))}
            </div>
          </EnterpriseCard>
        )}

        {activeTab === 'performance' && (
          <EnterpriseCard header="Performance Analytics" icon="📈">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              <EnterpriseMetricRow icon="👁️" label="Total Views" value="12,450" trend={15} color={EnterpriseTokens.info} />
              <EnterpriseMetricRow icon="📬" label="Inquiries" value="89" trend={8} color={EnterpriseTokens.success} />
              <EnterpriseMetricRow icon="🎁" label="Bids" value="34" color={EnterpriseTokens.warning} />
              <EnterpriseMetricRow icon="⭐" label="Rating" value="4.8/5" color={EnterpriseTokens.gold} />
            </div>
            <div style={{ marginTop: 24 }}>
              <EnterpriseChart data={LISTINGS_TREND} label="Views Over Time" height={200} showLabels color={EnterpriseTokens.gold} />
            </div>
          </EnterpriseCard>
        )}

        {activeTab === 'inquiries' && (
          <EnterpriseCard header="Inquiry Management" icon="📬">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div style={{ padding: 16, background: EnterpriseTokens.surface, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: EnterpriseTokens.gold }}>24</div>
                <div style={{ fontSize: 12, color: EnterpriseTokens.textMuted }}>New</div>
              </div>
              <div style={{ padding: 16, background: EnterpriseTokens.surface, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: EnterpriseTokens.info }}>45</div>
                <div style={{ fontSize: 12, color: EnterpriseTokens.textMuted }}>Pending Response</div>
              </div>
              <div style={{ padding: 16, background: EnterpriseTokens.surface, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: EnterpriseTokens.success }}>20</div>
                <div style={{ fontSize: 12, color: EnterpriseTokens.textMuted }}>Responded</div>
              </div>
            </div>
          </EnterpriseCard>
        )}
      </div>
    </div>
  );
}
