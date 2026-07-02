import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, FileCheck, UserCheck, Gavel, MapPin, Gauge } from 'lucide-react';
import { carsAPI, formatKES } from '../api/api';
import usePageMeta from '../hooks/usePageMeta';

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
    <div>
      <style>{`
        .fc-grid { display: grid; gap: 12px; grid-template-columns: repeat(2, 1fr); }
        @media (min-width: 640px) { .fc-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; } }
        @media (min-width: 1024px) { .fc-grid { grid-template-columns: repeat(4, 1fr); } }
      `}</style>

      {/* ═══ HERO — Fullscreen slideshow ═══ */}
      <section style={{ position: 'relative', height: 340, overflow: 'hidden' }}>
        {slides.map((slide, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            transition: 'all 1s ease-out',
            opacity: i === safeSlide ? 1 : 0,
            transform: i === safeSlide ? 'scale(1)' : 'scale(1.03)',
          }}>
            <img src={slide.image} alt={slide.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)' }} />

        <div className="section-container" style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 16 }}>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>
            East Africa's Trusted Car Marketplace
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, lineHeight: 1.05, fontSize: 'clamp(2rem, 5vw, 3.25rem)', margin: 0 }}>
            <span style={{ color: '#fff' }}>Drive Your </span>
            <span className="gradient-text">Dream Today</span>
          </h1>
          <p style={{ marginTop: 10, color: 'rgba(255,255,255,0.45)', fontSize: 13, maxWidth: 280 }}>
            Buy, sell and auction vehicles with confidence.
          </p>
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/showroom" className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gold text-bg text-sm font-medium hover:bg-gold-light transition-colors">
              Browse Cars <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link to="/sell" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white/70 hover:text-white text-sm font-medium border border-white/20 hover:border-white/35 transition-all">
              Sell a Vehicle
            </Link>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 20, right: 24, display: 'flex', alignItems: 'center', gap: 6, zIndex: 10 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrentSlide(i)}
              style={{
                height: 3, borderRadius: 9999, border: 'none', padding: 0, cursor: 'pointer',
                transition: 'all 0.3s',
                background: i === safeSlide ? 'var(--gold)' : 'rgba(255,255,255,0.25)',
                width: i === safeSlide ? 24 : 8,
              }}
            />
          ))}
        </div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <section style={{ background: '#0D0D0D' }}>
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
        <section style={{ padding: '64px 0' }}>
          <div className="section-container">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
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
                <Link key={car._id} to={`/cars/${car._id}`}
                  className="group block rounded-lg overflow-hidden border border-white/[0.07] hover:border-gold/20 transition-all duration-300 hover:shadow-[0_6px_24px_rgba(212,196,168,0.1)]"
                  style={{ background: '#111111' }}
                >
                  <div className="relative h-28 sm:h-32 overflow-hidden">
                    <img
                      src={car.images?.[0]?.url || car.images?.[0] || 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg'}
                      alt={car.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div style={{ padding: '10px' }}>
                    <h3 className="font-display text-[13px] font-semibold text-white/90 leading-snug line-clamp-1" style={{ margin: 0 }}>
                      {car.title}
                    </h3>
                    {car.dealer?.name && (
                      <p className="text-white/30 text-[10px] mt-0.5 truncate">{car.dealer.name}</p>
                    )}
                    <p className="mt-1.5 font-display text-[13px] font-semibold italic gradient-text">{formatKES(car.price)}</p>
                    <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] flex items-center gap-2 text-white/35 text-[10px]">
                      <span className="flex items-center gap-0.5">
                        <Gauge className="w-2.5 h-2.5" />
                        {car.mileage ? `${Number(car.mileage).toLocaleString()} km` : '-'}
                      </span>
                      <span className="capitalize">{car.fuel || car.fuel_type || '-'}</span>
                      {car.location?.city && (
                        <span className="flex items-center gap-0.5 ml-auto overflow-hidden">
                          <MapPin className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[48px]">{car.location.city}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link to="/showroom" className="btn-outline">Browse All Vehicles</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
