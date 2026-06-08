import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CartyGrid from '../components/CartyGrid';
import { useState, useEffect } from 'react';
import { carsAPI } from '../api/api';
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
  const [featured,    setFeatured]    = useState([]);
  const [recent,      setRecent]      = useState([]);
  const [liveAuctions, setLiveAuctions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [stats,       setStats]       = useState(null);

  useEffect(() => {
    carsAPI.list({ page: 1, limit: 50, sort: '' }).then(data => {
      const all = data.cars || data.data || [];
      const now = Date.now();

      // Time-aware filtering — don't just trust the static auctionStatus field
      const live = all.filter(c => {
        const start = c.auctionStartTime ? new Date(c.auctionStartTime).getTime() : 0;
        const end = c.auctionEnd ? new Date(c.auctionEnd).getTime() : 0;
        return start > 0 && end > 0 && start <= now && end > now;
      });

      const upcoming = all.filter(c => {
        const start = c.auctionStartTime ? new Date(c.auctionStartTime).getTime() : 0;
        return start > now;
      }).sort((a, b) => new Date(a.auctionStartTime) - new Date(b.auctionStartTime));

      const nonAuction = all.filter(c => {
        const start = c.auctionStartTime ? new Date(c.auctionStartTime).getTime() : 0;
        const end = c.auctionEnd ? new Date(c.auctionEnd).getTime() : 0;
        const isLive = start > 0 && end > 0 && start <= now && end > now;
        const isSched = start > now;
        return !isLive && !isSched;
      });

      const promoted = nonAuction.filter(c => c.isPromoted);
      const buyNow = nonAuction;

      setLiveAuctions(live.slice(0, 4));
      setFeatured([...promoted, ...buyNow.filter(c => !c.isPromoted)].slice(0, 4));
      setRecent(buyNow.slice(0, 8));
      setStats({
        totalCars:    all.length,
        liveAuctions: live.length,
        upcoming:     upcoming.length,
        buyNow:       buyNow.filter(c => c.allowBuy !== false).length,
        brands:       [...new Set(all.map(c => c.brand))].length,
        avgPrice:     Math.round(all.reduce((s, c) => s + (Number(c.price) || 0), 0) / (all.length || 1)),
      });
    }).catch(() => {
      toast('Could not load vehicles. Check your connection.', 'warning');
    }).finally(() => setLoading(false));
  }, []);

  const cars = loading ? [] : (featured.length > 0 ? featured : recent);
  const liveCount = stats?.liveAuctions || liveAuctions.length || 0;

  return (
    <>
    <WebSiteStructuredData />
    <BreadcrumbStructuredData items={[
      { name: 'Home', url: '/' },
    ]} />
    <div style={{ paddingTop: '72px', background: '#050505', minHeight: '100vh' }}>
      <HomeHero liveCount={liveCount} isAuth={isAuth} user={user} />
      <HomeLiveTicker count={liveCount} />

      <section style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 28px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 1, background: 'rgba(255,255,255,0.03)',
        }}>
          <HomeAnimatedStat label="Cars Listed" value={stats ? `${stats.totalCars}` : '0'} />
          <HomeAnimatedStat label="Brands" value={stats ? `${stats.brands}` : '0'} />
          <HomeAnimatedStat label="Live Auctions" value={stats ? `${stats.liveAuctions}` : '0'} />
          <HomeAnimatedStat label="Buy Now" value={stats ? `${stats.buyNow}` : '0'} />
        </div>
      </section>

      {!loading && <HomeLiveAuctions cars={liveAuctions} isMobile={isMobile} />}

      <section style={{ padding: liveAuctions.length > 0 ? '24px 0' : '32px 0 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {featured.length > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)',
                    borderRadius: 9999, padding: '2px 8px',
                    fontSize: 8, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>
                    Featured
                  </span>
                )}
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  From The Gallery
                </span>
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
                fontSize: 'clamp(1.1rem, 2vw, 1.5rem)', color: '#fff', margin: 0, lineHeight: 1,
              }}>
                Elite <span style={{ color: 'var(--gold)' }}>Selection</span>
              </h2>
            </div>
            <Link to="/showroom" style={{
              fontSize: 11, color: 'rgba(212,196,168,0.7)', fontWeight: 700,
              textDecoration: 'none', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', gap: 4,
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(212,196,168,0.7)'}
            >Full Gallery →</Link>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ aspectRatio: '16/11', background: 'rgba(255,255,255,0.03)', borderRadius: 12, animation: 'pulse 1.8s infinite' }} />
              ))}
            </div>
          ) : cars.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {cars.map(car => <CartyGrid key={car._id} car={car} isMobile={isMobile} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
              No vehicles yet — <Link to="/showroom" style={{ color: 'var(--gold)', textDecoration: 'none' }}>browse the gallery</Link>
            </div>
          )}
        </div>
      </section>

      {!loading && recent.length > 0 && (
        <section style={{ padding: '0 0 48px' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>
                  The Gallery
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
                  fontSize: 'clamp(1.1rem, 2vw, 1.5rem)', color: '#fff', margin: 0, lineHeight: 1,
                }}>
                  Recent <span style={{ color: 'rgba(255,255,255,0.35)' }}>Arrivals</span>
                </h2>
              </div>
              <Link to="/showroom" style={{
                fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textDecoration: 'none',
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              >Browse All →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
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
