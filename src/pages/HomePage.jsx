// src/pages/HomePage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI, BRANDS, TESTIMONIALS, MOCK_CARS } from '../api/api';
import CarCard from '../components/CarCard';

export default function HomePage() {
  const [current, setCurrent] = useState(0);
  const [cars, setCars] = useState(MOCK_CARS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await carsAPI.list({ limit: 50 });
        if (mounted && data.cars?.length > 0) setCars(data.cars);
      } catch {
        // Fallback to mock data
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const SLIDES = useMemo(() => {
    return cars
      .filter((c) => c.featured || c.is_promoted)
      .slice(0, 5)
      .map((c) => ({
        id: c._id || c.id,
        image: c.image || c.images?.[0]?.url || c.images?.[0],
        headline: c.title,
        sub: `${c.year} · ${c.fuel} · ${c.location?.city || c.location}`,
      }));
  }, [cars]);

  useEffect(() => {
    if (SLIDES.length === 0) return;
    const t = setInterval(() => setCurrent((p) => (p + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [SLIDES.length]);

  const liveAuctions = cars.filter((c) => c.isAuction || c.auction_status === 'live');
  const featuredCars = cars.filter((c) => c.featured || c.is_promoted).slice(0, 8);

  return (
    <div className="page">
      {/* ─── HERO SLIDER ─── */}
      <section className="kd-hero" aria-label="Featured vehicles carousel">
        {SLIDES.map((slide, i) => (
          <div key={slide.id} className={`kd-slide${i === current ? ' active' : ''}`}>
            <img src={slide.image} alt={slide.headline} loading={i === 0 ? 'eager' : 'lazy'} />
            <div className="kd-slide__overlay" />
          </div>
        ))}
        <div className="kd-hero__content">
          <p className="kd-hero__eyebrow">EAST AFRICA'S TRUSTED CAR MARKETPLACE</p>
          <h1 className="kd-hero__title">{SLIDES[current]?.headline || 'Drive Your Dream Today'}</h1>
          <p className="kd-hero__sub">{SLIDES[current]?.sub || 'Buy, sell and auction vehicles with confidence.'}</p>
          <div className="kd-hero__actions">
            <Link to="/browse" className="kd-hero__cta-primary">Browse Cars</Link>
            <Link to="/register?role=dealer" className="kd-hero__cta-ghost">Sell a Vehicle</Link>
          </div>
        </div>
        {SLIDES.length > 1 && (
          <>
            <button className="kd-hero__arrow kd-hero__arrow--prev" onClick={() => setCurrent((p) => (p - 1 + SLIDES.length) % SLIDES.length)} aria-label="Previous slide">‹</button>
            <button className="kd-hero__arrow kd-hero__arrow--next" onClick={() => setCurrent((p) => (p + 1) % SLIDES.length)} aria-label="Next slide">›</button>
            <div className="kd-hero__dots" role="tablist">
              {SLIDES.map((_, i) => (
                <button key={i} className={`kd-hero__dot${i === current ? ' active' : ''}`} onClick={() => setCurrent(i)} aria-label={`Go to slide ${i + 1}`} role="tab" aria-selected={i === current} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ─── BRAND BAR ─── */}
      <section className="brand-bar" aria-label="Browse by brand">
        <div className="container">
          <div className="brand-grid">
            {BRANDS.map((brand) => (
              <Link key={brand.name} to={`/browse?brand=${brand.name}`} className="brand-logo-item" aria-label={`Browse ${brand.name} vehicles`}>
                <span className="brand-emoji">{brand.logo}</span>
                <span className="brand-name">{brand.name}</span>
                <span className="brand-count">{brand.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LIVE AUCTIONS ─── */}
      {liveAuctions.length > 0 && (
        <section className="section" aria-label="Live auctions">
          <div className="container">
            <div className="section-header">
              <div>
                <div className="section-eyebrow live"><span className="live-dot" aria-hidden="true" /> Live Now</div>
                <h2 className="section-title">Live Auctions</h2>
              </div>
              <Link to="/auctions" className="btn btn-outline btn-sm">View All</Link>
            </div>
            <div className="car-grid">
              {liveAuctions.slice(0, 4).map((car) => <CarCard key={car._id || car.id} car={car} />)}
            </div>
          </div>
        </section>
      )}

      {/* ─── FEATURED VEHICLES ─── */}
      <section className="section section-alt" aria-label="Featured vehicles">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Handpicked Selection</div>
              <h2 className="section-title">Featured Vehicles</h2>
            </div>
            <Link to="/browse" className="btn btn-outline btn-sm">Browse All</Link>
          </div>
          <div className="car-grid">
            {featuredCars.slice(0, 8).map((car) => <CarCard key={car._id || car.id} car={car} />)}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="section section-alt" aria-label="How it works">
        <div className="container">
          <div className="section-header centered">
            <div className="section-eyebrow">Simple Process</div>
            <h2 className="section-title">How It Works</h2>
          </div>
          <div className="how-it-works-grid">
            {[
              { num: '01', icon: '🔍', title: 'Browse & Search', desc: 'Find your ideal car from our curated selection of verified vehicles.' },
              { num: '02', icon: '🔒', title: 'Secure Payment', desc: 'Pay safely with M-Pesa escrow. Funds held until you confirm receipt.' },
              { num: '03', icon: '✅', title: 'Take Delivery', desc: 'Once satisfied, payment is released to the seller. Drive away happy.' },
            ].map((s) => (
              <div key={s.num} className="how-card">
                <div className="how-number">{s.num}</div>
                <div className="how-icon" aria-hidden="true">{s.icon}</div>
                <h3 className="how-title">{s.title}</h3>
                <p className="how-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="section" aria-label="Customer testimonials">
        <div className="container">
          <div className="section-header centered">
            <div className="section-eyebrow">Trusted by Thousands</div>
            <h2 className="section-title">What Our Customers Say</h2>
          </div>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.id} className="testimonial-card">
                <div className="testimonial-rating" aria-label={`${t.rating} out of 5 stars`}>
                  {[...Array(5)].map((_, i) => <span key={i} className="star" aria-hidden="true">{i < t.rating ? '★' : '☆'}</span>)}
                </div>
                <blockquote className="testimonial-text">"{t.text}"</blockquote>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" aria-hidden="true">{t.avatar}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-location">{t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="cta-section" aria-label="Call to action">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Sell Your Car?</h2>
            <p className="cta-subtitle">Join thousands of successful sellers on Kenya's most trusted marketplace.</p>
            <div className="cta-buttons">
              <Link to="/register?role=dealer" className="btn btn-gold btn-lg">List Your Car</Link>
              <Link to="/browse" className="btn btn-outline btn-lg">Browse Marketplace</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
