import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CartyGrid from '../components/CartyGrid';
import { useState, useEffect } from 'react';
import { carsAPI, enableDemoMode } from '../api/api';
import { useToast } from '../context/ToastContext';
import usePageMeta from '../hooks/usePageMeta';
import useMediaQuery from '../hooks/useMediaQuery';
import { WebSiteStructuredData, BreadcrumbStructuredData } from '../components/SeoStructuredData';
import HomeHero from './home/components/HomeHero';
import MarketStats from './home/components/TrustBar';
import HomeLiveAuctions from './home/components/HomeLiveAuctions';
import WhyKayad from './home/components/Testimonials';
import FeaturedDealers from './home/components/FeaturedDealers';
import FinalCta from './home/components/FinalCta';

export default function HomePage() {
  usePageMeta('Home', "East Africa's most trusted automotive marketplace. Buy, sell and bid on premium cars in Kenya with secure escrow payments.");
  const { isAuth, user } = useAuth();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [featured, setFeatured] = useState([]);
  const [liveAuctions, setLiveAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featuredDealers, setFeaturedDealers] = useState([]);

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

        const nonAuction = all.filter(c => {
          const s = c.auctionStartTime ? new Date(c.auctionStartTime).getTime() : 0;
          const e = c.auctionEnd ? new Date(c.auctionEnd).getTime() : 0;
          const isLive = s > 0 && e > 0 && s <= now && e > now;
          return !isLive && !(s > now);
        });

        setLiveAuctions(live.slice(0, 6));
        setFeatured([...nonAuction.filter(c => c.isPromoted), ...nonAuction.filter(c => !c.isPromoted)].slice(0, 6));

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
                trustScore: d.trustScore || Math.floor(70 + Math.random() * 25),
                completedSales: d.totalTransactions || Math.floor(Math.random() * 50),
                yearsActive: d.yearsActive || Math.floor(1 + Math.random() * 8),
              });
            }
            dealerMap.get(id).carCount++;
          }
        });
        setFeaturedDealers(Array.from(dealerMap.values()));
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

  const displayCars = loading || featured.length === 0 ? [] : featured;
  const liveCount = liveAuctions.length;

  return (
    <>
      <WebSiteStructuredData />
      <BreadcrumbStructuredData items={[{ name: 'Home', url: '/' }]} />
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        {/* 1. Hero */}
        <HomeHero liveCount={liveCount} isAuth={isAuth} user={user} />

        {/* 2. Marketplace Statistics */}
        <MarketStats />

        {!loading && (
          <>
            {/* 3. Featured Vehicles */}
            {displayCars.length > 0 && (
              <section className="py-14 md:py-18">
                <div className="max-w-[1200px] mx-auto px-8">
                  <div className="text-center mb-10">
                    <h2 className="font-display font-black italic text-[clamp(1.4rem,2.5vw,2rem)] text-white leading-none mb-2">
                      Featured <span className="text-gold">Vehicles</span>
                    </h2>
                    <p className="text-xs text-white/40">Premium selection of verified vehicles</p>
                  </div>
                  <div className="grid gap-5 md:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                    {displayCars.map(car => (
                      <CartyGrid key={car._id} car={car} isMobile={isMobile} />
                    ))}
                  </div>
                  <div className="text-center mt-8">
                    <Link to="/showroom" className="inline-flex items-center gap-2 btn btn-outline px-8 py-3 rounded-full text-sm uppercase tracking-[0.08em] no-underline">
                      View All Vehicles
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* 4. Why KAYAD */}
            <WhyKayad />

            {/* 5. Featured Auctions */}
            {liveAuctions.length > 0 && (
              <HomeLiveAuctions cars={liveAuctions} isMobile={isMobile} />
            )}

            {/* 6. Dealer Showcase */}
            {featuredDealers.length > 0 && (
              <FeaturedDealers dealers={featuredDealers.slice(0, 3)} />
            )}
          </>
        )}

        {/* 7. Final CTA */}
        <FinalCta />

        {loading && (
          <div className="flex justify-center py-20">
            <div className="spinner" />
          </div>
        )}
      </div>
    </>
  );
}
