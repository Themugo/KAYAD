// src/pages/HomePage.jsx — Premium Landing Page
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI, BRANDS, TESTIMONIALS, MOCK_CARS } from '../api/api';
import CarCard from '../components/CarCard';
import { Button, Badge, Accordion, StatCard } from '../components/ui';

const TRUST_STATS = [
  { icon: '🚗', iconVariant: 'gold',  label: 'Vehicles Listed',  value: '12,000+' },
  { icon: '🤝', iconVariant: 'green', label: 'Successful Sales', value: '8,500+' },
  { icon: '🏪', iconVariant: 'blue',  label: 'Verified Dealers',  value: '450+' },
  { icon: '🔒', iconVariant: 'gold',  label: 'Escrow Protected',   value: '100%' },
];

const FAQ_ITEMS = [
  { q: 'How does M-Pesa escrow protect me?', a: 'Your payment is held securely in escrow until you confirm receipt of the vehicle. If anything goes wrong, you get a full refund within 3 business days.' },
  { q: 'How do I list my car for sale?', a: 'Register as a dealer or private seller, click "Sell", fill in the listing form with photos and details, and submit for approval. Approved listings appear within 24 hours.' },
  { q: 'What is a Pre-Inspection?', a: 'A certified mechanic physically checks the vehicle before you buy — verifying mileage, condition, and flagging any hidden issues. Costs KES 1,500–6,500.' },
  { q: 'How do Live Auctions work?', a: 'Dealers list vehicles with a starting bid. Registered buyers place bids in real-time. A 5% M-Pesa commitment deposit secures each bid. The highest bidder wins when time expires.' },
  { q: 'Can I negotiate the price?', a: 'Yes — use the Message Dealer feature to contact sellers directly. Many listings are open to negotiation, especially on non-auction vehicles.' },
  { q: 'How do I become a verified dealer?', a: 'Register with your business name and KRA PIN, upload your dealer certificate, and our team reviews your application within 48 hours.' },
];

const FINANCING_FEATURES = [
  { icon: '💳', title: 'Flexible Terms', desc: '12–72 month repayment plans tailored to your budget' },
  { icon: '⚡', title: 'Instant Approval', desc: 'Get pre-approved in minutes via M-Pesa statement' },
  { icon: '📊', title: 'Transparent Rates', desc: 'No hidden fees. Fixed interest rates from 14% p.a.' },
  { icon: '🔒', title: 'Secured by Escrow', desc: 'Your down payment is protected until car handover' },
];

