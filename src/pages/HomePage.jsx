import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CartyGrid from '../components/CartyGrid';
import { useState, useEffect } from 'react';
import { carsAPI } from '../api/api';
import usePageMeta from '../hooks/usePageMeta';

export default function HomePage() {
  usePageMeta('Home', 'Buy, sell and bid on premium cars in Kenya. Live auctions with M-Pesa. Secure escrow payments.');
  const { isAuth, user } = useAuth();
  const [featured,  setFeatured]  = useState([]);
  const [recent,    setRecent]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [stats,     setStats]     = useState(null);

  useEffect(() => {
    carsAPI.list({ limit: 50 }).then(data => {
      const all = data.cars || data.data || [];
      setFeatured(all.filter(c => c.auctionStatus === 'live' || c.allowBid).slice(0, 4));
      setRecent(all.filter(c => !(c.auctionStatus === 'live' || c.allowBid)).slice(0, 4));
      setStats({
        totalCars:    all.length,
        liveAuctions: all.filter(c => c.auctionStatus === 'live').length,
        brands:       [...new Set(all.map(c => c.brand))].length,
        avgPrice:     Math.round(all.reduce((s, c) => s + (Number(c.price) || 0), 0) / (all.length || 1)),
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cars = loading ? [] : (featured.length > 0 ? featured : recent);

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>

      {/* ════════════════════════════════════════════════════════
          HERO — compact, text-tight so first row of cars peeks
          ════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '52px 24px 36px',
        minHeight: '56vh',
      }}>
        {/* Radial gold glow */}
        <div style={{
          position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 400,
          background: 'radial-gradient(ellipse, rgba(212,196,168,0.09) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Fine grid texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.018,
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px', pointerEvents: 'none',
        }} />

        {/* Thin horizontal rule above headline */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, zIndex: 1,
        }}>
          <div style={{ height: 1, width: 48, background: 'linear-gradient(90deg, transparent, rgba(212,196,168,0.4))' }} />
          <span style={{
            fontSize: 11, color: 'var(--gold)', fontWeight: 800,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            textShadow: '0 0 20px rgba(212,196,168,0.12)',
          }}>
            Kenya's Premium Car Marketplace
          </span>
          <div style={{ height: 1, width: 48, background: 'linear-gradient(90deg, rgba(212,196,168,0.4), transparent)' }} />
        </div>

        {/* HEADLINE — smaller clamp so first row of cars always peeks */}
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
          fontSize: 'clamp(2.6rem, 6.5vw, 4.8rem)', lineHeight: 0.9,
          textTransform: 'uppercase', color: '#fff',
          marginBottom: 18, letterSpacing: '-0.01em', zIndex: 1,
        }}>
          Drive in{' '}
          <span style={{
            color: 'var(--gold)',
            textShadow: '0 0 48px rgba(212,196,168,0.28)',
          }}>
            Gold
          </span>
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.65)', fontSize: 16, maxWidth: 520,
          margin: '0 auto 28px', lineHeight: 1.7, zIndex: 1,
          fontWeight: 400,
        }}>
          East Africa's most sophisticated marketplace — live auctions,
          verified dealers &amp; secure escrow.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', zIndex: 1 }}>
          <Link to="/showroom" style={{
            padding: '13px 32px', background: 'var(--gold)', color: '#000',
            borderRadius: 9999, fontWeight: 900, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            boxShadow: '0 6px 28px rgba(212,196,168,0.28)',
            transition: 'all 0.25s', display: 'inline-block', textDecoration: 'none',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 42px rgba(212,196,168,0.42)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(212,196,168,0.28)'; }}
          >Enter The Gallery</Link>

          <Link to="/showroom?filter=auction" style={{
            padding: '13px 32px', background: 'transparent', color: 'rgba(255,255,255,0.75)',
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
          <div style={{ marginTop: 18, fontSize: 11, color: 'rgba(255,255,255,0.18)', zIndex: 1 }}>
            Welcome back, <strong style={{ color: 'rgba(212,196,168,0.6)' }}>{user?.name?.split(' ')[0] || user?.email}</strong>
          </div>
        )}

        {/* Fade bottom edge so cars below feel revealed */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
          background: 'linear-gradient(transparent, #050505)',
          pointerEvents: 'none',
        }} />
      </section>

      {/* ════════════════════════════════════════════════════════
          LIVE STATS BAR
          ════════════════════════════════════════════════════════ */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 28px',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1, background: 'rgba(255,255,255,0.03)',
        }}>
          {[
            { label: 'Vehicles',      value: stats ? `${stats.totalCars}+`  : '—' },
            { label: 'Live Now',      value: stats ? `${stats.liveAuctions}` : '—' },
            { label: 'Brands',        value: stats ? `${stats.brands}`       : '—' },
            { label: 'Avg Price',     value: stats ? `KES ${(stats.avgPrice / 1e6).toFixed(1)}M` : '—' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '20px 12px', background: '#050505' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 900, fontStyle: 'italic', color: 'var(--gold)', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 5 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FEATURED CARS — from the gallery
          ════════════════════════════════════════════════════════ */}
      <section style={{ padding: '48px 0 36px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>

          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {featured.length > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 9999, padding: '3px 10px',
                    fontSize: 9, color: '#ef4444', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.5s infinite' }} />
                    Live Auctions
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

          {/* Cars grid — 4-up */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ aspectRatio: '16/11', background: 'rgba(255,255,255,0.03)', borderRadius: 12, animation: 'pulse 1.8s infinite' }} />
              ))}
            </div>
          ) : cars.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {recent.map(car => <CartyGrid key={car._id} car={car} />)}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          THREE FEATURE PILLARS
          ════════════════════════════════════════════════════════ */}
      <section style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '64px 0',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
            {[
              {
                icon: '⚡',
                title: 'Live Auctions',
                desc: 'Real-time bidding with automatic time extensions. Your bid, your timing.',
                cta: 'Bid Now',
                href: '/showroom?filter=auction',
                accent: 'rgba(212,196,168,0.06)',
              },
              {
                icon: '🔒',
                title: 'Escrow Protection',
                desc: 'M-Pesa secured transactions held safely until both parties confirm.',
                cta: 'Learn More',
                href: '/escrow',
                accent: 'rgba(34,197,94,0.05)',
              },
              {
                icon: '✓',
                title: 'Verified Dealers',
                desc: 'Every dealer is KRA-vetted, licensed, and rated by real buyers.',
                cta: 'Explore',
                href: '/showroom',
                accent: 'rgba(59,130,246,0.05)',
              },
            ].map((p, i) => (
              <div key={i} style={{ background: `#080808`, padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: p.accent, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: 28, marginBottom: 14 }}>{p.icon}</div>
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
          CTA — Sell your car
          ════════════════════════════════════════════════════════ */}
      <section style={{ padding: '72px 0', textAlign: 'center' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
          {/* fine gold rule */}
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
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '32px 28px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #A89878 0%, #E8DAC4 40%, #C4B498 70%, #8A7A5E 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(212,196,168,0.25)',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: '#000', lineHeight: 1, fontStyle: 'italic' }}>K</span>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            {[
              { to: '/showroom', label: 'Gallery' },
              { to: '/showroom?filter=auction', label: 'Auctions' },
              { to: '/register?role=dealer', label: 'List a Car' },
            ].map(({ to, label }) => (
              <Link key={to} to={to} style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
              >{label}</Link>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)' }}>
            © {new Date().getFullYear()} Kayad Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
