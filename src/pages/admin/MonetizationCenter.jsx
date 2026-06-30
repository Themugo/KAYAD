import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, carsAPI, partnersAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { DollarSign, Car, Users, Star, Megaphone, Settings, TrendingUp, Crown, Shield } from 'lucide-react';

export default function MonetizationCenter() {
  const { toast } = useToast();
  const [config, setConfig] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroCarIds, setHeroCarIds] = useState('');
  const [sponsorCarIds, setSponsorCarIds] = useState('');
  const [sponsorDealers, setSponsorDealers] = useState('');
  const [featuredDealerIds, setFeaturedDealerIds] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      adminAPI.getConfig().catch(() => ({})),
      carsAPI.list({ limit: 50, sort: '-createdAt' }).catch(() => ({ cars: [] })),
      partnersAPI.list().catch(() => []),
    ]).then(([cfg, cars, pts]) => {
      setConfig(cfg);
      setFeatured(cars.cars || cars.data || []);
      setPartners(pts);
      setHeroCarIds((cfg.heroCarIds || []).join(', '));
      setSponsorCarIds((cfg.sponsorCarIds || []).join(', '));
      setSponsorDealers((cfg.sponsorDealers || []).join(', '));
      setFeaturedDealerIds((cfg.featuredDealerIds || []).join(', '));
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const heroIds = heroCarIds.split(',').map(s => s.trim()).filter(Boolean);
      const sponsorIds = sponsorCarIds.split(',').map(s => s.trim()).filter(Boolean);
      const dealerIds = sponsorDealers.split(',').map(s => s.trim()).filter(Boolean);
      const featuredDealers = featuredDealerIds.split(',').map(s => s.trim()).filter(Boolean);
      await adminAPI.updateConfig({ ...config, heroCarIds: heroIds, sponsorCarIds: sponsorIds, sponsorDealers: dealerIds, featuredDealerIds: featuredDealers });
      toast('Monetization settings saved', 'success');
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="admin-loading"><div className="spinner" /></div>;

  const promoted = featured.filter(c => c.isPromoted);

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.5rem,2.5vw,2rem)', color: '#fff', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <DollarSign size={22} style={{ color: 'var(--gold)' }} /> Monetization Center
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 }}>Manage featured content, sponsorships, and homepage promotions</p>
      </div>

      <div className="grid gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        <div className="rounded-xl border p-6" style={{ background: 'var(--card)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Star size={16} style={{ color: 'var(--gold)' }} />
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#fff' }}>Hero Vehicles</h3>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px' }}>Vehicle IDs shown in homepage hero slider (comma-separated)</p>
          <input value={heroCarIds} onChange={e => setHeroCarIds(e.target.value)} placeholder="carId1, carId2, carId3" className="monetize-input" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }} />
        </div>

        <div className="rounded-xl border p-6" style={{ background: 'var(--card)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Crown size={16} style={{ color: 'var(--gold)' }} />
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#fff' }}>Sponsored Vehicles</h3>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px' }}>Vehicle IDs marked as sponsored (comma-separated)</p>
          <input value={sponsorCarIds} onChange={e => setSponsorCarIds(e.target.value)} placeholder="carId1, carId2" className="monetize-input" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }} />
        </div>

        <div className="rounded-xl border p-6" style={{ background: 'var(--card)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Shield size={16} style={{ color: 'var(--gold)' }} />
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#fff' }}>Sponsored Dealers</h3>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px' }}>Dealer IDs to show as sponsored (comma-separated)</p>
          <input value={sponsorDealers} onChange={e => setSponsorDealers(e.target.value)} placeholder="dealerId1, dealerId2" className="monetize-input" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }} />
        </div>

        <div className="rounded-xl border p-6" style={{ background: 'var(--card)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Crown size={16} style={{ color: 'var(--gold)' }} />
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#fff' }}>Featured Dealers</h3>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px' }}>Dealer IDs shown as #1 in Top-Rated Dealers section (comma-separated, ordered by priority)</p>
          <input value={featuredDealerIds} onChange={e => setFeaturedDealerIds(e.target.value)} placeholder="dealerId1, dealerId2" className="monetize-input" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
        <button onClick={handleSaveConfig} disabled={saving} className="btn btn-gold" style={{ padding: '10px 28px', borderRadius: 10, fontWeight: 700 }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', marginTop: 32 }}>
        <Link to="/admin/ads" className="no-underline rounded-xl border p-6 block transition-all hover:border-gold/30" style={{ background: 'var(--card)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Megaphone size={16} style={{ color: 'var(--gold)' }} />
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#fff' }}>Homepage Ads</h3>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Manage banner ads, sponsored placements, and promotional campaigns →</p>
        </Link>

        <Link to="/admin/settings" className="no-underline rounded-xl border p-6 block transition-all hover:border-gold/30" style={{ background: 'var(--card)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Settings size={16} style={{ color: 'var(--gold)' }} />
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#fff' }}>Platform Config</h3>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>System settings, branding, and global platform configuration →</p>
        </Link>

        <Link to="/admin/cars" className="no-underline rounded-xl border p-6 block transition-all hover:border-gold/30" style={{ background: 'var(--card)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Car size={16} style={{ color: 'var(--gold)' }} />
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#fff' }}>Featured Vehicles</h3>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Manage all vehicle listings and toggle featured status →</p>
        </Link>
      </div>

      {promoted.length > 0 && (
        <div className="rounded-xl border p-6" style={{ background: 'var(--card)', borderColor: 'rgba(255,255,255,0.06)', marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={16} style={{ color: 'var(--gold)' }} />
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#fff' }}>Currently Featured ({promoted.length})</h3>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', display: 'grid' }}>
            {promoted.slice(0, 12).map(car => (
              <div key={car._id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-10 h-8 rounded overflow-hidden flex-shrink-0">
                  <img src={car.images?.[0] || car.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-white font-medium truncate">{car.title}</div>
                  <div className="text-[9px] text-gold">KES {(car.price || 0).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
