import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, carsAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  Plus, Eye, MessageSquare, DollarSign, TrendingUp, TrendingDown,
  Car, Users, Star, Settings, BarChart3, Bell, Zap, ArrowUp, ChevronRight
} from 'lucide-react';
import { DealerHub, DealerMetric, DealerAction, DealerFunnel, DealerLeadsTable, DealerInventoryCard } from '../../components/dealer';
import '../../styles/dealer.css';

// Mock data
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

const MOCK_LEADS = [
  { id: 1, name: 'James Mwangi', phone: '+254 712 345 678', vehicle: 'Toyota Land Cruiser V8', status: 'new', value: 'KES 18.5M' },
  { id: 2, name: 'Sarah Ochieng', phone: '+254 723 456 789', vehicle: 'Mercedes GLE 350d', status: 'contacted', value: 'KES 12.5M' },
  { id: 3, name: 'Michael Kimani', phone: '+254 734 567 890', vehicle: 'BMW X5 xDrive30d', status: 'negotiating', value: 'KES 7.8M' },
  { id: 4, name: 'Grace Wanjiku', phone: '+254 745 678 901', vehicle: 'Porsche Cayenne S', status: 'closed-won', value: 'KES 15.8M' },
  { id: 5, name: 'David Otieno', phone: '+254 756 789 012', vehicle: 'Range Rover Autobiography', status: 'new', value: 'KES 22M' },
];

