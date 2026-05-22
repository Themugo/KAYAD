import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CartyGrid from '../components/CartyGrid';
import { useState, useEffect, useRef } from 'react';
import { carsAPI } from '../api/api';
import usePageMeta from '../hooks/usePageMeta';
import { WebSiteStructuredData, BreadcrumbStructuredData } from '../components/SeoStructuredData';

const AnimatedStat = ({ value, label }) => {
  const [display, setDisplay] = useState('0');
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const target = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g,'')) || 0 : (value || 0);
        const suffix = typeof value === 'string' ? value.replace(/[0-9]/g,'') : '';
        let start = 0;
        const dur = Math.min(1200, target * 8);
        const step = Math.max(1, Math.floor(target / 30));
        const iv = setInterval(() => {
          start += step;
          if (start >= target) { start = target; clearInterval(iv); }
          setDisplay(start.toLocaleString() + suffix);
        }, dur / (target / step || 1));
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);
  return (
    <div ref={ref} style={{ textAlign: 'center', padding: '20px 12px', background: '#050505' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 900, fontStyle: 'italic', color: 'var(--gold)', lineHeight: 1 }}>{display}</div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 5 }}>{label}</div>
    </div>
  );
};

const LiveTicker = ({ count }) => {
  const [scrollPos, setScrollPos] = useState(0);
  const tickerRef = useRef(null);
  useEffect(() => {
    const iv = setInterval(() => {
      setScrollPos(prev => (prev + 1) % 200);
    }, 30);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
      borderTop: '1px solid rgba(239,68,68,0.15)',
      borderBottom: '1px solid rgba(239,68,68,0.15)',
      padding: '8px 0',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 32, whiteSpace: 'nowrap',
        transform: `translateX(${-scrollPos}px)`,
        transition: 'transform 0.03s linear',
      }} ref={tickerRef}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '0.06em' }}>
              🔴 {count} {count === 1 ? 'CAR' : 'CARS'} LIVE NOW — BIDDING OPEN
            </span>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>◆</span>
            <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>
              NEXT AUCTION CLOSING SOON
            </span>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>◆</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function HomePage() {
  usePageMeta('Home', 'Buy, sell and bid on premium cars in Kenya. Live auctions with M-Pesa. Secure escrow payments.');
  const { isAuth, user } = useAuth();
  const [featured,    setFeatured]    = useState([]);
  const [recent,      setRecent]      = useState([]);
  const [liveAuctions, setLiveAuctions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [stats,       setStats]       = useState(null);
  const scrollRef     = useRef(null);

  useEffect(() => {
    carsAPI.list({ limit: 50 }).then(data => {
      const all = data.cars || data.data || [];
      const live = all.filter(c => c.auctionStatus === 'live');
      const promoted = all.filter(c => c.isPromoted && c.auctionStatus !== 'live');
      const buyNow = all.filter(c => c.auctionStatus !== 'live');
      setLiveAuctions(live.slice(0, 4));
      // Elite Selection = promoted picks, topped up with other buy-now cars to 4
      setFeatured([...promoted, ...buyNow.filter(c => !c.isPromoted)].slice(0, 4));
      setRecent(buyNow.slice(0, 8));
      setStats({
        totalCars:    all.length,
        liveAuctions: live.length,
        buyNow:       buyNow.filter(c => c.allowBuy !== false).length,
        brands:       [...new Set(all.map(c => c.brand))].length,
        avgPrice:     Math.round(all.reduce((s, c) => s + (Number(c.price) || 0), 0) / (all.length || 1)),
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cars = loading ? [] : (featured.length > 0 ? featured : recent);
  const liveCount = stats?.liveAuctions || liveAuctions.length || 0;

  return (
    <>
    <WebSiteStructuredData />
    <BreadcrumbStructuredData items={[
      { name: 'Home', url: '/' },
    ]} />
    <div style={{ background: '#050505', minHeight: '100vh' }}>

      {/* ════════════════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px 30px',
      }}>
        {/* Radial gold glow */}
        <div style={{
          position: 'absolute', top: '-25%', left: '50%', transform: 'translateX(-50%)',
          width: 760, height: 380,
          background: 'radial-gradient(ellipse, rgba(212,196,168,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Top ornament */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, zIndex: 1 }}>
          <div style={{ height: 1, width: 36, background: 'linear-gradient(90deg, transparent, rgba(212,196,168,0.4))' }} />
          <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            Kenya's Premium Car Marketplace
          </span>
          <div style={{ height: 1, width: 36, background: 'linear-gradient(90deg, rgba(212,196,168,0.4), transparent)' }} />
        </div>

        {/* Live Auctions badge */}
        {liveCount > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 9999, padding: '4px 12px',
            marginBottom: 14, zIndex: 1,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {liveCount} Live Auction{liveCount !== 1 ? 's' : ''} — Bid Now
            </span>
          </div>
        )}

        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
          fontSize: 'clamp(2rem, 4.5vw, 3.4rem)', lineHeight: 1,
          textTransform: 'uppercase', color: '#fff',
          marginBottom: 12, letterSpacing: '-0.01em', zIndex: 1,
        }}>
          Where Kenya{' '}
          <span style={{ color: 'var(--gold)', textShadow: '0 0 40px rgba(212,196,168,0.28)' }}>Drives</span>
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.6)', fontSize: 14, maxWidth: 500,
          margin: '0 auto 22px', lineHeight: 1.6, zIndex: 1,
          fontWeight: 400,
        }}>
          Live auctions, verified dealers, and M-Pesa secured escrow — East Africa's
          most sophisticated automotive marketplace.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', zIndex: 1 }}>
          <Link to="/showroom" style={{
            padding: '14px 36px', background: 'var(--gold)', color: '#000',
            borderRadius: 9999, fontWeight: 900, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            boxShadow: '0 6px 28px rgba(212,196,168,0.28)',
            transition: 'all 0.25s', display: 'inline-block', textDecoration: 'none',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 42px rgba(212,196,168,0.42)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(212,196,168,0.28)'; }}
          >Enter The Gallery</Link>

          <Link to="/showroom?filter=auction" style={{
            padding: '14px 36px', background: 'transparent', color: 'rgba(255,255,255,0.75)',
            borderRadius: 9999, fontWeight: 600, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            border: '1px solid rgba(255,255,255,0.14)',
            transition: 'all 0.25s', display: 'inline-block', textDecoration: 'none',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.5)'; e.currentTarget.style.color = 'var(--gold)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
          >Live Auctions</Link>
        </div>

        {isAuth && (
          <div style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.18)', zIndex: 1 }}>
            Welcome back, <strong style={{ color: 'rgba(212,196,168,0.6)' }}>{user?.name?.split(' ')[0] || user?.email}</strong>
          </div>
        )}

        {/* fade to content */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(transparent, #050505)', pointerEvents: 'none' }} />
      </section>

      {/* ════════════════════════════════════════════════════════
          LIVE TICKER RIBBON
          ════════════════════════════════════════════════════════ */}
      <LiveTicker count={liveCount} />

      {/* ════════════════════════════════════════════════════════
          ANIMATED STATS BAR
          ════════════════════════════════════════════════════════ */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 28px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 1, background: 'rgba(255,255,255,0.03)',
        }}>
          <AnimatedStat label="Cars Listed"     value={stats ? `${stats.totalCars}` : '0'} />
          <AnimatedStat label="Brands"          value={stats ? `${stats.brands}` : '0'} />
          <AnimatedStat label="Live Auctions"   value={stats ? `${stats.liveAuctions}` : '0'} />
          <AnimatedStat label="Buy Now"         value={stats ? `${stats.buyNow}` : '0'} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          LIVE AUCTIONS SECTION (NEW)
          ════════════════════════════════════════════════════════ */}
      {!loading && liveAuctions.length > 0 && (
        <section style={{ padding: '52px 0 24px' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 9999, padding: '3px 10px',
                    fontSize: 9, color: '#ef4444', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.5s infinite' }} />
                    Live Now
                  </span>
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
                  fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', color: '#fff', margin: 0, lineHeight: 1,
                }}>
                  Live <span style={{ color: 'var(--gold)' }}>Auctions</span>
                </h2>
              </div>
              <Link to="/showroom?filter=auction" style={{
                fontSize: 11, color: 'rgba(239,68,68,0.7)', fontWeight: 700,
                textDecoration: 'none', letterSpacing: '0.06em',
                display: 'flex', alignItems: 'center', gap: 4,
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(239,68,68,0.7)'}
              >View All Auctions →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
              {liveAuctions.map(car => (
                <div key={car._id} style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: 8, left: 8, zIndex: 2,
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(239,68,68,0.9)', borderRadius: 6, padding: '3px 8px',
                  }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', display: 'block', animation: 'pulse 1.5s infinite' }} />
                    <span style={{ fontSize: 8, color: '#fff', fontWeight: 800, letterSpacing: '0.06em' }}>LIVE</span>
                  </div>
                  <CartyGrid key={car._id} car={car} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          FEATURED CARS
          ════════════════════════════════════════════════════════ */}
      <section style={{ padding: liveAuctions.length > 0 ? '40px 0' : '52px 0 40px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {featured.length > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)',
                    borderRadius: 9999, padding: '3px 10px',
                    fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>
                    Featured
                  </span>
                )}
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  From The Gallery
                </span>
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
                fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', color: '#fff', margin: 0, lineHeight: 1,
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ aspectRatio: '16/11', background: 'rgba(255,255,255,0.03)', borderRadius: 12, animation: 'pulse 1.8s infinite' }} />
              ))}
            </div>
          ) : cars.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
              {cars.map(car => <CartyGrid key={car._id} car={car} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
              No vehicles yet — <Link to="/showroom" style={{ color: 'var(--gold)', textDecoration: 'none' }}>browse the gallery</Link>
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          RECENT ARRIVALS
          ════════════════════════════════════════════════════════ */}
      {!loading && recent.length > 0 && (
        <section style={{ padding: '0 0 64px' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
                  The Gallery
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
                  fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', color: '#fff', margin: 0, lineHeight: 1,
                }}>
                  Recent <span style={{ color: 'rgba(255,255,255,0.35)' }}>Arrivals</span>
                </h2>
              </div>
              <Link to="/showroom" style={{
                fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textDecoration: 'none',
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              >Browse All →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
              {recent.map(car => <CartyGrid key={car._id} car={car} />)}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          FEATURE PILLARS
          ════════════════════════════════════════════════════════ */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '64px 0' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
            {[
              {
                title: 'Live Auctions',
                desc: 'Real-time bidding with automatic time extensions and snipe protection. Every bid, every second counts.',
                cta: 'Bid Now',
                href: '/showroom?filter=auction',
                accent: 'rgba(212,196,168,0.06)',
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                ),
              },
              {
                title: 'Escrow Protection',
                desc: 'M-Pesa secured transactions held safely until delivery is confirmed. Your money stays protected.',
                cta: 'Learn More',
                href: '/escrow',
                accent: 'rgba(34,197,94,0.05)',
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                ),
              },
              {
                title: 'Verified Dealers',
                desc: 'Every dealer is KRA-vetted, licensed, and rated by real buyers. Transparency you can trust.',
                cta: 'Explore',
                href: '/showroom',
                accent: 'rgba(59,130,246,0.05)',
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4"/><path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10z"/>
                  </svg>
                ),
              },
            ].map((p, i) => (
              <div key={i} style={{ background: '#080808', padding: '40px 36px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: p.accent, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ marginBottom: 16 }}>{p.icon}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '1.15rem', color: '#fff', marginBottom: 8 }}>{p.title}</div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, marginBottom: 20, margin: '0 0 20px' }}>{p.desc}</p>
                  <Link to={p.href} style={{
                    fontSize: 11, color: 'var(--gold)', fontWeight: 700, textDecoration: 'none',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>
                    {p.cta} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          CTA — Sell
          ════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 0', textAlign: 'center' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, justifyContent: 'center', marginBottom: 24 }}>
            <div style={{ height: 1, width: 64, background: 'linear-gradient(90deg, transparent, rgba(212,196,168,0.3))' }} />
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', display: 'block', opacity: 0.5 }} />
            <div style={{ height: 1, width: 64, background: 'linear-gradient(90deg, rgba(212,196,168,0.3), transparent)' }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 3vw, 2.6rem)', color: '#fff', marginBottom: 10,
          }}>
            Ready to <span style={{ color: 'var(--gold)' }}>Sell?</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 14, maxWidth: 380, margin: '0 auto 28px', lineHeight: 1.75 }}>
            Join Kenya's most trusted dealer network and reach thousands of verified buyers.
          </p>
          <Link to={isAuth ? '/dealer/add-car' : '/register?role=dealer'} style={{
            padding: '13px 34px', background: '#fff', color: '#000',
            borderRadius: 9999, fontWeight: 900, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            transition: 'all 0.25s', display: 'inline-block', textDecoration: 'none',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'none'; }}
          >List Your Vehicle</Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FOOTER
          ════════════════════════════════════════════════════════ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '48px 28px 32px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 36 }}>
            <div>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'linear-gradient(135deg, #A89878 0%, #E8DAC4 40%, #C4B498 70%, #8A7A5E 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(212,196,168,0.25)', marginBottom: 14,
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: '#000', lineHeight: 1, fontStyle: 'italic' }}>K</span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.7, maxWidth: 260, margin: 0 }}>
                Kenya's premium automotive marketplace. Buy, sell, and bid on verified vehicles with secure M-Pesa escrow.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Browse</div>
              {[
                { to: '/showroom', label: 'Gallery' },
                { to: '/showroom?filter=auction', label: 'Live Auctions' },
                { to: '/showroom?sort=price_asc', label: 'Best Deals' },
              ].map(({ to, label }) => (
                <Link key={to} to={to} style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', marginBottom: 10, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                >{label}</Link>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Sell</div>
              {[
                { to: '/register?role=dealer', label: 'List a Car' },
                { to: '/register?role=dealer', label: 'Become a Dealer' },
                { to: '/dealer', label: 'Dealer Hub' },
              ].map(({ to, label }) => (
                <Link key={to} to={to} style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', marginBottom: 10, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                >{label}</Link>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Support</div>
              {[
                { to: '/about', label: 'About Us' },
                { to: '/contact', label: 'Contact' },
                { to: '/privacy', label: 'Privacy Policy' },
                { to: '/terms', label: 'Terms of Service' },
              ].map(({ to, label }) => (
                <Link key={to} to={to} style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', marginBottom: 10, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                >{label}</Link>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)' }}>
              © {new Date().getFullYear()} Kayad Ltd. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>
              <span>🇰🇪 Nairobi, Kenya</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
