import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { carsAPI, escrowAPI } from '../api/api';
import { timeAgo } from '../utils/helpers';
import { Car, TrendingUp, Users, Shield, Clock, DollarSign, Plus, Eye, MessageCircle, RefreshCw } from 'lucide-react';
import CartyGrid from '../components/CartyGrid';
import BackButton from '../components/BackButton';
import GlassCard from '../components/dashboard/GlassCard';
import KPICard from '../components/dashboard/KPICard';
import StatRow from '../components/dashboard/StatRow';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import QuickActions from '../components/dashboard/QuickActions';
import DataTable from '../components/dashboard/DataTable';
import '../styles/dashboard.css';

export default function PrivateSellerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [listings, setListings] = useState([]);
  const [escrows, setEscrows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [listingsRes, escrowsRes] = await Promise.all([
        carsAPI.list({ seller: user?._id, limit: 20 }),
        escrowAPI.mine(),
      ]);
      
      setListings(listingsRes.cars || listingsRes.data || []);
      setEscrows(escrowsRes.escrows || []);
      
      // Calculate stats
      const activeListings = listings.filter(l => l.status === 'active').length;
      const soldListings = listings.filter(l => l.status === 'sold').length;
      const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
      const totalInquiries = listings.reduce((sum, l) => sum + (l.inquiries || 0), 0);
      
      setStats({
        activeListings,
        soldListings,
        totalViews,
        totalInquiries,
        pendingEscrows: escrows.filter(e => e.status === 'pending').length,
        completedEscrows: escrows.filter(e => e.status === 'completed').length,
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      let errorMessage = 'Could not load dashboard data';
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      toast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page loading-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!stats && listings.length === 0) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 48, textAlign: 'center' }}>
          <div className="empty-state-icon" style={{ opacity: 0.35, margin: '0 auto 20px' }}>
            <Car size={48} strokeWidth={1.2} />
          </div>
          <h3 className="empty-state-title">Could not load dashboard</h3>
          <p className="empty-state-text" style={{ marginBottom: 16 }}>Check your connection and try again.</p>
          <button type="button" onClick={fetchData} className="btn btn-gold">
            <RefreshCw size={14} style={{ marginRight: 6 }} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      {/* Header */}
      <div className="dash-header">
        <div className="dash-header-inner">
          <BackButton fallback="/dashboard" className="dash-back-btn" />
          <div className="dash-badge-row">
            <span className="dash-badge">
              Private Seller Hub
            </span>
          </div>
          <h1 className="dash-greeting">
            Welcome, <span className="dash-greeting-name">{user?.name?.split(' ')[0] || 'Seller'}</span>
          </h1>
          <p className="dash-subtitle">
            Manage your vehicle listings and track sales
          </p>
        </div>
      </div>

      <div className="dash-body">
        {loading ? (
          <div className="dash-loading-center">
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* KPI Row */}
            <StatRow className="dash-kpi-row">
              <KPICard
                title="Active Listings"
                value={stats?.activeListings || 0}
                icon={Car}
                trend={12}
                color="gold"
              />
              <KPICard
                title="Sold Vehicles"
                value={stats?.soldListings || 0}
                icon={DollarSign}
                trend={8}
                color="green"
              />
              <KPICard
                title="Total Views"
                value={stats?.totalViews || 0}
                icon={Eye}
                trend={15}
                color="blue"
              />
              <KPICard
                title="Total Revenue"
                value={`KES ${(escrows.reduce((sum, e) => sum + (e.amount || 0), 0)).toLocaleString()}`}
                icon={TrendingUp}
                trend={20}
                color="gold"
              />
            </StatRow>

            {/* Quick Actions */}
            <div className="dash-actions-section">
              <h3 className="font-display font-bold text-white text-lg mb-4">Quick Actions</h3>
              <QuickActions 
                actions={[
                  { id: '1', label: 'List a Vehicle', icon: Plus, to: '/sell', color: 'gold' },
                  { id: '2', label: 'My Listings', icon: Car, to: '/seller', color: 'gold' },
                  { id: '3', label: 'View Analytics', icon: TrendingUp, to: '/seller/analytics', color: 'blue' },
                ]} 
              />
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              {/* Listings Performance Table */}
              <div className="lg:col-span-2">
                <GlassCard>
                  <div className="flex items-end justify-between mb-4">
                    <h3 className="font-display font-bold text-white text-lg">Listings Performance</h3>
                    <Link to="/seller" className="text-gold text-sm font-bold no-underline">View All →</Link>
                  </div>
                  <DataTable
                    columns={[
                      { key: 'title', label: 'Vehicle' },
                      { key: 'status', label: 'Status', render: (val) => (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          val === 'sold' ? 'bg-green-500/20 text-green-400' : val === 'active' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/40'
                        }`}>
                          {val}
                        </span>
                      )},
                      { key: 'views', label: 'Views' },
                      { key: 'inquiries', label: 'Inquiries' },
                    ]}
                    data={listings.slice(0, 5)}
                    emptyMessage="No listings yet"
                  />
                </GlassCard>
              </div>

              {/* Activity Feed */}
              <div className="lg:col-span-1">
                <ActivityFeed 
                  activities={
                    listings.length > 0
                      ? listings.slice(0, 5).map(l => ({
                          id: l._id,
                          icon: l.status === 'sold' ? Shield : Car,
                          title: l.status === 'sold' ? 'Vehicle Sold' : 'Active Listing',
                          description: l.title || `${l.brand || ''} ${l.model || ''}`,
                          timestamp: l.createdAt ? timeAgo(l.createdAt) : '',
                          color: l.status === 'sold' ? 'green' : 'gold',
                        }))
                      : [
                          { id: 'welcome', icon: Car, title: 'Welcome to Kayad', description: 'List your first vehicle to get started', timestamp: '', color: 'gold' },
                        ]
                  }
                />
              </div>
            </div>

            {/* Recent Listings */}
            <div className="favorites-section">
              <div className="flex items-end justify-between mb-4">
                <h3 className="font-display font-bold text-white text-xl">Recent Listings</h3>
                <Link to="/seller" className="text-gold text-sm font-bold no-underline">View All →</Link>
              </div>
              {listings.length > 0 ? (
                <div className="favorites-grid">
                  {listings.slice(0, 4).map(car => (
                    <CartyGrid key={car._id} car={car} isMobile={false} />
                  ))}
                </div>
              ) : (
                <GlassCard>
                  <div className="text-center py-12">
                    <Car size={48} className="text-white/20 mx-auto mb-4" />
                    <h3 className="font-display font-bold text-white text-lg mb-2">No Listings Yet</h3>
                    <p className="text-white/50 text-sm mb-6">Start selling by listing your first vehicle</p>
                    <Link to="/sell" className="btn btn-gold">List Your First Vehicle</Link>
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
