import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, FileCheck, UserCheck, Gavel, MapPin, Gauge } from 'lucide-react';
import { carsAPI, formatKES } from '../api/api';
import usePageMeta from '../hooks/usePageMeta';
import '../styles/home.css';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const fallbackSlides = [
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

  const [heroSlides, setHeroSlides] = useState(fallbackSlides);
  const [featuredCars, setFeaturedCars] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    carsAPI.list({ page: 1, limit: 8, sort: '-createdAt', featured: true })
      .then(res => {
        if (cancelled) return;
        const cars = res?.cars || res?.data || [];
        setFeaturedCars(cars);
        const withImages = cars.filter(c => c.images?.[0]?.url || c.images?.[0]);
        if (withImages.length >= 3) {
          const picks = shuffle(withImages).slice(0, 6);
          setHeroSlides(picks.map(c => ({
            image: c.images[0]?.url || c.images[0],
            label: c.title,
          })));
        }
      })
      .catch(() => { if (!cancelled) setFeaturedCars([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const slides = heroSlides.length > 0 ? heroSlides : fallbackSlides;

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrentSlide(p => (p + 1) % slides.length), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length]);

  const safeSlide = slides.length > 0 ? currentSlide % slides.length : 0;

  return (
    <div className="home-page">
      {/* ═══ HERO — Fullscreen slideshow ═══ */}
      <section className="hero-section">
        {slides.map((slide, i) => (
          <div key={i} className={`hero-slide ${i === safeSlide ? 'hero-slide-active' : 'hero-slide-hidden'}`}>
            <img src={slide.image} alt={slide.label} className="hero-slide-img" />
          </div>
        ))}

        <div className="hero-overlay-right" />
        <div className="hero-overlay-bottom" />

        <div className="section-container hero-content">
          <p className="hero-overline">East Africa's Trusted Car Marketplace</p>
          <h1 className="hero-heading">
            <span className="hero-heading-white">Drive Your </span>
            <span className="gradient-text">Dream Today</span>
          </h1>
          <p className="hero-subtitle">Buy, sell and auction vehicles with confidence.</p>
          <div className="hero-actions">
            <Link to="/showroom" className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gold text-bg text-sm font-medium hover:bg-gold-light transition-colors">
              Browse Cars <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link to="/sell" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white/70 hover:text-white text-sm font-medium border border-white/20 hover:border-white/35 transition-all">
              Sell a Vehicle
            </Link>
          </div>
        </div>

        <div className="hero-slide-dots">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrentSlide(i)}
              className={`hero-dot ${i === safeSlide ? 'hero-dot-active' : 'hero-dot-inactive'}`}
            />
          ))}
        </div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <section className="trust-strip">
        <div className="section-container">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
            {trustItems.map((item, i) => (
              <div key={item.title} className="flex items-center gap-3 px-5 py-4">
                <item.icon className="w-4 h-4 text-gold shrink-0" />
                <div className="min-w-0">
                  <p className="text-white/85 text-[12px] font-medium leading-tight">{item.title}</p>
                  <p className="text-white/35 text-[11px] leading-snug mt-0.5 truncate hidden sm:block">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURED VEHICLES — compact gallery style ═══ */}
      {!loading && featuredCars.length > 0 && (
        <section className="featured-section">
          <div className="section-container">
            <div className="featured-header">
              <div>
                <h2 className="section-heading">Featured Vehicles</h2>
                <p className="section-subheading">Premium selection from verified dealers.</p>
              </div>
              <Link to="/showroom" className="btn-outline btn-sm group hidden sm:inline-flex">
                View All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="fc-grid">
              {featuredCars.map(car => (
                <Link key={car._id} to={`/cars/${car._id}`} className="featured-card">
                  <div className="featured-card-img-wrap">
                    <img
                      src={car.images?.[0]?.url || car.images?.[0] || 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg'}
                      alt={car.title}
                      className="featured-card-img"
                      loading="lazy"
                    />
                  </div>
                  <div className="featured-card-body">
                    <h3 className="featured-card-title">{car.title}</h3>
                    {car.dealer?.name && <p className="featured-card-dealer">{car.dealer.name}</p>}
                    <p className="featured-card-price gradient-text">{formatKES(car.price)}</p>
                    <div className="featured-card-footer">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Gauge style={{ width: 10, height: 10 }} />
                        {car.mileage ? `${Number(car.mileage).toLocaleString()} km` : '-'}
                      </span>
                      <span className="capitalize">{car.fuel || car.fuel_type || '-'}</span>
                      {car.location?.city && (
                        <span className="featured-card-location">
                          <MapPin style={{ width: 10, height: 10 }} />
                          <span>{car.location.city}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="featured-mobile-cta">
              <Link to="/showroom" className="btn-outline">Browse All Vehicles</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
