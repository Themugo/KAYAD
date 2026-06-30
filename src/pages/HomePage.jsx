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
import HomeLiveTicker from './home/components/HomeLiveTicker';
import HomeHero from './home/components/HomeHero';
import HomeLiveAuctions from './home/components/HomeLiveAuctions';
import HomeFeaturePillars from './home/components/HomeFeaturePillars';
import HomeCtaSection from './home/components/HomeCtaSection';
import FeaturedDealers from './home/components/FeaturedDealers';
import VehicleCategories from './home/components/VehicleCategories';
import Testimonials from './home/components/Testimonials';
import Partners from './home/components/Partners';

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
        // Optimized: Fetch only what we need (20 cars instead of 50)
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

        // Extract featured dealers from car data
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
        // Derive top sellers from dealers sorted by car count
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

        {/* 2. Sponsor Banner Area */}
        <div className="max-w-[1400px] mx-auto px-7 py-6">
          <AdvertisementBanner
            type="image"
            imageUrl="https://via.placeholder.com/1400x120?text=Sponsor+Banner"
            position="horizontal"
            size="large"
            linkUrl="/advertising"
            altText="Sponsor Banner"
          />
        </div>

        <HomeLiveTicker count={liveCount} />

        <section className="border-t border-b border-white/[0.04]">
          <div className="max-w-[1400px] mx-auto px-7">
            <div className="grid gap-px home-stats-grid" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <HomeAnimatedStat label="Cars Listed" value={stats ? `${stats.totalCars}` : '-'} />
              <HomeAnimatedStat label="Brands" value={stats ? `${stats.brands}` : '-'} />
              <HomeAnimatedStat label="Live Auctions" value={stats ? `${stats.liveAuctions}` : '-'} />
              <HomeAnimatedStat label="Buy Now" value={stats ? `${stats.buyNow}` : '-'} />
            </div>
          </div>
        </section>

        {/* 3. Featured Inventory */}
        <section className="section-spacing">
          <div className="max-w-[1400px] mx-auto px-7">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {featured.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
                      Featured
                    </span>
                  )}
                  <span className="text-[8px] text-white/20 font-semibold tracking-[0.14em] uppercase">From The Gallery</span>
                </div>
                <h2 className="font-display font-black italic text-[clamp(1.1rem,2vw,1.5rem)] text-white leading-none m-0">
                  Elite <span className="text-gold">Selection</span>
                </h2>
              </div>
              <Link to="/showroom" className="text-[11px] font-bold no-underline tracking-[0.06em] flex items-center gap-1 transition-colors duration-200 hover:text-gold" style={{ color: 'rgba(212,196,168,0.7)' }}
              >Full Gallery →</Link>
            </div>

            {loading ? (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-[16/11] rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            ) : displayCars.length > 0 ? (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {displayCars.map(car => <CartyGrid key={car._id} car={car} isMobile={isMobile} />)}
              </div>
            ) : (
              <div className="text-center py-12 text-white/20 text-xs">
                No vehicles yet — <Link to="/showroom" className="text-gold no-underline">browse the gallery</Link>
              </div>
            )}
          </div>
        </section>

        {/* 4. Live Auctions */}
        {!loading && <HomeLiveAuctions cars={liveAuctions} isMobile={isMobile} />}

        {/* 5. Trust Signals */}
        <section className="section-spacing">
          <div className="max-w-[1400px] mx-auto px-7">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '32px' }}>🔒</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Escrow Protected</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Your payment is held securely until you receive your vehicle</div>
                </div>
              </div>
              <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.2)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '32px' }}>✓</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Verified Dealers</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>All dealers undergo rigorous verification before listing</div>
                </div>
              </div>
              <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '32px' }}>💬</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>24/7 Support</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Our team is here to help with any questions or disputes</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Featured Dealers */}
        <FeaturedDealers dealers={featuredDealers.slice(0, 4)} />

        {/* 7. Vehicle Categories */}
        <VehicleCategories />

        {/* 8. Testimonials */}
        <Testimonials />

        {/* 9. Partners */}
        <Partners />

        {/* 10. Feature Pillars & CTA */}
        <HomeFeaturePillars />
        <HomeCtaSection isAuth={isAuth} />
      </div>
    </>
  );
}
