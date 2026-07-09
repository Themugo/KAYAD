import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CarCard from '../components/CarCard.jsx';
import { MOCK_CARS } from '../data/mockCars.js';

const SLIDES = [
  {
    id: 1,
    image: 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=1600',
    headline: 'Drive Your Dream Today',
    sub: 'Buy, sell and auction vehicles with confidence.',
  },
  {
    id: 2,
    image: 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1600',
    headline: 'Kenya\'s Finest Selection',
    sub: 'Premium verified vehicles ready for your journey.',
  },
  {
    id: 3,
    image: 'https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=1600',
    headline: 'Bid. Buy. Drive.',
    sub: 'Real-time auctions with transparent M-Pesa escrow.',
  },
  {
    id: 4,
    image: 'https://images.pexels.com/photos/1805053/pexels-photo-1805053.jpeg?auto=compress&cs=tinysrgb&w=1600',
    headline: 'Trusted by Thousands',
    sub: 'Every seller is vetted. Every deal is protected.',
  },
];

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Escrow Protection',
    desc: 'Funds held until safe delivery.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'Pre-Inspection',
    desc: 'Independent check before purchase.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    title: 'Verified Dealers',
    desc: 'All sellers vetted and approved.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    title: 'Auctions',
    desc: 'Transparent real-time bidding.',
  },
];

const FEATURED = MOCK_CARS.filter((c) => c.featured);

export default function HomePage() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const goTo = (i) => setCurrent(i);
  const prev = () => setCurrent((p) => (p - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setCurrent((p) => (p + 1) % SLIDES.length);

  return (
    <>
      {/* ── HERO SLIDER ── */}
      <section className="kd-hero">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            className={`kd-slide${i === current ? ' active' : ''}`}
          >
            <img src={slide.image} alt={slide.headline} />
            <div className="kd-slide__overlay" />
          </div>
        ))}

        <div className="kd-hero__content">
          <p className="kd-hero__eyebrow">EAST AFRICA'S TRUSTED CAR MARKETPLACE</p>
          <h1 className="kd-hero__title">{SLIDES[current].headline}</h1>
          <p className="kd-hero__sub">{SLIDES[current].sub}</p>
          <div className="kd-hero__actions">
            <Link to="/browse" className="kd-hero__cta-primary">
              Browse Cars <span>&#8594;</span>
            </Link>
            <Link to="/register?role=dealer" className="kd-hero__cta-ghost">
              Sell a Vehicle
            </Link>
          </div>
        </div>

        {/* Nav arrows */}
        <button className="kd-hero__arrow kd-hero__arrow--prev" onClick={prev} aria-label="Previous">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button className="kd-hero__arrow kd-hero__arrow--next" onClick={next} aria-label="Next">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Dots */}
        <div className="kd-hero__dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`kd-hero__dot${i === current ? ' active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ── FEATURE BAR ── */}
      <div className="kd-features">
        <div className="container">
          <div className="kd-features__grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="kd-feature">
                <span className="kd-feature__icon">{f.icon}</span>
                <div>
                  <div className="kd-feature__title">{f.title}</div>
                  <div className="kd-feature__desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEATURED VEHICLES ── */}
      <section className="kd-section">
        <div className="container">
          <div className="kd-section__header">
            <h2 className="kd-section__title">Featured Vehicles</h2>
            <Link to="/browse" className="kd-section__link">View all &#8594;</Link>
          </div>
          <div className="kd-cars-grid">
            {FEATURED.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE AUCTIONS ── */}
      {MOCK_CARS.some((c) => c.isAuction) && (
        <section className="kd-section kd-section--alt">
          <div className="container">
            <div className="kd-section__header">
              <div>
                <span className="kd-auction-badge">
                  <span className="kd-auction-dot" />
                  LIVE
                </span>
                <h2 className="kd-section__title" style={{ marginTop: 8 }}>Active Auctions</h2>
              </div>
              <Link to="/auctions" className="kd-section__link">All Auctions &#8594;</Link>
            </div>
            <div className="kd-cars-grid">
              {MOCK_CARS.filter((c) => c.isAuction).map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="kd-cta">
        <div className="container">
          <div className="kd-cta__inner">
            <h2 className="kd-cta__title">Ready to Sell Your Car?</h2>
            <p className="kd-cta__sub">
              List for free and reach thousands of verified buyers across East Africa.
              Our live auction feature gets you the best price — fast.
            </p>
            <Link to="/register?role=dealer" className="kd-hero__cta-primary" style={{ display: 'inline-flex' }}>
              List Your Car Free &#8594;
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
