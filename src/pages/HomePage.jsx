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
import TrustBar from './home/components/TrustBar';
import HomeLiveAuctions from './home/components/HomeLiveAuctions';
import FeaturedDealers from './home/components/FeaturedDealers';
import PrivateSellerSection from './home/components/PrivateSellerSection';
import Partners from './home/components/Partners';

export default function HomePage() {
  usePageMeta('Home', 'East Africa\'s most trusted automotive marketplace. Buy, sell and bid on premium cars in Kenya with secure escrow payments.');
  const { isAuth, user } = useAuth();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [featured, setFeatured] = useState([]);
  const [recent, setRecent] = useState([]);
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

  const displayCars = loading ? [] : (featured.length > 0 ? featured : recent);
  const liveCount = liveAuctions.length;

  const SectionWrapper = ({ children, className = '' }) => (
    <section className={`section-spacing ${className}`}>
      {children}
    </section>
  );

  return (
    <>
      <WebSiteStructuredData />
      <BreadcrumbStructuredData items={[{ name: 'Home', url: '/' }]} />
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        {/* Order for mobile: Hero → TrustBar → Featured → Auctions → Sell → Dealers → Partners */}
        {/* Order for desktop: same, just wider layout */}
        <HomeHero liveCount={liveCount} isAuth={isAuth} user={user} />
        <TrustBar />

        {!loading && (
          <>
            <SectionWrapper>
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
                  <div className="grid gap-5 md:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
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
            </SectionWrapper>

            <HomeLiveAuctions cars={liveAuctions} isMobile={isMobile} />
            <PrivateSellerSection />
            <FeaturedDealers dealers={featuredDealers.slice(0, 3)} />
            <Partners />
          </>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <div className="spinner" />
          </div>
        )}
      </div>
    </>
  );
}
