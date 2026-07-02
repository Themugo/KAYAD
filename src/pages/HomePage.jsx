import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, FileCheck, UserCheck, Gavel, MapPin, Gauge } from 'lucide-react';
import { carsAPI, formatKES } from '../api/api';
import CartyGrid from '../components/CartyGrid';
import usePageMeta from '../hooks/usePageMeta';
import useMediaQuery from '../hooks/useMediaQuery';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const heroSlides = [
  { image: 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg', label: 'Executive Sedan' },
  { image: 'https://images.pexels.com/photos/1201610/pexels-photo-1201610.jpeg', label: 'Luxury SUV' },
  { image: 'https://images.pexels.com/photos/6279348/pexels-photo-6279348.jpeg', label: 'Premium Pickup' },
  { image: 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg', label: 'Sports Vehicle' },
];

const trustItems = [
  { icon: Shield, title: 'Escrow Protection', desc: 'Funds held until safe delivery.' },
  { icon: FileCheck, title: 'Pre-Inspection', desc: 'Independent check before purchase.' },
  { icon: UserCheck, title: 'Verified Dealers', desc: 'All sellers vetted and approved.' },
  { icon: Gavel, title: 'Auctions', desc: 'Transparent real-time bidding.' },
];

export default function HomePage() {
  usePageMeta('Home', "East Africa's most trusted car marketplace.");
  const isMobile = useMediaQuery('(max-width: 640px)');

  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredCars, setFeaturedCars] = useState([]);
  const [galleryCars, setGalleryCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      carsAPI.list({ page: 1, limit: 6, sort: '-createdAt', featured: true }),
      carsAPI.list({ page: 1, limit: 50, sort: '-createdAt' }),
    ]).then(([featuredRes, allRes]) => {
      if (cancelled) return;
      const featured = featuredRes?.cars || featuredRes?.data || [];
      const all = allRes?.cars || allRes?.data || [];
      setFeaturedCars(featured);
      setGalleryCars(shuffle(all).slice(0, 12));
    }).catch(() => {
      if (!cancelled) { setFeaturedCars([]); setGalleryCars([]); }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const carPriceStyle = {
    fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic',
    fontSize: 13, fontWeight: 600,
    background: 'linear-gradient(90deg, #D4C4A8, #B8A88C)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  return (
    <div>
      <style>{`
        .hp-container { max-width: 1280px; margin: 0 auto; padding: 0 16px; }
        @media (min-width: 640px) { .hp-container { padding: 0 24px; } }
        @media (min-width: 1024px) { .hp-container { padding: 0 32px; } }
        .hp-section { padding: 64px 0; }
        @media (min-width: 768px) { .hp-section { padding: 96px 0; } }
        .hp-heading { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 600; color: var(--text); letter-spacing: -0.02em; line-height: 1.15; }
        @media (min-width: 640px) { .hp-heading { font-size: 40px; } }
        .hp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px; font-size: 13px; font-weight: 500; transition: all 0.2s; min-height: 38px; padding: 0 18px; text-decoration: none; }
        .hp-btn-gold { background: var(--gold); color: var(--bg); }
        .hp-btn-gold:hover { background: var(--gold-light); }
        .hp-btn-outline { background: transparent; border: 1px solid rgba(212,196,168,0.25); color: var(--gold); }
        .hp-btn-outline:hover { background: rgba(212,196,168,0.12); }
        .view-all-btn { display: none; }
        @media (min-width: 640px) { .view-all-btn { display: inline-flex !important; } }
        .view-all-mobile { display: block; }
        @media (min-width: 640px) { .view-all-mobile { display: none; } }
      `}</style>

      {/* ═══ HERO — Fullscreen slideshow ═══ */}
      <section style={{
        position: 'relative', height: isMobile ? 320 : 380,
        overflow: 'hidden',
      }}>
        {heroSlides.map((slide, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            transition: 'all 1s ease-out',
            opacity: i === currentSlide ? 1 : 0,
            transform: i === currentSlide ? 'scale(1)' : 'scale(1.03)',
          }}>
            <img src={slide.image} alt={slide.label}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}

        {/* Gradients */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)',
        }} />

        {/* Content */}
        <div className="hp-container" style={{
          position: 'relative', zIndex: 10, height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          paddingBottom: 16,
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.45)', fontSize: 11,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            marginBottom: 12, fontWeight: 500,
          }}>
            East Africa's Trusted Car Marketplace
          </p>

          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600, lineHeight: 1.05,
            fontSize: 'clamp(2rem, 5vw, 3.25rem)', margin: 0,
          }}>
            <span style={{ color: '#fff' }}>Drive Your </span>
            <span style={{
              background: 'linear-gradient(135deg, #D4C4A8 0%, #F0EDE6 45%, #D4C4A8 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Dream Today
            </span>
          </h1>

          <p style={{
            marginTop: 10, color: 'rgba(255,255,255,0.45)',
            fontSize: 13, maxWidth: 280,
          }}>
            Buy, sell and auction vehicles with confidence.
          </p>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/showroom" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 8,
              background: 'var(--gold)', color: 'var(--bg)',
              fontSize: 13, fontWeight: 500, textDecoration: 'none',
              transition: 'background 0.2s',
            }}>
              Browse Cars <ArrowRight size={14} />
            </Link>
            <Link to="/sell" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.2)',
              textDecoration: 'none', transition: 'all 0.2s',
            }}>
              Sell a Vehicle
            </Link>
          </div>
        </div>

        {/* Slide dots */}
        <div style={{
          position: 'absolute', bottom: 20, right: 24,
          display: 'flex', alignItems: 'center', gap: 6, zIndex: 10,
        }}>
          {heroSlides.map((_, i) => (
            <button key={i} onClick={() => setCurrentSlide(i)}
              style={{
                height: 3, borderRadius: 9999, border: 'none', padding: 0, cursor: 'pointer',
                transition: 'all 0.3s',
                background: i === currentSlide ? 'var(--gold)' : 'rgba(255,255,255,0.25)',
                width: i === currentSlide ? 24 : 8,
              }}
              onMouseEnter={e => { if (i !== currentSlide) e.currentTarget.style.background = 'rgba(255,255,255,0.45)'; }}
              onMouseLeave={e => { if (i !== currentSlide) e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
            />
          ))}
        </div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <section style={{ background: '#0D0D0D' }}>
        <div className="hp-container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
          }} className="trust-strip-grid">
            <style>{`
              .trust-strip-grid { border-top: 1px solid var(--border); }
              .trust-strip-grid > *:nth-child(odd) { border-right: 1px solid var(--border); }
              @media (min-width: 640px) {
                .trust-strip-grid { grid-template-columns: repeat(4, 1fr); }
                .trust-strip-grid > * { border-right: 1px solid var(--border); }
                .trust-strip-grid > *:last-child { border-right: none; }
                .trust-strip-grid > *:nth-child(odd) { border-right: 1px solid var(--border); }
              }
            `}</style>
            {trustItems.map((item, i) => (
              <div key={item.title} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 16px',
              }}>
                <item.icon size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 500, lineHeight: 1.2 }}>{item.title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, lineHeight: 1.3, marginTop: 2, display: 'none' }} className="trust-desc">{item.desc}</p>
                  <style>{`@media (min-width: 640px) { .trust-desc { display: block !important; } }`}</style>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURED VEHICLES ═══ */}
      {!loading && featuredCars.length > 0 && (
        <section className="hp-section">
          <div className="hp-container">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
              <div>
                <h2 className="hp-heading">Featured Vehicles</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
                  Premium selection from verified dealers.
                </p>
              </div>
              <Link to="/showroom" className="hp-btn hp-btn-outline view-all-btn" style={{ fontSize: 12 }}>
                View All <ArrowRight size={14} />
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="featured-grid">
              <style>{`
                @media (min-width: 640px) { .featured-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (min-width: 1024px) { .featured-grid { grid-template-columns: repeat(3, 1fr); } }
              `}</style>
              {featuredCars.map(car => (
                <CartyGrid key={car._id} car={car} />
              ))}
            </div>
            <div className="view-all-mobile" style={{ marginTop: 28, textAlign: 'center' }}>
              <Link to="/showroom" className="hp-btn hp-btn-outline">View All Vehicles</Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ BROWSE THE GALLERY ═══ */}
      {!loading && galleryCars.length > 0 && (
        <section className="hp-section" style={{ background: '#080808' }}>
          <div className="hp-container">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
              <div>
                <h2 className="hp-heading">Browse the Gallery</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
                  Premium vehicles, verified and ready for you.
                </p>
              </div>
              <Link to="/showroom" className="view-all-btn" style={{
                display: 'none', alignItems: 'center', gap: 6,
                color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
                textDecoration: 'none', transition: 'color 0.2s',
              }}>
                View All <ArrowRight size={16} />
              </Link>
              <style>{`
                @media (min-width: 640px) { .view-all-btn { display: inline-flex !important; } }
                .view-all-btn:hover { color: var(--gold); }
              `}</style>
            </div>

            <div style={{ display: 'grid', gap: 12 }} className="gallery-grid">
              <style>{`
                .gallery-grid { grid-template-columns: repeat(2, 1fr); }
                @media (min-width: 640px) { .gallery-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; } }
                @media (min-width: 1024px) { .gallery-grid { grid-template-columns: repeat(4, 1fr); } }
              `}</style>
              {galleryCars.map(car => (
                <div key={car._id}>
                  <Link to={`/cars/${car._id}`} style={{
                    display: 'block', borderRadius: 8, overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.07)',
                    background: '#111111', textDecoration: 'none',
                    transition: 'border-color 0.3s, box-shadow 0.3s',
                  }}>
                    {/* Image */}
                    <div style={{ position: 'relative', height: isMobile ? 100 : 128, overflow: 'hidden' }}>
                      <img
                        src={car.images?.[0]?.url || car.images?.[0] || 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg'}
                        alt={car.title}
                        style={{
                          width: '100%', height: '100%', objectFit: 'cover',
                          transition: 'transform 0.5s',
                        }}
                        loading="lazy"
                      />
                    </div>

                    {/* Info */}
                    <div style={{ padding: '10px' }}>
                      <h3 style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontSize: 13, fontWeight: 600,
                        color: 'rgba(255,255,255,0.9)', lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', margin: 0,
                      }}>{car.title}</h3>
                      {car.dealer?.name && (
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {car.dealer.name}
                        </p>
                      )}

                      <p style={carPriceStyle}>{formatKES(car.price)}</p>

                      <div style={{
                        marginTop: 6, paddingTop: 6,
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', gap: 8,
                        color: 'rgba(255,255,255,0.35)', fontSize: 10,
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Gauge size={10} />
                          {car.mileage ? `${Number(car.mileage).toLocaleString()} km` : '-'}
                        </span>
                        <span style={{ textTransform: 'capitalize' }}>{car.fuel || car.fuel_type || '-'}</span>
                        {car.location?.city && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto', overflow: 'hidden' }}>
                            <MapPin size={10} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 48 }}>{car.location.city}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            <div className="view-all-mobile" style={{ marginTop: 32, textAlign: 'center' }}>
              <Link to="/showroom" className="hp-btn hp-btn-outline">Browse All Vehicles</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
