import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { carsAPI, formatKES, isDemoMode } from './api/api.js';
import { MOCK_CARS, BRANDS, TESTIMONIALS } from './data/mockCars.js';
import CarCard from './components/CarCard.jsx';
import { SkeletonGrid } from './components/Skeleton.jsx';

const FUELS = ['All', 'Petrol', 'Diesel', 'Electric', 'Hybrid'];
const TRANSMISSIONS = ['All', 'Automatic', 'Manual'];
const BODY_TYPES = ['All', 'SUV', 'Sedan', 'Hatchback', 'Pickup'];

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [filters, setFilters] = useState({
    brand: '',
    fuel: '',
    transmission: '',
    bodyType: '',
    minPrice: '',
    maxPrice: '',
  });

  const SLIDE_IMAGES = MOCK_CARS.filter(c => c.featured).map(c => ({
    url: c.image,
    title: c.title,
    price: c.price,
    id: c.id,
  }));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDE_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [SLIDE_IMAGES.length]);

  const fetchCars = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoMode()) {
        setCars(MOCK_CARS.slice(0, 8));
        return;
      }
      const params = { limit: 8 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const data = await carsAPI.list(params);
      const apiCars = data.cars || data.data || [];
      if (apiCars.length === 0) {
        setCars(MOCK_CARS.slice(0, 8));
      } else {
        setCars(apiCars);
      }
    } catch {
      setCars(MOCK_CARS.slice(0, 8));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  const liveAuctions = MOCK_CARS.filter(c => c.isAuction);
  const featuredCars = MOCK_CARS.filter(c => c.featured);

  return (
    <div className="page">

      {/* ─── HERO SLIDER ─── */}
      <section className="hero-slider">
        <div className="hero-slides">
          {SLIDE_IMAGES.map((slide, idx) => (
            <div
              key={slide.id}
              className={`hero-slide ${idx === currentSlide ? 'active' : ''}`}
            >
              <img src={slide.url} alt={slide.title} />
              <div className="hero-slide-overlay" />
              <div className="hero-slide-content">
                <div className="hero-eyebrow">Premium Selection</div>
                <h1 className="hero-title">{slide.title}</h1>
                <div className="hero-price">{formatKES(slide.price)}</div>
                <Link to={`/car/${slide.id}`} className="btn btn-primary btn-lg">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="hero-slider-dots">
          {SLIDE_IMAGES.map((_, idx) => (
            <button
              key={idx}
              className={`hero-dot ${idx === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        <div className="hero-slide-nav">
          <button
            className="hero-nav-btn prev"
            onClick={() => setCurrentSlide(prev => (prev - 1 + SLIDE_IMAGES.length) % SLIDE_IMAGES.length)}
            aria-label="Previous slide"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="hero-nav-btn next"
            onClick={() => setCurrentSlide(prev => (prev + 1) % SLIDE_IMAGES.length)}
            aria-label="Next slide"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      {/* ─── BRAND LOGOS BAR ─── */}
      <section className="brand-bar">
        <div className="container">
          <div className="brand-grid">
            {BRANDS.map(brand => (
              <Link
                key={brand.name}
                to={`/browse?brand=${brand.name}`}
                className="brand-logo-item"
              >
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
        <section className="section">
          <div className="container">
            <div className="section-header">
              <div>
                <div className="section-eyebrow live">
                  <span className="live-dot" /> Live Now
                </div>
                <h2 className="section-title">Live Auctions</h2>
              </div>
              <Link to="/auctions" className="btn btn-outline btn-sm">
                View All
              </Link>
            </div>

            <div className="car-grid">
              {liveAuctions.slice(0, 4).map(car => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── FEATURED VEHICLES ─── */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Handpicked Selection</div>
              <h2 className="section-title">Featured Vehicles</h2>
            </div>
            <Link to="/browse" className="btn btn-outline btn-sm">
              Browse All
            </Link>
          </div>

          {loading ? (
            <SkeletonGrid count={4} />
          ) : (
            <div className="car-grid">
              {featuredCars.slice(0, 4).map(car => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── QUICK SEARCH ─── */}
      <section className="section">
        <div className="container">
          <div className="quick-search-card">
            <div className="quick-search-header">
              <h2 className="section-title">Find Your Perfect Car</h2>
              <p className="section-subtitle">Search through our curated selection of verified vehicles</p>
            </div>

            <div className="quick-search-form">
              <div className="search-row">
                <div className="search-input-group">
                  <label className="input-label">Brand</label>
                  <select
                    className="input"
                    value={filters.brand}
                    onChange={e => setFilters(prev => ({ ...prev, brand: e.target.value }))}
                  >
                    <option value="">All Brands</option>
                    {BRANDS.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="search-input-group">
                  <label className="input-label">Body Type</label>
                  <select
                    className="input"
                    value={filters.bodyType}
                    onChange={e => setFilters(prev => ({ ...prev, bodyType: e.target.value }))}
                  >
                    {BODY_TYPES.map(t => (
                      <option key={t} value={t === 'All' ? '' : t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="search-input-group">
                  <label className="input-label">Fuel Type</label>
                  <select
                    className="input"
                    value={filters.fuel}
                    onChange={e => setFilters(prev => ({ ...prev, fuel: e.target.value }))}
                  >
                    {FUELS.map(f => (
                      <option key={f} value={f === 'All' ? '' : f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div className="search-input-group">
                  <label className="input-label">Transmission</label>
                  <select
                    className="input"
                    value={filters.transmission}
                    onChange={e => setFilters(prev => ({ ...prev, transmission: e.target.value }))}
                  >
                    {TRANSMISSIONS.map(t => (
                      <option key={t} value={t === 'All' ? '' : t}>{t}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/browse?${new URLSearchParams(filters).toString()}`)}
                  style={{ alignSelf: 'flex-end' }}
                >
                  Search Cars
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header centered">
            <div className="section-eyebrow">Simple Process</div>
            <h2 className="section-title">How It Works</h2>
          </div>

          <div className="how-it-works-grid">
            <div className="how-card">
              <div className="how-number">01</div>
              <div className="how-icon">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="how-title">Browse & Search</h3>
              <p className="how-desc">Find your ideal car from our curated selection of verified vehicles. Filter by brand, price, location, and more.</p>
            </div>

            <div className="how-card">
              <div className="how-number">02</div>
              <div className="how-icon">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.588-3.756z" />
                </svg>
              </div>
              <h3 className="how-title">Secure Payment</h3>
              <p className="how-desc">Pay safely with M-Pesa escrow. Your funds are held securely until you receive and verify the vehicle.</p>
            </div>

            <div className="how-card">
              <div className="how-number">03</div>
              <div className="how-icon">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="how-title">Take Delivery</h3>
              <p className="how-desc">Once satisfied, the payment is released to the seller. Enjoy your new vehicle with full confidence.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="section">
        <div className="container">
          <div className="section-header centered">
            <div className="section-eyebrow">Trusted by Thousands</div>
            <h2 className="section-title">What Our Customers Say</h2>
          </div>

          <div className="testimonials-grid">
            {TESTIMONIALS.map(t => (
              <div key={t.id} className="testimonial-card">
                <div className="testimonial-rating">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="star">{i < t.rating ? '★' : '☆'}</span>
                  ))}
                </div>
                <blockquote className="testimonial-text">
                  "{t.text}"
                </blockquote>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.avatar}</div>
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

      {/* ─── CTA SECTION ─── */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Sell Your Car?</h2>
            <p className="cta-subtitle">Join thousands of successful sellers on Kenya's most trusted marketplace. List your car in minutes and reach buyers nationwide.</p>
            <div className="cta-buttons">
              <Link to="/register?role=dealer" className="btn btn-primary btn-lg">
                List Your Car
              </Link>
              <Link to="/browse" className="btn btn-outline btn-lg" style={{ background: 'rgba(255,255,255,0.1)' }}>
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
