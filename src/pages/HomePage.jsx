import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI } from '../api/api';

export default function HomePage() {
  const [current, setCurrent] = useState(0);
  const [cars, setCars] = useState([]);
  const [heroHovered, setHeroHovered] = useState(false);

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
    const sliderCars = cars.filter(c => c.featured || c.isAuction || c.auction_status === 'live').slice(0, 5);
    const sourceCars = sliderCars.length >= 3 ? sliderCars : [];
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

  const FEATURED_CARS = [
    { id: 1, title: '2021 Toyota Hilux Double Cabin', year: 2021, mileage: '40k km', fuel: 'Diesel', location: 'Nairobi', price: '4,200,000', dealer: 'Nairobi Auto Hub Ltd', image: 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id: 2, title: '2020 Land Rover Range Rover Sport', year: 2020, mileage: '35k km', fuel: 'Diesel', location: 'Nairobi', price: '15,000,000', dealer: 'Nairobi Auto Hub Ltd', image: 'https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id: 3, title: '2021 Mercedes-Benz GLE 350d', year: 2021, mileage: '22k km', fuel: 'Diesel', location: 'Nairobi', price: '11,200,000', dealer: 'Nairobi Auto Hub Ltd', image: 'https://images.pexels.com/photos/1805053/pexels-photo-1805053.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id: 4, title: '2020 Porsche Cayenne S', year: 2020, mileage: '48k km', fuel: 'Petrol', location: 'Nairobi', price: '13,200,000', dealer: 'Nairobi Auto Hub Ltd', image: 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=600' },
  ];

  const WHY_KAYAD_FEATURES = [
    { icon: '💳', title: 'M-Pesa Escrow', desc: 'Your money is protected until you safely receive your car. No scams, no risk.' },
    { icon: '🔍', title: '150-Point Inspection', desc: 'Certified mechanics inspect every vehicle before you commit to buying.' },
    { icon: '✓', title: 'Verified Dealers', desc: 'All dealers are vetted, licensed, and rated by real buyers like you.' },
    { icon: '🏷️', title: 'Live Auctions', desc: 'Bid on rare finds in real-time. Transparent pricing, no hidden fees.' },
  ];

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      {/* HERO SECTION */}
      <section style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }} onMouseEnter={() => setHeroHovered(true)} onMouseLeave={() => setHeroHovered(false)}>
        {SLIDES.map((slide, i) => (
          <div key={slide.id} style={{ position: 'absolute', inset: 0, opacity: i === current ? 1 : 0, transition: 'opacity 1s' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${slide.image})`, backgroundSize: 'cover', backgroundPosition: 'center', transform: i === current && !heroHovered ? 'scale(1.05)' : 'scale(1)', transition: 'transform 8s' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(5,5,5,0.85) 0%, rgba(5,5,5,0.4) 50%, rgba(5,5,5,0.6) 100%)' }} />
          </div>
        ))}
        <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '120px 24px 80px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: 'rgba(200, 150, 42, 0.15)', border: '1px solid rgba(200, 150, 42, 0.3)', borderRadius: 50, marginBottom: 32 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#c8962a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>EAST AFRICA'S TRUSTED CAR MARKETPLACE</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 24, textShadow: '0 4px 30px rgba(0,0,0,0.5)', maxWidth: 900 }}>
            Drive Your<span style={{ display: 'block', background: 'linear-gradient(135deg, #c8962a 0%, #f4c430 50%, #c8962a 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Dream Today</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: 'rgba(255,255,255,0.7)', maxWidth: 600, marginBottom: 48, lineHeight: 1.7 }}>Buy, sell and auction vehicles with confidence.</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/browse"><button style={{ background: 'linear-gradient(135deg, #c8962a 0%, #f4c430 100%)', color: '#0a0a0a', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>🚗 Browse Cars →</button></Link>
            <Link to="/register?role=broker"><button style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.05)', fontWeight: 600, fontSize: 15, padding: '14px 28px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>💰 Sell a Vehicle</button></Link>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 40, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1000 }}>
            {[{ icon: '🔒', title: 'Escrow Protection', desc: 'Funds held until safe delivery' }, { icon: '🔍', title: 'Pre-Inspection', desc: 'Independent check before purchase' }, { icon: '✓', title: 'Verified Dealers', desc: 'All sellers vetted and approved' }, { icon: '🏷️', title: 'Auctions', desc: 'Transparent real-time bidding' }].map(f => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'rgba(200, 150, 42, 0.08)', border: '1px solid rgba(200, 150, 42, 0.2)', borderRadius: 12, minWidth: 200 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(200, 150, 42, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
                <div><div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{f.title}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{f.desc}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HANDPICKED QUALITY CARS */}
      <section style={{ background: '#0a0a0a', padding: '60px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(200, 150, 42, 0.15)', border: '1px solid rgba(200, 150, 42, 0.3)', borderRadius: 50, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#c8962a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Handpicked Quality Cars</span>
            </div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: '#fff', margin: '0 0 24px 0' }}>Featured Vehicles</h2>
            <Link to="/browse" style={{ color: '#c8962a', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>View all →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
            {FEATURED_CARS.map(car => (
              <Link key={car.id} to={`/car/${car.id}`} style={{ background: '#111', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', display: 'block' }}>
                <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                  <img src={car.image} alt={car.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>🔒</span><span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>Escrow</span>
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{car.year} · {car.dealer}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 12px 0', lineHeight: 1.3 }}>{car.title}</h3>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}><span>{car.mileage}</span><span>·</span><span>{car.fuel}</span><span>·</span><span>{car.location}</span></div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#c8962a' }}>KES {car.price}</div>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link to="/browse" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', background: 'linear-gradient(135deg, #c8962a 0%, #f4c430 100%)', color: '#0a0a0a', fontWeight: 700, fontSize: 14, borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 20px rgba(200, 150, 42, 0.4)' }}>Browse All Cars</Link>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE KAYAD */}
      <section style={{ background: '#111', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: '#fff', margin: '0 0 48px 0' }}>Built for Kenya</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {WHY_KAYAD_FEATURES.map(f => (
              <div key={f.title} style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(200, 150, 42, 0.1)', border: '1px solid rgba(200, 150, 42, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#080808', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '60px 24px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}><span style={{ fontSize: 28 }}>🚗</span><span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>KAYAD</span></div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0, maxWidth: 200 }}>Kenya's premium car marketplace. Buy, sell, and auction vehicles with M-Pesa escrow protection.</p>
            </div>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 16, letterSpacing: '0.05em' }}>MARKETPLACE</h4>
              {['Browse Cars', 'Live Auctions', 'Sell Your Car', 'Escrow Vault'].map(link => <Link key={link} to="/browse" style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginBottom: 10 }}>{link}</Link>)}
            </div>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 16, letterSpacing: '0.05em' }}>SERVICES</h4>
              {['Pre-Inspection', 'Car Financing', 'Insurance', 'Become a Dealer'].map(link => <Link key={link} to="/browse" style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginBottom: 10 }}>{link}</Link>)}
            </div>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 16, letterSpacing: '0.05em' }}>COMPANY</h4>
              {['About KAYAD', 'How It Works', 'Support', 'Contact'].map(link => <Link key={link} to="/browse" style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginBottom: 10 }}>{link}</Link>)}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>© 2026 KAYAD Motors Kenya Ltd. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 20 }}>{['Privacy Policy', 'Terms of Service', 'Support'].map(link => <Link key={link} to="/browse" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>{link}</Link>)}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
