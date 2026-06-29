import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CartyGrid from '../components/CartyGrid';
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

  useEffect(() => {
    let cancelled = false;
    const fetchCars = async () => {
      try {
        const data = await carsAPI.list({ page: 1, limit: 50, sort: '' });
        if (cancelled) return;
        let all = data.cars || data.data || [];
        
        if (all.length === 0) {
          enableDemoMode();
          const retry = await carsAPI.list({ page: 1, limit: 50, sort: '' });
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
      } catch {
        if (!cancelled) toast('Could not load vehicles. Check your connection.', 'warning');
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
        <HomeHero liveCount={liveCount} isAuth={isAuth} user={user} />

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

        {!loading && <HomeLiveAuctions cars={liveAuctions} isMobile={isMobile} />}

        <section style={{ padding: liveAuctions.length > 0 ? '24px 0' : '32px 0 24px' }}>
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
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                {displayCars.map(car => <CartyGrid key={car._id} car={car} isMobile={isMobile} />)}
              </div>
            ) : (
              <div className="text-center py-12 text-white/20 text-xs">
                No vehicles yet — <Link to="/showroom" className="text-gold no-underline">browse the gallery</Link>
              </div>
            )}
          </div>
        </section>

        {!loading && recent.length > 0 && (
          <section className="pb-12 animate-[fadeIn_0.6s_ease]">
            <div className="max-w-[1400px] mx-auto px-7">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="text-[8px] text-white/18 font-bold tracking-[0.18em] uppercase mb-1">The Gallery</div>
                  <h2 className="font-display font-black italic text-[clamp(1.1rem,2vw,1.5rem)] text-white leading-none m-0">
                    Recent <span className="text-white/35">Arrivals</span>
                  </h2>
                </div>
                <Link to="/showroom" className="text-[10px] text-white/30 font-bold no-underline transition-colors duration-200 hover:text-white/60"
                >Browse All →</Link>
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                {recent.map(car => <CartyGrid key={car._id} car={car} isMobile={isMobile} />)}
              </div>
            </div>
          </section>
        )}

        <HomeFeaturePillars />
        <HomeCtaSection isAuth={isAuth} />
      </div>
    </>
  );
}