const MOCK_INVENTORY = [
  { id: 1, title: 'Toyota Land Cruiser V8', price: 18500000, status: 'active', views: 2450, inquiries: 12, days: 14, featured: true, image: 'https://images.pexels.com/photos/3593922/pexels-photo-3593922.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { id: 2, title: 'Mercedes-AMG G63', price: 22000000, status: 'active', views: 1890, inquiries: 8, days: 7, featured: true, image: 'https://images.pexels.com/photos/120049/pexels-photo-120049.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { id: 3, title: 'Nissan Patrol Safari', price: 7800000, status: 'pending', views: 890, inquiries: 4, days: 21, featured: false, image: 'https://images.pexels.com/photos/3311574/pexels-photo-3311574.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { id: 4, title: 'BMW X5 M Competition', price: 12400000, status: 'active', views: 1650, inquiries: 6, days: 3, featured: false, image: 'https://images.pexels.com/photos/1687325/pexels-photo-1687325.jpeg?auto=compress&cs=tinysrgb&w=800' },
];

const FUNNEL_STAGES = [
  { type: 'new', label: 'New Leads', count: 24 },
  { type: 'contacted', label: 'Contacted', count: 18 },
  { type: 'negotiating', label: 'Negotiating', count: 12 },
  { type: 'closed', label: 'Closed Won', count: 8 },
];

const QUICK_ACTIONS = [
  { icon: <Plus size={24} />, label: 'Add Listing', description: 'Post a new vehicle', to: '/dealer/add-car', variant: 'gold' },
  { icon: <BarChart3 size={24} />, label: 'Analytics', description: 'View performance', to: '/dealer/analytics' },
  { icon: <MessageSquare size={24} />, label: 'Inquiries', description: '89 total received', to: '/dealer/leads' },
  { icon: <DollarSign size={24} />, label: 'Earnings', description: 'View transactions', to: '/dealer/finance' },
  { icon: <Car size={24} />, label: 'Inventory', description: '12 active listings', to: '/dealer/inventory' },
  { icon: <Settings size={24} />, label: 'Settings', description: 'Manage account', to: '/dealer/settings' },
];

const METRICS = [
  { icon: '👁️', label: 'Total Views', value: '12,450', trend: 15, accent: 'views' },
  { icon: '💬', label: 'Inquiries', value: '89', trend: 8, accent: 'leads' },
  { icon: '🎯', label: 'Conversion Rate', value: '24%', trend: 3, accent: 'sales' },
  { icon: '⭐', label: 'Avg Rating', value: '4.8/5', accent: 'rating' },
];

export default function DealerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [summary, setSummary] = useState(null);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

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
      toast.success('Listing deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // Pending approval state
  if (!user?.approved && user?.role === 'dealer') {
    return (
      <DealerHub>
        <div style={{ 
          maxWidth: 600, 
          margin: '80px auto', 
          textAlign: 'center',
          padding: 40,
          background: 'var(--dealer-surface)',
          borderRadius: 'var(--dealer-radius-xl)',
          border: '1px solid var(--dealer-border)',
        }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>⏳</div>
          <h2 style={{ marginBottom: 12, color: 'var(--dealer-text)' }}>Awaiting Admin Approval</h2>
          <p style={{ color: 'var(--dealer-text-muted)', marginBottom: 24 }}>
            Your dealer account is pending approval. We'll notify you once approved.
          </p>
          <p style={{ color: 'var(--dealer-text-dim)', fontSize: 13 }}>
            Need help? <Link to="/support" style={{ color: 'var(--dealer-gold)' }}>Contact support</Link>
          </p>
        </div>
      </DealerHub>
    );
  }

  const stats = MOCK_STATS;

  return (
    <DealerHub user={user}>
      {/* Welcome Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 32,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <h1 style={{ 
            fontSize: 'var(--dealer-text-2xl)', 
            fontWeight: 800, 
            color: 'var(--dealer-text)',
            margin: 0,
          }}>
            Welcome back, {user?.businessName || user?.name || 'Dealer'} 👋
          </h1>
          <p style={{ 
            color: 'var(--dealer-text-muted)', 
            margin: '8px 0 0',
            fontSize: 'var(--dealer-text-sm)',
          }}>
            {stats.activeListings} active listings · {stats.totalViews.toLocaleString()} total views this month
          </p>
        </div>
        <Link to="/dealer/add-car" className="dealer-btn dealer-btn--primary">
          <Plus size={18} />
          Add Listing
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="dealer-metrics">
        {METRICS.map((metric, i) => (
          <DealerMetric
            key={i}
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
            trend={metric.trend}
            accent={metric.accent}
          />
        ))}
        <DealerMetric
          icon="💰"
          label="Total Revenue"
          value="KES 12.45M"
          trend={22}
          accent="revenue"
          trendLabel="vs last month"
        />
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ 
          fontSize: 'var(--dealer-text-lg)', 
          fontWeight: 700, 
          color: 'var(--dealer-text)',
          marginBottom: 16,
        }}>
          Quick Actions
        </h2>
        <div className="dealer-actions">
          {QUICK_ACTIONS.map((action, i) => (
            <DealerAction
              key={i}
              icon={action.icon}
              label={action.label}
              description={action.description}
              to={action.to}
              variant={action.variant}
            />
          ))}
        </div>
      </div>

      {/* Lead Funnel */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ 
          fontSize: 'var(--dealer-text-lg)', 
          fontWeight: 700, 
          color: 'var(--dealer-text)',
          marginBottom: 16,
        }}>
          Sales Pipeline
        </h2>
        <DealerFunnel stages={FUNNEL_STAGES} />
      </div>

      {/* Two Column Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        marginBottom: 32,
      }}>
        {/* Recent Leads */}
        <DealerLeadsTable 
          leads={MOCK_LEADS.slice(0, 5)}
          onView={(lead) => toast.info(`Viewing lead: ${lead.name}`)}
          onContact={(lead) => toast.info(`Contacting: ${lead.name}`)}
          onConvert={(lead) => toast.success(`Converting: ${lead.name}`)}
        />

        {/* Top Performing */}
        <div className="dealer-chart">
          <div className="dealer-chart__header">
            <h3 className="dealer-chart__title">Top Performers</h3>
            <span className="dealer-chart__period">This Month</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MOCK_INVENTORY.slice(0, 4).map((car) => (
              <div key={car.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                background: 'var(--dealer-elevated)',
                borderRadius: 'var(--dealer-radius-md)',
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--dealer-radius-sm)',
                  background: 'var(--dealer-card)',
                  overflow: 'hidden',
                }}>
                  <img src={car.image} alt={car.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--dealer-text)', fontSize: 13, marginBottom: 2 }}>
                    {car.title}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--dealer-text-muted)' }}>
                    <span>👁️ {car.views.toLocaleString()}</span>
                    <span>💬 {car.inquiries}</span>
                  </div>
                </div>
                <div style={{ 
                  fontWeight: 700, 
                  color: 'var(--dealer-gold)',
                  fontSize: 13,
                }}>
                  KES {(car.price / 1000000).toFixed(1)}M
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Inventory */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <h2 style={{ 
            fontSize: 'var(--dealer-text-lg)', 
            fontWeight: 700, 
            color: 'var(--dealer-text)',
            margin: 0,
          }}>
            Featured Inventory
          </h2>
          <Link to="/dealer/inventory" className="dealer-btn dealer-btn--ghost dealer-btn--sm">
            View All <ChevronRight size={14} />
          </Link>
        </div>
        <div className="dealer-inventory">
          {MOCK_INVENTORY.map((car) => (
            <DealerInventoryCard
              key={car.id}
              car={car}
              onEdit={() => toast.info(`Edit: ${car.title}`)}
              onPromote={() => toast.success(`Promoting: ${car.title}`)}
              onDelete={() => handleDelete(car.id)}
            />
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(212, 196, 168, 0.08), rgba(168, 85, 247, 0.05))',
        border: '1px solid var(--dealer-border-gold)',
        borderRadius: 'var(--dealer-radius-xl)',
        padding: 24,
        marginBottom: 32,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--dealer-radius-md)',
            background: 'linear-gradient(135deg, var(--dealer-gold), var(--dealer-gold-dark))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}>
            🤖
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--dealer-text-lg)', fontWeight: 700, color: 'var(--dealer-text)' }}>
              AI Dealer Insights
            </h3>
            <p style={{ margin: 0, fontSize: 'var(--dealer-text-xs)', color: 'var(--dealer-text-muted)' }}>
              Powered by KAYAD Analytics
            </p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={{
            padding: 16,
            background: 'var(--dealer-surface)',
            borderRadius: 'var(--dealer-radius-md)',
            border: '1px solid var(--dealer-border)',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>💡</div>
            <div style={{ fontWeight: 600, color: 'var(--dealer-text)', fontSize: 13, marginBottom: 4 }}>
              Price Your SUVs Competitively
            </div>
            <div style={{ fontSize: 12, color: 'var(--dealer-text-muted)', lineHeight: 1.4 }}>
              Similar Toyota Land Cruisers are priced 5% lower in your area. Consider adjusting your pricing strategy.
            </div>
          </div>
          <div style={{
            padding: 16,
            background: 'var(--dealer-surface)',
            borderRadius: 'var(--dealer-radius-md)',
            border: '1px solid var(--dealer-border)',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📸</div>
            <div style={{ fontWeight: 600, color: 'var(--dealer-text)', fontSize: 13, marginBottom: 4 }}>
              Add More Photos
            </div>
            <div style={{ fontSize: 12, color: 'var(--dealer-text-muted)', lineHeight: 1.4 }}>
              Listings with 10+ photos get 3x more inquiries. Your Nissan Patrol has only 3 photos.
            </div>
          </div>
          <div style={{
            padding: 16,
            background: 'var(--dealer-surface)',
            borderRadius: 'var(--dealer-radius-md)',
            border: '1px solid var(--dealer-border)',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⚡</div>
            <div style={{ fontWeight: 600, color: 'var(--dealer-text)', fontSize: 13, marginBottom: 4 }}>
              Respond Faster
            </div>
            <div style={{ fontSize: 12, color: 'var(--dealer-text-muted)', lineHeight: 1.4 }}>
              68% of buyers contact multiple dealers. Your response rate is 94% — great job!
            </div>
          </div>
        </div>
      </div>
    </DealerHub>
  );
}
