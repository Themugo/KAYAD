import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authAPI, carsAPI } from '../api/api';
import { User, MapPin, Phone, Shield, Edit2, Camera } from 'lucide-react';
import BackButton from '../components/BackButton';

export default function PrivateSellerProfile() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    location: '',
    city: '',
    bio: '',
  });

  const fetchListings = useCallback(async () => {
    setListingsLoading(true);
    setListingsError(null);
    try {
      const data = await carsAPI.list({ seller: user?._id, limit: 10 });
      setListings(data.cars || data.data || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to fetch listings:', err);
      setListingsError('Could not load your listings.');
    } finally {
      setListingsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      location: user.location || '',
      city: user.city || '',
      bio: user.bio || '',
    });
    fetchListings();
  }, [user, fetchListings]);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const { user: updated } = await authAPI.updateProfile(form);
      if (updated) setUser(updated);
      toast('Profile updated successfully', 'success');
      setEditMode(false);
    } catch (_err) {
      toast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="page loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 1000 }}>
        <div style={{ marginBottom: 32 }}>
          <BackButton fallback="/seller" />
          <div className="section-eyebrow">Private Seller Profile</div>
          <h2>Seller Profile</h2>
        </div>

        {/* Profile Card */}
        <div className="card" style={{ padding: 32, marginBottom: 24 }}>
          <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border-2 border-gold/30 mb-4">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User size={48} className="text-gold" />
                )}
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-gold rounded-full flex items-center justify-center text-black hover:bg-gold/90 transition-colors">
                  <Camera size={14} />
                </button>
              </div>
              <div className="text-center">
                <h3 className="font-display font-bold text-white text-lg mb-1">{user?.name}</h3>
                <div className="flex items-center justify-center gap-1 text-white/40 text-xs">
                  <Shield size={12} />
                  <span>Verified Seller</span>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-white text-xl">Profile Information</h3>
                {!editMode ? (
                  <button onClick={() => setEditMode(true)} className="btn btn-outline text-sm flex items-center gap-2">
                    <Edit2 size={14} /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditMode(false)} className="btn btn-outline text-sm">Cancel</button>
                    <button onClick={handleSave} disabled={loading} className="btn btn-gold text-sm">
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {editMode ? (
                <div className="grid gap-4">
                  <div className="input-group">
                    <label className="input-label">Full Name</label>
                    <input className="input" value={form.name} onChange={e => update('name', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="input-group">
                      <label className="input-label">Phone</label>
                      <input className="input" value={form.phone} onChange={e => update('phone', e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">City</label>
                      <input className="input" value={form.city} onChange={e => update('city', e.target.value)} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Location</label>
                    <input className="input" value={form.location} onChange={e => update('location', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Bio</label>
                    <textarea className="input" rows={3} value={form.bio} onChange={e => update('bio', e.target.value)} placeholder="Tell buyers about yourself..." />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User size={18} className="text-gold flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white/40 text-xs mb-1">Name</p>
                      <p className="text-white font-medium">{user?.name || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="text-gold flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white/40 text-xs mb-1">Phone</p>
                      <p className="text-white font-medium">{user?.phone || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-gold flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white/40 text-xs mb-1">Location</p>
                      <p className="text-white font-medium">{user?.city && user?.location ? `${user?.city}, ${user?.location}` : 'Not set'}</p>
                    </div>
                  </div>
                  {user?.bio && (
                    <div className="flex items-start gap-3">
                      <User size={18} className="text-gold flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-white/40 text-xs mb-1">Bio</p>
                        <p className="text-white font-medium">{user?.bio}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
          <div className="card p-6 text-center">
            <p className="font-display font-black text-gold text-3xl mb-1">{listings.length}</p>
            <p className="text-white/40 text-xs uppercase tracking-wider">Listings</p>
          </div>
          <div className="card p-6 text-center">
            <p className="font-display font-black text-gold text-3xl mb-1">{listings.filter(l => l.status === 'sold').length}</p>
            <p className="text-white/40 text-xs uppercase tracking-wider">Sold</p>
          </div>
          <div className="card p-6 text-center">
            <p className="font-display font-black text-gold text-3xl mb-1">{listings.reduce((sum, l) => sum + (l.views || 0), 0)}</p>
            <p className="text-white/40 text-xs uppercase tracking-wider">Views</p>
          </div>
          <div className="card p-6 text-center">
            <p className="font-display font-black text-gold text-3xl mb-1">4.8</p>
            <p className="text-white/40 text-xs uppercase tracking-wider">Rating</p>
          </div>
        </div>

        {/* Recent Listings */}
        <div>
          <div className="flex items-end justify-between mb-4">
            <h3 className="font-display font-bold text-white text-xl">Recent Listings</h3>
            <button onClick={() => navigate('/seller')} className="text-gold text-sm font-bold">View All →</button>
          </div>
          {listingsLoading ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <div className="skeleton" style={{ aspectRatio: '16/9' }} />
                  <div className="p-4">
                    <div className="skeleton" style={{ height: 16, width: '70%', marginBottom: 8, borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 14, width: '40%', borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : listingsError ? (
            <div className="card p-12 text-center">
              <p className="text-white/50 text-sm mb-4">{listingsError}</p>
              <button onClick={fetchListings} className="btn btn-gold">Retry</button>
            </div>
          ) : listings.length > 0 ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
              {listings.slice(0, 4).map(car => (
                <div key={car._id} className="card overflow-hidden group cursor-pointer" onClick={() => navigate(`/car/${car._id}`)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/car/${car._id}`); } }}
                  role="button" tabIndex={0} aria-label={`View ${car.title}`}>
                  <div className="aspect-video overflow-hidden">
                    <img src={car.images?.[0] || car.coverImage} alt={car.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-4">
                    <h4 className="font-display font-bold text-white text-sm mb-1 truncate">{car.title}</h4>
                    <p className="text-gold font-bold text-sm">KES {(car.price || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <p className="text-white/50 text-sm mb-4">No listings yet</p>
              <button onClick={() => navigate('/sell')} className="btn btn-gold">List Your First Vehicle</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
