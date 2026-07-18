import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI } from '../api/api';

const DEFAULT_HERO_IMG = 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1600';

export default function HomePage() {
  const [current, setCurrent] = useState(0);
  const [cars, setCars] = useState([]);
  const [heroHovered, setHeroHovered] = useState(false);
  const touchX = useRef(null);

  useEffect(() => {
    let mounted = true;
    const timeoutId = setTimeout(() => {}, 2000);
    (async () => {
      try {
        const data = await carsAPI.list({ limit: 50 });
        if (mounted && data.cars?.length > 0) {
          clearTimeout(timeoutId);
          setCars(data.cars);
        }
      } catch { /* fallback */ }
    })();
    return () => { mounted = false; clearTimeout(timeoutId); };
  }, []);

  const HERO_SLIDES = [
    { id: 1, image: 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1600', headline: 'Toyota Land Cruiser V8', sub: '2021 · Diesel · Nairobi', price: 'KES 3.2M' },
    { id: 2, image: 'https://images.pexels.com/photos/1805053/pexels-photo-1805053.jpeg?auto=compress&cs=tinysrgb&w=1600', headline: 'Mercedes-Benz GLE 350d', sub: 'Live Auction · Ends in 2h', price: 'KES 11.2M' },
    { id: 3, image: 'https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=1600', headline: 'BMW X5 M Sport', sub: '2020 · Petrol · Mombasa', price: 'KES 4.1M' },
  ];

  const SLIDES = useMemo(() => {
    // Prefer live/featured cars first (they're the most compelling), but
    // fall back to any car in the gallery that has a real photo — so the
    // hero always has enough to shuffle from, not just a handful of
    // specially-flagged listings.
    const withImage = (c) => Boolean(c.images?.[0] || c.image);
    const priority = cars.filter(c => withImage(c) && (c.featured || c.isAuction || c.auction_status === 'live'));
    const rest = cars.filter(c => withImage(c) && !priority.includes(c));

    // Fisher–Yates shuffle so the pick (and its order) is different each visit.
    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const pool = [...shuffle(priority), ...shuffle(rest)];
    const sourceCars = pool.slice(0, 5);

    return sourceCars.length >= 3 ? sourceCars.map((car, i) => ({
      id: car.id || i,
      image: car.images?.[0] || car.image || HERO_SLIDES[i % HERO_SLIDES.length].image,
      headline: car.title || car.name,
      sub: car.year ? `${car.year} · ${car.fuel} · ${car.location}` : car.location || 'Nairobi',
      price: car.price ? `KES ${(car.price / 1000000).toFixed(1)}M` : '',
    })) : HERO_SLIDES;
  }, [cars]);

  useEffect(() => {
    if (heroHovered) return;
    const t = setInterval(() => setCurrent(p => (p + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, [SLIDES.length, heroHovered]);

  const FEATURED_CARS = useMemo(() => {
    const withImage = (c) => Boolean(c.images?.[0] || c.image);
    let eligible = cars.filter(c => withImage(c) && (c.isPromoted || c.featured));
    if (eligible.length === 0) eligible = cars.filter(withImage); // fall back to real listings, never fake ones

    // Verified dealers and verified private sellers first — but don't
    // let either dominate; keep a healthy mix representing the whole
    // marketplace rather than skewing to one seller type.
    const verified = eligible.filter(c => c.dealer?.verified || c.isVerifiedDealer);
    const rest = eligible.filter(c => !(c.dealer?.verified || c.isVerifiedDealer));

    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    return [...shuffle(verified), ...shuffle(rest)].slice(0, 8).map((car) => ({
      id: car.id || car._id,
      title: car.title,
      year: car.year,
      mileage: car.mileage ? `${car.mileage}km` : '',
      fuel: car.fuel,
      location: car.location,
      price: car.price ? Number(car.price).toLocaleString() : '',
      dealer: car.dealer?.businessName || car.dealer?.name || 'Private Seller',
      image: car.images?.[0] || car.image,
      // Escrow is for private-seller transactions, not dealer sales —
      // only show the badge where it actually applies.
      hasEscrow: car.dealer?.role === 'individual_seller',
    }));
  }, [cars]);

  const WHY_KAYAD_FEATURES = [
    { icon: '💳', title: 'M-Pesa Escrow', desc: 'Your money is protected until you safely receive your car. No scams, no risk.' },
    { icon: '🔍', title: '150-Point Inspection', desc: 'Certified mechanics inspect every vehicle before you commit to buying.' },
    { icon: '✓', title: 'Verified Dealers', desc: 'All dealers are vetted, licensed, and rated by real buyers like you.' },
    { icon: '🏷️', title: 'Live Auctions', desc: 'Bid on rare finds in real-time. Transparent pricing, no hidden fees.' },
  ];

  return (
    <div style={{ background: 'var(--ivory-100)', minHeight: '100vh' }}>
      {/* HERO SECTION - Deep Navy for premium impact */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#0F172A' }} onMouseEnter={() => setHeroHovered(true)} onMouseLeave={() => setHeroHovered(false)} onTouchStart={e => { touchX.current = e.touches[0].clientX; }} onTouchEnd={e => { if (touchX.current !== null) { const diff = touchX.current - e.changedTouches[0].clientX; if (Math.abs(diff) > 50) { setCurrent(p => (p + (diff > 0 ? 1 : SLIDES.length - 1)) % SLIDES.length); } touchX.current = null; } }}>
        {/* Background images with navy overlay */}
        {SLIDES.map((slide, i) => (
          <div key={slide.id} style={{ position: 'absolute', inset: 0, opacity: i === current ? 1 : 0, transition: 'opacity 1s' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${slide.image})`, backgroundSize: 'cover', backgroundPosition: 'center', transform: i === current && !heroHovered ? 'scale(1.05)' : 'scale(1)', transition: 'transform 8s', opacity: 0.25 }} onError={e => { e.currentTarget.style.backgroundImage = `url(${DEFAULT_HERO_IMG})`; }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #0F172A 0%, #0F172A 40%, rgba(15, 23, 42, 0.7) 100%)' }} />
          </div>
        ))}
        {/* Content */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', padding: '120px 32px 80px' }}>
          <div style={{ maxWidth: 700 }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: '#2DD4BF', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 20 }}>
              EAST AFRICA'S TRUSTED CAR MARKETPLACE
            </p>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2.5rem, 5vw, 3.75rem)', fontWeight: 400, fontStyle: 'italic', color: '#FFFFFF', lineHeight: 1.15, marginBottom: 20 }}>
              Drive Your Dream Today
            </h1>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(1rem, 1.5vw, 1.125rem)', color: 'rgba(255,255,255,0.75)', maxWidth: 520, marginBottom: 40, lineHeight: 1.7, fontWeight: 400 }}>
              Buy, sell and auction vehicles with confidence. Trusted by thousands of Kenyan car buyers.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Link to="/browse"><button className="btn-gold">Browse Cars 🚗</button></Link>
              <Link to="/register?role=broker"><button className="btn-outline-dark">Sell a Vehicle 💰</button></Link>
            </div>
          </div>
        </div>
        {/* Trust badges */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', padding: '0 32px 48px' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[{ icon: '🔒', title: 'Escrow Protection', desc: 'Funds held until safe delivery' }, { icon: '🔍', title: 'Pre-Inspection', desc: 'Independent check before purchase' }, { icon: '✓', title: 'Verified Dealers', desc: 'All sellers vetted and approved' }, { icon: '🏷️', title: 'Live Auctions', desc: 'Transparent real-time bidding' }].map(f => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(45, 212, 191, 0.2)', borderRadius: 12 }}>
                <div style={{ fontSize: 20 }}>{f.icon}</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.3 }}>{f.title}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED VEHICLES */}
      <section style={{ background: 'var(--ivory-100)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(13, 148, 136, 0.1)', border: '1px solid rgba(13, 148, 136, 0.2)', borderRadius: 50, marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: '#0D9488', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Premium Selection</span>
            </div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 400, fontStyle: 'italic', color: '#0F172A', margin: '0 0 12px 0' }}>Featured Vehicles</h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', color: '#475569', maxWidth: 480, margin: '0 auto 24px' }}>Handpicked quality cars from verified dealers across Kenya</p>
            <Link to="/browse" style={{ fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: 8, color: '#0D9488', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>View all vehicles →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {FEATURED_CARS.map(car => (
              <Link key={car.id} to={`/cars/${car.id}`} style={{ background: '#FFFFFF', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', textDecoration: 'none', display: 'block', transition: 'all 0.3s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
                  <img src={car.image} alt={car.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }} />
                  {car.hasEscrow && (
                    <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(13, 148, 136, 0.95)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14 }}>🔒</span><span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#FFFFFF', fontWeight: 600 }}>Escrow Protected</span>
                    </div>
                  )}
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#94A3B8', marginBottom: 6, fontWeight: 500 }}>{car.year} · {car.dealer}</div>
                  <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: '#0F172A', margin: '0 0 12px 0', lineHeight: 1.4 }}>{car.title}</h3>
                  <div style={{ display: 'flex', gap: 12, fontFamily: 'var(--font-sans)', fontSize: 12, color: '#64748B', marginBottom: 16 }}>
                    <span>{car.mileage}</span><span>·</span><span>{car.fuel}</span><span>·</span><span>{car.location}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 700, color: '#0D9488' }}>KES {car.price}</div>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link to="/browse"><button className="btn-gold">Browse All Cars →</button></Link>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE KAYAD */}
      <section style={{ background: 'var(--ivory-50)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 400, fontStyle: 'italic', color: '#0F172A', margin: '0 0 16px 0' }}>Built for Kenya</h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', color: '#64748B', maxWidth: 500, margin: '0 auto 56px' }}>We understand the Kenyan car market. Here's why thousands trust KAYAD.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
            {WHY_KAYAD_FEATURES.map(f => (
              <div key={f.title} style={{ textAlign: 'center', padding: '32px 24px', background: 'var(--ivory-100)', borderRadius: 16, border: '1px solid #E2E8F0' }}>
                <div style={{ width: 72, height: 72, borderRadius: 16, background: 'rgba(13, 148, 136, 0.1)', border: '1px solid rgba(13, 148, 136, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px' }}>{f.icon}</div>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 600, color: '#0F172A', margin: '0 0 12px 0' }}>{f.title}</h3>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION - Deep Navy for premium impact */}
      <section style={{ background: '#0F172A', padding: '80px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 400, fontStyle: 'italic', color: '#FFFFFF', margin: '0 0 16px 0' }}>Ready to Find Your Dream Car?</h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', color: 'rgba(255,255,255,0.7)', maxWidth: 500, margin: '0 auto 32px' }}>Join thousands of Kenyan car buyers who trust KAYAD for safe and transparent transactions.</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/browse"><button className="btn-gold">Start Browsing</button></Link>
            <Link to="/register"><button className="btn-outline-dark">Become a Dealer</button></Link>
          </div>
        </div>
      </section>

      {/* FOOTER - Deep Navy */}
      <footer style={{ background: '#0A0F1A', borderTop: '1px solid rgba(45, 212, 191, 0.2)', padding: '60px 24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 48, marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚗</div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 700, color: '#FFFFFF' }}>KAYAD</span>
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0, maxWidth: 240 }}>Kenya's premium car marketplace. Buy, sell, and auction vehicles with M-Pesa escrow protection.</p>
            </div>
            <div>
              <h4 style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: '#2DD4BF', marginBottom: 16, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Marketplace</h4>
              {[
                { label: 'Browse Cars', to: '/browse' },
                { label: 'Live Auctions', to: '/auctions' },
                { label: 'Sell Your Car', to: '/sell' },
                { label: 'Escrow Vault', to: '/escrow' },
              ].map(link => <Link key={link.label} to={link.to} style={{ fontFamily: 'var(--font-sans)', display: 'block', fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none', marginBottom: 10, transition: 'color 0.2s' }}>{link.label}</Link>)}
            </div>
            <div>
              <h4 style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: '#2DD4BF', marginBottom: 16, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Services</h4>
              {[
                { label: 'Pre-Inspection', to: '/inspection' },
                { label: 'Car Financing', to: '/support' },
                { label: 'Insurance', to: '/support' },
                { label: 'Become a Dealer', to: '/register' },
              ].map(link => <Link key={link.label} to={link.to} style={{ fontFamily: 'var(--font-sans)', display: 'block', fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none', marginBottom: 10 }}>{link.label}</Link>)}
            </div>
            <div>
              <h4 style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: '#2DD4BF', marginBottom: 16, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Company</h4>
              {[
                { label: 'About KAYAD', to: '/support' },
                { label: 'How It Works', to: '/support' },
                { label: 'Support', to: '/support' },
                { label: 'Contact', to: '/support' },
              ].map(link => <Link key={link.label} to={link.to} style={{ fontFamily: 'var(--font-sans)', display: 'block', fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none', marginBottom: 10 }}>{link.label}</Link>)}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(45, 212, 191, 0.15)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(255, 255, 255, 0.4)' }}>© 2026 KAYAD Motors Kenya Ltd. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 24 }}>{[
              { label: 'Privacy Policy', to: '/support' },
              { label: 'Terms of Service', to: '/support' },
              { label: 'Support', to: '/support' },
            ].map(link => <Link key={link.label} to={link.to} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(255, 255, 255, 0.4)', textDecoration: 'none' }}>{link.label}</Link>)}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