export default function HomePage() {
  const [current, setCurrent] = useState(0);
  const [cars, setCars] = useState(MOCK_CARS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ brand: '', bodyType: '', priceMax: '' });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await carsAPI.list({ limit: 50 });
        if (mounted && data.cars?.length > 0) setCars(data.cars);
      } catch { /* fallback to mock */ }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const SLIDES = useMemo(() => {
    return cars
      .filter(c => c.featured || c.is_promoted)
      .slice(0, 5)
      .map(c => ({
        id: c._id || c.id,
        image: c.image || c.images?.[0]?.url || c.images?.[0] || 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1200',
        headline: c.title,
        sub: `${c.year} · ${c.fuel} · ${c.location?.city || c.location || 'Nairobi'}`,
        price: c.price,
      }));
  }, [cars]);

  useEffect(() => {
    if (SLIDES.length === 0) return;
    const t = setInterval(() => setCurrent(p => (p + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [SLIDES.length]);

  const liveAuctions = cars.filter(c => c.isAuction || c.auction_status === 'live');
  const featuredCars = cars.filter(c => c.featured || c.is_promoted).slice(0, 8);
  const recentCars = cars.slice(0, 8);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.brand) params.set('brand', search.brand);
    if (search.bodyType) params.set('bodyType', search.bodyType);
    if (search.priceMax) params.set('priceMax', search.priceMax);
    window.location.href = `/browse?${params.toString()}`;
  }, [search]);

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      {/* ═══════════════════════════════════════════════════
          HERO SECTION
          Full-screen slider with floating search bar
          ═══════════════════════════════════════════════════ */}
      <section className="kd-hero" aria-label="Featured vehicles" style={{
        position: 'relative', height: '100vh', minHeight: 600, overflow: 'hidden',
      }}>
        {SLIDES.map((slide, i) => (
          <div key={slide.id} className={`kd-slide${i === current ? ' active' : ''}`} style={{
            position: 'absolute', inset: 0, opacity: i === current ? 1 : 0,
            transition: 'opacity 1.2s ease',
          }}>
            <img src={slide.image} alt={slide.headline} loading={i === 0 ? 'eager' : 'lazy'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(7,9,12,0.85) 0%, rgba(7,9,12,0.4) 50%, rgba(7,9,12,0.2) 100%)' }} />
          </div>
        ))}

        {/* Hero content */}
        <div style={{
          position: 'relative', zIndex: 2, height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          maxWidth: 1280, margin: '0 auto', padding: '0 24px',
        }}>
          <div style={{ maxWidth: 600 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 100,
              padding: '6px 16px', fontSize: 12, fontWeight: 600, color: 'var(--gold-400)',
              marginBottom: 20, letterSpacing: '0.06em',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green-400)', animation: 'pulse-dot 1.4s infinite' }} />
              EAST AFRICA'S TRUSTED CAR MARKETPLACE
            </div>

            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800,
              lineHeight: 1.1, marginBottom: 16, color: '#fff',
            }}>
              Drive Your Dream<br />
              <span style={{ background: 'linear-gradient(135deg, var(--gold-400), var(--gold-200))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                With Confidence
              </span>
            </h1>

            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.6, marginBottom: 32, maxWidth: 480,
            }}>
              Buy, sell, and auction vehicles with M-Pesa escrow protection. Every car inspected, every payment secured.
            </p>

            {/* Floating search */}
            <form onSubmit={handleSearch} style={{
              display: 'flex', gap: 10, flexWrap: 'wrap',
              background: 'rgba(15,19,24,0.85)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-lg)',
              padding: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}>
              <select
                className="ui-input ui-select"
                style={{ flex: '1 1 140px', minWidth: 130 }}
                value={search.brand}
                onChange={e => setSearch(p => ({ ...p, brand: e.target.value }))}
                aria-label="Brand"
              >
                <option value="">All Brands</option>
                {BRANDS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
              </select>
              <select
                className="ui-input ui-select"
                style={{ flex: '1 1 140px', minWidth: 130 }}
                value={search.bodyType}
                onChange={e => setSearch(p => ({ ...p, bodyType: e.target.value }))}
                aria-label="Body type"
              >
                <option value="">All Types</option>
                <option value="SUV">SUV</option>
                <option value="Sedan">Sedan</option>
                <option value="Pickup">Pickup</option>
                <option value="Coupe">Coupe</option>
              </select>
              <select
                className="ui-input ui-select"
                style={{ flex: '1 1 140px', minWidth: 130 }}
                value={search.priceMax}
                onChange={e => setSearch(p => ({ ...p, priceMax: e.target.value }))}
                aria-label="Max price"
              >
                <option value="">Any Price</option>
                <option value="3000000">Under 3M</option>
                <option value="5000000">Under 5M</option>
                <option value="10000000">Under 10M</option>
                <option value="20000000">Under 20M</option>
              </select>
              <Button type="submit" variant="primary" size="lg" icon="🔍">Search</Button>
            </form>

            {/* Quick stats */}
            <div style={{ display: 'flex', gap: 32, marginTop: 32, flexWrap: 'wrap' }}>
              {[
                { val: '12K+', label: 'Vehicles' },
                { val: '450+', label: 'Dealers' },
                { val: '100%', label: 'Escrow Protected' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold-400)' }}>{s.val}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Slider controls */}
        {SLIDES.length > 1 && (
          <>
            <button className="kd-hero__arrow kd-hero__arrow--prev" onClick={() => setCurrent(p => (p - 1 + SLIDES.length) % SLIDES.length)} aria-label="Previous">‹</button>
            <button className="kd-hero__arrow kd-hero__arrow--next" onClick={() => setCurrent(p => (p + 1) % SLIDES.length)} aria-label="Next">›</button>
            <div className="kd-hero__dots" role="tablist" style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 3 }}>
              {SLIDES.map((_, i) => (
                <button key={i} className={`kd-hero__dot${i === current ? ' active' : ''}`} onClick={() => setCurrent(i)}
                  aria-label={`Slide ${i + 1}`} role="tab" aria-selected={i === current}
                  style={{
                    width: i === current ? 24 : 8, height: 8, borderRadius: 4,
                    background: i === current ? 'var(--gold-400)' : 'rgba(255,255,255,0.3)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.3s ease',
                  }} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════
          BRAND BAR
          ═══════════════════════════════════════════════════ */}
      <section style={{ padding: '40px 0', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }} aria-label="Browse by brand">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Trusted Brands</div>
            <h2 style={{ fontSize: '1.5rem' }}>Browse by Brand</h2>
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {BRANDS.map(brand => (
              <Link key={brand.name} to={`/browse?brand=${brand.name}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '16px 24px', borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  textDecoration: 'none', color: 'var(--text-primary)',
                  transition: 'all 0.25s ease', minWidth: 120,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-500)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}
              >
                <span style={{ fontSize: 28 }}>{brand.logo}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{brand.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{brand.count} listings</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          LIVE AUCTIONS
          ═══════════════════════════════════════════════════ */}
      {liveAuctions.length > 0 && (
        <section className="section" aria-label="Live auctions">
          <div className="container">
            <div className="section-header">
              <div>
                <div className="section-eyebrow live"><span className="live-dot" /> Live Now</div>
                <h2 className="section-title">Live Auctions</h2>
              </div>
              <Link to="/auctions" className="ui-btn ui-btn--outline ui-btn--sm">View All →</Link>
            </div>
            <div className="car-grid">
              {liveAuctions.slice(0, 4).map(car => <CarCard key={car._id || car.id} car={car} />)}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════
          FEATURED VEHICLES
          ═══════════════════════════════════════════════════ */}
      <section className="section section-alt" aria-label="Featured vehicles">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Handpicked Selection</div>
              <h2 className="section-title">Featured Vehicles</h2>
            </div>
            <Link to="/browse" className="ui-btn ui-btn--outline ui-btn--sm">Browse All →</Link>
          </div>
          {loading ? (
            <div className="car-grid">
              {[...Array(8)].map((_, i) => <div key={i} className="ui-skeleton ui-skeleton--card" />)}
            </div>
          ) : (
            <div className="car-grid">
              {featuredCars.map(car => <CarCard key={car._id || car.id} car={car} />)}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TRUST STATISTICS
          ═══════════════════════════════════════════════════ */}
      <section className="section" aria-label="Trust statistics">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Built on Trust</div>
            <h2 className="section-title">Numbers That Matter</h2>
          </div>
          <div className="ui-grid-4">
            {TRUST_STATS.map(s => (
              <StatCard key={s.label} icon={s.icon} iconVariant={s.iconVariant} label={s.label} value={s.value} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          ESCROW EXPLANATION
          ═══════════════════════════════════════════════════ */}
      <section className="section section-alt" aria-label="Escrow protection">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }} className="escrow-grid">
            <div>
              <div className="section-eyebrow">Secure Transactions</div>
              <h2 className="section-title">Every Payment Protected by M-Pesa Escrow</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
                Your money is never sent directly to the seller. It's held securely in escrow until you confirm you've received the vehicle and you're satisfied. If anything goes wrong, you get a full refund.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { icon: '💳', step: '1', title: 'You Pay via M-Pesa',     desc: 'Full amount sent to escrow, not to seller' },
                  { icon: '🔒', step: '2', title: 'Funds Held Securely',    desc: 'Admin holds payment until car handover' },
                  { icon: '🚗', step: '3', title: 'Car Delivered & Checked', desc: 'You inspect and confirm the vehicle' },
                  { icon: '✅', step: '4', title: 'Funds Released',          desc: 'Seller gets paid only after your approval' },
                ].map(s => (
                  <div key={s.step} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'var(--gold-100)', border: '1px solid rgba(200,150,42,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>{s.icon}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/escrow" className="ui-btn ui-btn--primary" style={{ marginTop: 24 }}>Learn More →</Link>
            </div>
            <div className="ui-card" style={{
              padding: 32, textAlign: 'center',
              background: 'linear-gradient(135deg, var(--bg-card), var(--bg-elevated))',
            }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🔒</div>
              <h3 style={{ marginBottom: 8 }}>100% Escrow Protected</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                Every transaction on KAYAD is backed by our M-Pesa escrow guarantee.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                {['Buyer protection guarantee', 'Full refund if car not delivered', 'Admin-monitored transactions', 'Dispute resolution within 48h'].map(b => (
                  <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <span style={{ color: 'var(--green-400)', fontWeight: 700 }}>✓</span> {b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FINANCING
          ═══════════════════════════════════════════════════ */}
      <section className="section" aria-label="Financing options">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Flexible Financing</div>
            <h2 className="section-title">Drive Now, Pay Later</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '8px auto 0' }}>
              Partner with Kenya's leading banks for competitive auto loans. Get pre-approved in minutes.
            </p>
          </div>
          <div className="ui-grid-4">
            {FINANCING_FEATURES.map(f => (
              <div key={f.title} className="ui-card" style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: 6 }}>{f.title}</h4>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          VERIFIED INSPECTION PARTNERS
          ═══════════════════════════════════════════════════ */}
      <section className="section section-alt" aria-label="Verified inspection partners">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Trusted Partners</div>
            <h2 className="section-title">Verified Inspection Partners</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '8px auto 0' }}>
              Every vehicle can be inspected by our certified mechanics before you buy.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { name: 'AutoCheck KE',   logo: '🔍', rating: 4.8 },
              { name: 'CarInspect EA',   logo: '🔧', rating: 4.7 },
              { name: 'Verify Motors',   logo: '✅', rating: 4.9 },
              { name: 'AA Kenya',        logo: '🚗', rating: 4.6 },
            ].map(p => (
              <div key={p.name} className="ui-card" style={{ padding: 20, textAlign: 'center', minWidth: 160 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{p.logo}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--gold-400)', marginTop: 4 }}>★ {p.rating}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          PREMIUM DEALERS
          ═══════════════════════════════════════════════════ */}
      <section className="section" aria-label="Premium dealers">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Trusted Partners</div>
              <h2 className="section-title">Premium Dealers</h2>
            </div>
            <Link to="/register?role=dealer" className="ui-btn ui-btn--outline ui-btn--sm">Become a Dealer →</Link>
          </div>
          <div className="ui-grid-4">
            {[
              { name: 'Nairobi Auto Hub',   location: 'Nairobi',   rating: 4.8, count: 42, logo: '🏪' },
              { name: 'Mombasa Motors',      location: 'Mombasa',   rating: 4.6, count: 28, logo: '🚙' },
              { name: 'Highland Cars',       location: 'Eldoret',   rating: 4.9, count: 35, logo: '🏎️' },
              { name: 'Premium Auto KE',     location: 'Nairobi',   rating: 4.7, count: 51, logo: '🚗' },
            ].map(d => (
              <div key={d.name} className="ui-card ui-card--hover" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'var(--gold-100)', border: '2px solid rgba(200,150,42,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, margin: '0 auto 12px',
                }}>{d.logo}</div>
                <h4 style={{ fontSize: 14, marginBottom: 4 }}>{d.name}</h4>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>📍 {d.location}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 12 }}>
                  <span style={{ color: 'var(--gold-400)' }}>★ {d.rating}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{d.count} cars</span>
                </div>
                <Badge variant="verified" icon="✓" style={{ marginTop: 10 }}>Verified Dealer</Badge>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TESTIMONIALS
          ═══════════════════════════════════════════════════ */}
      <section className="section section-alt" aria-label="Customer testimonials">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Trusted by Thousands</div>
            <h2 className="section-title">What Our Customers Say</h2>
          </div>
          <div className="ui-grid-3">
            {TESTIMONIALS.map(t => (
              <div key={t.id} className="ui-card" style={{ padding: 24 }}>
                <div style={{ marginBottom: 12 }} aria-label={`${t.rating} out of 5 stars`}>
                  {[...Array(5)].map((_, i) => (
                    <span key={i} style={{ color: i < t.rating ? 'var(--gold-400)' : 'var(--text-muted)', fontSize: 16 }}>
                      {i < t.rating ? '★' : '☆'}
                    </span>
                  ))}
                </div>
                <blockquote style={{
                  fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7,
                  marginBottom: 16, fontStyle: 'italic',
                }}>"{t.text}"</blockquote>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--gold-500), var(--gold-400))',
                    color: '#07090C', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14,
                  }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FAQ
          ═══════════════════════════════════════════════════ */}
      <section className="section" aria-label="Frequently asked questions">
        <div className="container" style={{ maxWidth: 760 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Got Questions?</div>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <Accordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          CTA
          ═══════════════════════════════════════════════════ */}
      <section style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0d1f3c 100%)',
        padding: '64px 0',
        borderTop: '1px solid var(--border)',
      }} aria-label="Call to action">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', marginBottom: 16 }}>
            Ready to Sell Your Car?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, maxWidth: 480, margin: '0 auto 32px' }}>
            Join thousands of successful sellers on Kenya's most trusted marketplace. List in minutes, sell with confidence.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register?role=dealer"><Button variant="primary" size="lg" icon="🏪">List Your Car</Button></Link>
            <Link to="/browse"><Button variant="outline" size="lg" iconRight="→">Browse Marketplace</Button></Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════ */}
      <footer style={{ background: 'var(--bg-deep)', padding: '48px 0 24px', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 32 }} className="footer-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
                <span style={{ fontSize: 22 }}>🚗</span>
                <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '0.04em' }}>KAYAD</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 300 }}>
                Kenya's premier car marketplace. Buy, sell, and auction vehicles with M-Pesa escrow protection.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                {['📘', '🐦', '📸', '💬'].map((icon, i) => (
                  <div key={i} style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-500)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}>
                    {icon}
                  </div>
                ))}
              </div>
            </div>
            {[
              { title: 'Browse', links: [['All Cars', '/browse'], ['Live Auctions', '/auctions'], ['Featured', '/browse'], ['By Brand', '/browse']] },
              { title: 'Services', links: [['Escrow', '/escrow'], ['Pre-Inspection', '/inspection'], ['Financing', '/support'], ['Support', '/support']] },
              { title: 'Account', links: [['Sign In', '/login'], ['Register', '/register'], ['Become Dealer', '/register?role=dealer'], ['My Profile', '/profile']] },
              { title: 'Company', links: [['About Us', '/support'], ['Contact', '/support'], ['Privacy', '/support'], ['Terms', '/support']] },
            ].map(col => (
              <div key={col.title}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>{col.title}</h4>
                {col.links.map(([label, to]) => (
                  <Link key={label} to={to} style={{
                    display: 'block', padding: '4px 0', fontSize: 13, color: 'var(--text-muted)',
                    textDecoration: 'none', transition: 'color 0.15s',
                  }} onMouseEnter={e => e.currentTarget.style.color = 'var(--gold-400)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <hr className="ui-divider" style={{ margin: '32px 0 16px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>© 2026 KAYAD Motors. All rights reserved.</span>
            <span>Made in Kenya 🇰🇪</span>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 900px) {
          .escrow-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
