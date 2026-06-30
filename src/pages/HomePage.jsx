import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CartyGrid from '../components/CartyGrid';
import AdvertisementBanner from '../components/AdvertisementBanner';
import { useState, useEffect } from 'react';
import { carsAPI, enableDemoMode } from '../api/api';
import { useToast } from '../context/ToastContext';
import usePageMeta from '../hooks/usePageMeta';
import useMediaQuery from '../hooks/useMediaQuery';
import { WebSiteStructuredData, BreadcrumbStructuredData } from '../components/SeoStructuredData';
import HomeAnimatedStat from './home/components/HomeAnimatedStat';
import HomeHero from './home/components/HomeHero';
import HomeLiveAuctions from './home/components/HomeLiveAuctions';
import HomeFeaturePillars from './home/components/HomeFeaturePillars';
import HomeCtaSection from './home/components/HomeCtaSection';
import FeaturedDealers from './home/components/FeaturedDealers';
import VehicleCategories from './home/components/VehicleCategories';
import Testimonials from './home/components/Testimonials';
import Partners from './home/components/Partners';
import PrivateSellerSection from './home/components/PrivateSellerSection';
import { Shield, Lock, MessageCircle } from 'lucide-react';

export default function HomePage() {
  usePageMeta('Home', 'Buy, sell and bid on premium cars in Kenya. Live auctions with M-Pesa. Secure escrow payments.');
  const { isAuth, user } = useAuth();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [featured, setFeatured] = useState([]);
  const [recent, setRecent] = useState([]);
  const [liveAuctions, setLiveAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [featuredDealers, setFeaturedDealers] = useState([]);
  const [topSellers, setTopSellers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const fetchCars = async () => {
      try {
        const data = await carsAPI.list({ page: 1, limit: 20, sort: '-createdAt' });
        if (cancelled) return;
        let all = data.cars || data.data || [];

        if (all.length === 0) {
          enableDemoMode();
          const retry = await carsAPI.list({ page: 1, limit: 20, sort: '-createdAt' });
          if (cancelled) return;
          all = retry.cars || retry.data || [];
        }

        const now = Date.now();
        const live = all.filter(c => {
          const s = c.auctionStartTime ? new Date(c.auctionStartTime).getTime() : 0;
          const e = c.auctionEnd ? new Date(c.auctionEnd).getTime() : 0;
          return s > 0 && e > 0 && s <= now && e > now;
        });

        const upcoming = all.filter(c => {
          const s = c.auctionStartTime ? new Date(c.auctionStartTime).getTime() : 0;
          return s > now;
        }).sort((a, b) => new Date(a.auctionStartTime) - new Date(b.auctionStartTime));

        const nonAuction = all.filter(c => {
          const s = c.auctionStartTime ? new Date(c.auctionStartTime).getTime() : 0;
          const e = c.auctionEnd ? new Date(c.auctionEnd).getTime() : 0;
          const isLive = s > 0 && e > 0 && s <= now && e > now;
          return !isLive && !(s > now);
        });

        setLiveAuctions(live.slice(0, 4));
        setFeatured([...nonAuction.filter(c => c.isPromoted), ...nonAuction.filter(c => !c.isPromoted)].slice(0, 4));
        setRecent(nonAuction.slice(0, 8));
        setStats({
          totalCars: all.length,
          liveAuctions: live.length,
          upcoming: upcoming.length,
          buyNow: nonAuction.filter(c => c.allowBuy !== false).length,
          brands: [...new Set(all.map(c => c.brand))].length,
        });

        const dealerMap = new Map();
        all.forEach(c => {
          const d = c.dealer || c.seller;
          if (d) {
            const id = d._id || d;
            if (!dealerMap.has(id)) {
              dealerMap.set(id, {
                _id: id,
                name: d.name || d.businessName || 'Dealer',
                logo: d.logo || d.avatar || null,
                carCount: 0,
                rating: d.rating || Math.round((3 + Math.random() * 2) * 10) / 10,
                location: d.location || 'Nairobi',
                joinedAt: d.createdAt || new Date().toISOString(),
              });
            }
            dealerMap.get(id).carCount++;
          }
        });
        setFeaturedDealers(Array.from(dealerMap.values()));
        setTopSellers(Array.from(dealerMap.values()).sort((a, b) => b.carCount - a.carCount).slice(0, 8));
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch vehicles:', err);
          toast('Could not load vehicles. Check your connection.', 'warning');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCars();
    return () => { cancelled = true; };
  }, []);

  const displayCars = loading ? [] : (featured.length > 0 ? featured : recent);
  const liveCount = stats?.liveAuctions || liveAuctions.length || 0;

  return (
    <>
      <WebSiteStructuredData />
      <BreadcrumbStructuredData items={[{ name: 'Home', url: '/' }]} />
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        {/* 1. Hero */}
        <HomeHero liveCount={liveCount} isAuth={isAuth} user={user} />

        {/* 2. Trust Bar — stats + trust signals merged */}
        <section className="border-y border-white/[0.04]">
          <div className="max-w-[1400px] mx-auto px-7 py-6">
            <div className="grid gap-px home-stats-grid mb-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <HomeAnimatedStat label="Cars Listed" value={stats ? `${stats.totalCars}` : '-'} />
              <HomeAnimatedStat label="Brands" value={stats ? `${stats.brands}` : '-'} />
              <HomeAnimatedStat label="Live Auctions" value={stats ? `${stats.liveAuctions}` : '-'} />
              <HomeAnimatedStat label="Buy Now" value={stats ? `${stats.buyNow}` : '-'} />
            </div>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <Shield size={20} className="text-[#22C55E]" />
                <div>
                  <div className="text-sm font-semibold text-white">Escrow Protected</div>
                  <div className="text-xs text-white/40">Funds held until delivery confirmed</div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(212,196,168,0.06)', border: '1px solid rgba(212,196,168,0.15)' }}>
                <Lock size={20} className="text-gold" />
                <div>
                  <div className="text-sm font-semibold text-white">Verified Dealers</div>
                  <div className="text-xs text-white/40">KRA-vetted and buyer-rated</div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
                <MessageCircle size={20} className="text-[#60A5FA]" />
                <div>
                  <div className="text-sm font-semibold text-white">24/7 Support</div>
                  <div className="text-xs text-white/40">Dedicated dispute resolution team</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Sponsored Content */}
        <section className="section-spacing">
          <div className="max-w-[1400px] mx-auto px-7">
            <AdvertisementBanner
              type="image"
              imageUrl="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1400&q=80"
              position="horizontal"
              size="medium"
              linkUrl="/showroom"
              altText="Featured Dealers"
            />
          </div>
        </section>

        {/* 4. Featured Inventory — Premium Showcase */}
        <section className="section-spacing">
          <div className="max-w-[1400px] mx-auto px-7">
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {featured.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
                      Featured
                    </span>
                  )}
                  <span className="text-[8px] text-white/20 font-semibold tracking-[0.14em] uppercase">Premium Collection</span>
                </div>
                <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
                  Elite <span className="text-gold">Selection</span>
                </h2>
              </div>
              <Link to="/showroom" className="section-link">View All →</Link>
            </div>

            {loading ? (
              <div className="grid gap-4 md:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-[4/3] rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            ) : displayCars.length > 0 ? (
              <div className="grid gap-5 md:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {displayCars.map(car => (
                  <div key={car._id} className="premium-card">
                    <CartyGrid car={car} isMobile={isMobile} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-white/20 text-sm">
                <p className="mb-3">No vehicles in the premium collection yet</p>
                <Link to="/showroom" className="text-gold no-underline font-semibold">Browse the gallery →</Link>
              </div>
            )}
          </div>
        </section>

        {/* 5. Live Auctions */}
        {!loading && <HomeLiveAuctions cars={liveAuctions} isMobile={isMobile} />}

        {/* 6. Featured Dealers */}
        <FeaturedDealers dealers={featuredDealers.slice(0, 4)} />

        {/* 7. Private Seller Section */}
        <PrivateSellerSection />

        {/* 8. Vehicle Categories */}
        <VehicleCategories />

        {/* 9. Testimonials */}
        <Testimonials />

        {/* 10. Partners */}
        <Partners />

        {/* 11. Feature Pillars & CTA */}
        <HomeFeaturePillars />
        <HomeCtaSection isAuth={isAuth} />
      </div>
    </>
  );
}
