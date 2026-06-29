import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { carsAPI, escrowAPI } from '../api/api';
import { Car, TrendingUp, Users, Shield, Clock, DollarSign, Plus, Eye, MessageCircle } from 'lucide-react';
import CartyGrid from '../components/CartyGrid';
import BackButton from '../components/BackButton';

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
      toast('Could not load dashboard data', 'error');
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

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 1200 }}>
        <div style={{ marginBottom: 32 }}>
          <BackButton fallback="/dashboard" />
          <div className="section-eyebrow">Private Seller Hub</div>
          <h2>Welcome, {user?.name?.split(' ')[0]}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            Manage your vehicle listings and track sales
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-8">
          <Link
            to="/sell"
            className="card p-6 flex items-center gap-4 hover:border-gold/30 transition-all no-underline"
          >
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
              <Plus size={24} className="text-gold" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base mb-1">List a Vehicle</h3>
              <p className="text-white/50 text-xs">Create a new listing</p>
            </div>
          </Link>

          <Link
            to="/seller/listings"
            className="card p-6 flex items-center gap-4 hover:border-gold/30 transition-all no-underline"
          >
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
              <Car size={24} className="text-gold" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base mb-1">My Listings</h3>
              <p className="text-white/50 text-xs">{stats?.activeListings || 0} active listings</p>
            </div>
          </Link>

          <Link
            to="/seller/escrows"
            className="card p-6 flex items-center gap-4 hover:border-gold/30 transition-all no-underline"
          >
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
              <Shield size={24} className="text-gold" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base mb-1">Escrow</h3>
              <p className="text-white/50 text-xs">{stats?.pendingEscrows || 0} pending transactions</p>
            </div>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-2">
              <Car size={16} className="text-gold" />
              <span className="text-white/40 text-xs uppercase tracking-wider">Active Listings</span>
            </div>
            <p className="font-display font-black text-white text-3xl">
              {stats?.activeListings || 0}
            </p>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-gold" />
              <span className="text-white/40 text-xs uppercase tracking-wider">Sold</span>
            </div>
            <p className="font-display font-black text-white text-3xl">
              {stats?.soldListings || 0}
            </p>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={16} className="text-gold" />
              <span className="text-white/40 text-xs uppercase tracking-wider">Total Views</span>
            </div>
            <p className="font-display font-black text-white text-3xl">
              {stats?.totalViews || 0}
            </p>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={16} className="text-gold" />
              <span className="text-white/40 text-xs uppercase tracking-wider">Inquiries</span>
            </div>
            <p className="font-display font-black text-white text-3xl">
              {stats?.totalInquiries || 0}
            </p>
          </div>
        </div>

        {/* Recent Listings */}
        <div style={{ marginBottom: 32 }}>
          <div className="flex items-end justify-between mb-4">
            <h3 className="font-display font-bold text-white text-xl">Recent Listings</h3>
            <Link to="/seller/listings" className="text-gold text-sm font-bold no-underline">View All →</Link>
          </div>
          {listings.length > 0 ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {listings.slice(0, 4).map(car => (
                <CartyGrid key={car._id} car={car} isMobile={false} />
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <Car size={48} className="text-white/20 mx-auto mb-4" />
              <h3 className="font-display font-bold text-white text-lg mb-2">No Listings Yet</h3>
              <p className="text-white/50 text-sm mb-6">Start selling by listing your first vehicle</p>
              <Link to="/sell" className="btn btn-gold">List Your First Vehicle</Link>
            </div>
          )}
        </div>

        {/* Recent Escrow Transactions */}
        <div>
          <div className="flex items-end justify-between mb-4">
            <h3 className="font-display font-bold text-white text-xl">Escrow Transactions</h3>
            <Link to="/seller/escrows" className="text-gold text-sm font-bold no-underline">View All →</Link>
          </div>
          {escrows.length > 0 ? (
            <div className="card">
              {escrows.slice(0, 3).map(escrow => (
                <div key={escrow._id} className="p-4 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display font-bold text-white text-sm mb-1">
                        {escrow.car?.title || escrow.carName || 'Vehicle'}
                      </p>
                      <p className="text-white/50 text-xs">
                        {escrow.buyer?.name || escrow.buyerName || 'Buyer'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-gold text-sm">
                        KES {(escrow.amount || 0).toLocaleString()}
                      </p>
                      <p className="text-white/40 text-xs capitalize">{escrow.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <Shield size={48} className="text-white/20 mx-auto mb-4" />
              <h3 className="font-display font-bold text-white text-lg mb-2">No Transactions Yet</h3>
              <p className="text-white/50 text-sm">Your escrow transactions will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
