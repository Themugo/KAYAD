import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, FileCheck, UserCheck, Gavel } from 'lucide-react';
import { carsAPI } from '../api/api';
import CartyGrid from '../components/CartyGrid';
import usePageMeta from '../hooks/usePageMeta';

const heroSlides = [
  { image: 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg', label: 'Executive Sedan' },
  { image: 'https://images.pexels.com/photos/1201610/pexels-photo-1201610.jpeg', label: 'Luxury SUV' },
  { image: 'https://images.pexels.com/photos/6279348/pexels-photo-6279348.jpeg', label: 'Premium Pickup' },
  { image: 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg', label: 'Sports Vehicle' },
];

const trustItems = [
  { icon: Shield, label: 'Escrow Protected' },
  { icon: FileCheck, label: 'Pre-Inspected' },
  { icon: UserCheck, label: 'Verified Dealers' },
  { icon: Gavel, label: 'Live Auction' },
];

const trustCards = [
  { icon: Shield, title: 'Escrow Protected', desc: 'Funds held securely until delivery confirmed.' },
  { icon: FileCheck, title: 'Pre-Inspected', desc: 'Professional inspection on every vehicle.' },
  { icon: UserCheck, title: 'Verified Dealers', desc: 'KRA-verified and phone-verified dealers only.' },
  { icon: Gavel, title: 'Live Auction', desc: 'Real-time bidding on premium vehicles.' },
];

export default function HomePage() {
  usePageMeta('Home', "East Africa's most trusted automotive marketplace.");

  const [featuredCars, setFeaturedCars] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    carsAPI.list({ page: 1, limit: 6, sort: '-createdAt', featured: true })
      .then(data => {
        if (cancelled) return;
        const cars = data?.cars || data?.data || [];
        setFeaturedCars(cars);
      })
      .catch(() => { if (!cancelled) setFeaturedCars([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <style>{`
        .hp-section { padding: 64px 0; }
        @media (min-width: 768px) { .hp-section { padding: 96px 0; } }
        .hp-container { max-width: 1280px; margin: 0 auto; padding: 0 16px; }
        @media (min-width: 640px) { .hp-container { padding: 0 24px; } }
        @media (min-width: 1024px) { .hp-container { padding: 0 32px; } }
        .hp-heading { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 600; color: var(--text); letter-spacing: -0.02em; line-height: 1.15; }
        @media (min-width: 640px) { .hp-heading { font-size: 40px; } }
        .hp-subheading { font-size: 15px; color: var(--text-muted); line-height: 1.6; max-width: 540px; margin-top: 12px; }
        .hp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; font-size: 14px; font-weight: 500; transition: all 0.2s; min-height: 40px; padding: 0 20px; text-decoration: none; }
        .hp-btn-gold { background: var(--gold); color: var(--bg); }
        .hp-btn-gold:hover { background: var(--gold-light); }
        .hp-btn-outline { background: transparent; border: 1px solid rgba(212,196,168,0.25); color: var(--gold); }
        .hp-btn-outline:hover { background: rgba(212,196,168,0.12); }
        .hp-card { border-radius: 12px; border: 1px solid var(--border); background: var(--card); transition: all 0.3s; }
        .hp-card-hover { cursor: pointer; }
        .hp-card-hover:hover { background: var(--card-hover); border-color: rgba(212,196,168,0.18); }
        .hp-slide-dot { width: 8px; height: 8px; border-radius: 50%; border: none; cursor: pointer; transition: all 0.3s; padding: 0; }
      `}</style>

      {/* ═══ HERO ═══ */}
      <section style={{
        position: 'relative', minHeight: '550px',
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, var(--bg) 0%, var(--bg) 50%, var(--surface) 100%)',
        }} />
        <div className="hp-container" style={{ position: 'relative', zIndex: 10, width: '100%', paddingTop: 64, paddingBottom: 64 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr',
            gap: 32, alignItems: 'center',
          }} className="lg-grid-9">
            <style>{`
              @media (min-width: 1024px) { .lg-grid-9 { grid-template-columns: 5fr 4fr; } }
            `}</style>
            {/* Left — Content */}
            <div>
              {/* Trust badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 9999,
                background: 'rgba(212,196,168,0.12)',
                border: '1px solid rgba(212,196,168,0.15)',
                marginBottom: 20,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} />
                <span style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 500 }}>
                  East Africa's Trusted Marketplace
                </span>
              </div>

              <h1 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                fontWeight: 600, color: 'var(--text)',
                lineHeight: 1.1, margin: 0,
              }}>
                Drive Your Dream
              </h1>

              <p style={{
                marginTop: 8, color: 'var(--gold)',
                fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                fontWeight: 500,
              }}>
                Premium Car Marketplace
              </p>

              <p style={{
                marginTop: 16, color: 'var(--text-muted)',
                fontSize: 14, lineHeight: 1.6,
                maxWidth: 480,
              }}>
                Buy, sell and auction vehicles with confidence. Every transaction protected through escrow, verified dealers and professional inspections.
              </p>

              {/* CTAs */}
              <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Link to="/showroom" className="hp-btn hp-btn-gold">
                  Browse Marketplace <ArrowRight size={16} />
                </Link>
                <Link to="/sell" className="hp-btn hp-btn-outline">
                  Sell Your Vehicle
                </Link>
              </div>

              {/* Trust Indicators */}
              <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: '12px 20px' }}>
                {trustItems.map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                    <item.icon size={14} style={{ color: 'var(--gold)' }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Image Slideshow */}
            <div style={{
              position: 'relative',
              aspectRatio: '16/11', borderRadius: 12,
              overflow: 'hidden', background: 'var(--card)',
              border: '1px solid var(--border)',
            }} className="hero-aspect">
              <style>{`
                @media (min-width: 1024px) { .hero-aspect { aspect-ratio: 4/3; } }
              `}</style>
              {heroSlides.map((slide, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute', inset: 0,
                    transition: 'all 1s ease-out',
                    opacity: i === currentSlide ? 1 : 0,
                    transform: i === currentSlide ? 'scale(1)' : 'scale(1.05)',
                  }}
                >
                  <img src={slide.image} alt={slide.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
                  }} />
                </div>
              ))}
              <div style={{ position: 'absolute', bottom: 16, left: 16 }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500 }}>
                  {heroSlides[currentSlide].label}
                </p>
              </div>
              <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', gap: 6 }}>
                {heroSlides.map((_, i) => (
                  <button key={i} onClick={() => setCurrentSlide(i)}
                    className="hp-slide-dot"
                    style={{
                      background: i === currentSlide ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
                      width: i === currentSlide ? 20 : 8,
                    }}
                    onMouseEnter={e => { if (i !== currentSlide) e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; }}
                    onMouseLeave={e => { if (i !== currentSlide) e.currentTarget.style.background = 'rgba(255,255,255,0.4)'; }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHY BUYERS TRUST KAYAD ═══ */}
      <section className="hp-section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="hp-container">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 className="hp-heading">Buy with Confidence</h2>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
          }} className="trust-grid">
            <style>{`
              @media (min-width: 1024px) { .trust-grid { grid-template-columns: repeat(4, 1fr); gap: 24px; } }
            `}</style>
            {trustCards.map(card => (
              <div key={card.title} className="hp-card" style={{ padding: 20, textAlign: 'center' }}>
                <card.icon size={20} style={{ color: 'var(--gold)', margin: '0 auto 10px', display: 'block' }} />
                <h3 style={{ color: 'var(--text)', fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{card.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURED VEHICLES ═══ */}
      {!loading && featuredCars.length > 0 && (
        <section className="hp-section">
          <div className="hp-container">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
              <div>
                <h2 className="hp-heading">Featured Vehicles</h2>
                <p className="hp-subheading" style={{ marginTop: 8 }}>
                  Premium selection from verified dealers.
                </p>
              </div>
              <Link to="/showroom" className="hp-btn hp-btn-outline view-all-btn" style={{ fontSize: 13 }}>
                View All <ArrowRight size={14} />
              </Link>
              <style>{`
                .view-all-btn { display: none; }
                @media (min-width: 640px) { .view-all-btn { display: inline-flex !important; } }
              `}</style>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 20,
            }} className="featured-grid">
              <style>{`
                @media (min-width: 640px) { .featured-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (min-width: 1024px) { .featured-grid { grid-template-columns: repeat(3, 1fr); } }
              `}</style>
              {featuredCars.map(car => (
                <CartyGrid key={car._id} car={car} />
              ))}
            </div>
            <div style={{ marginTop: 32, textAlign: 'center' }} className="view-all-mobile">
              <Link to="/showroom" className="hp-btn hp-btn-outline">View All Vehicles</Link>
            </div>
            <style>{`
              @media (min-width: 640px) { .view-all-mobile { display: none; } }
            `}</style>
          </div>
        </section>
      )}

      {/* ═══ CTA ═══ */}
      <section className="hp-section" style={{ background: 'var(--surface)' }}>
        <div className="hp-container">
          <div style={{ maxWidth: 576, margin: '0 auto', textAlign: 'center' }}>
            <h2 className="hp-heading">Ready to Get Started?</h2>
            <p className="hp-subheading" style={{ margin: '12px auto 0' }}>
              Browse hundreds of verified vehicles.
            </p>
            <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
              <Link to="/showroom" className="hp-btn hp-btn-gold">Browse Marketplace</Link>
              <Link to="/sell" className="hp-btn hp-btn-outline">Sell Your Vehicle</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
