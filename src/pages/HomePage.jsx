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
          ═══════════════════════════════════════════════════ */}
      <section className="hero-section" aria-label="Featured vehicles">
        {SLIDES.map((slide, i) => (
          <div key={slide.id} className={`hero-slide${i === current ? '' : ''}`}
            style={{ opacity: i === current ? 1 : 0 }}>
            <img src={slide.image} alt={slide.headline} loading={i === 0 ? 'eager' : 'lazy'} />
            <div className="hero-overlay" />
          </div>
        ))}

        <div className="hero-content">
          <div className="hero-content-inner">
            <div className="hero-badge">
              EAST AFRICA'S TRUSTED CAR MARKETPLACE
            </div>

            <h1 className="hero-title">
              Drive Your Dream<br />
              <span className="hero-title-gradient">With Confidence</span>
            </h1>

            <p className="hero-sub">
              Buy, sell, and auction vehicles with M-Pesa escrow protection. Every car inspected, every payment secured.
            </p>

            <form onSubmit={handleSearch} className="hero-search">
              <select className="ui-input ui-select" style={{ flex: '1 1 160px', minWidth: 130 }}
                value={search.brand} onChange={e => setSearch(p => ({ ...p, brand: e.target.value }))} aria-label="Brand">
                <option value="">All Brands</option>
                {BRANDS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
              </select>
              <select className="ui-input ui-select" style={{ flex: '1 1 140px', minWidth: 130 }}
                value={search.bodyType} onChange={e => setSearch(p => ({ ...p, bodyType: e.target.value }))} aria-label="Body type">
                <option value="">All Types</option>
                <option value="SUV">SUV</option>
                <option value="Sedan">Sedan</option>
                <option value="Pickup">Pickup</option>
                <option value="Coupe">Coupe</option>
              </select>
              <select className="ui-input ui-select" style={{ flex: '1 1 140px', minWidth: 130 }}
                value={search.priceMax} onChange={e => setSearch(p => ({ ...p, priceMax: e.target.value }))} aria-label="Max price">
                <option value="">Any Price</option>
                <option value="3000000">Under 3M</option>
                <option value="5000000">Under 5M</option>
                <option value="10000000">Under 10M</option>
                <option value="20000000">Under 20M</option>
              </select>
              <Button type="submit" variant="primary" size="lg" icon="🔍">Search</Button>
            </form>

            <div className="hero-stats">
              {[
                { val: '12K+', label: 'Vehicles' },
                { val: '450+', label: 'Dealers' },
                { val: '100%', label: 'Escrow Protected' },
              ].map(s => (
                <div key={s.label}>
                  <div className="hero-stat-value">{s.val}</div>
                  <div className="hero-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {SLIDES.length > 1 && (
          <>
            <button className="hero-arrow hero-arrow--prev" onClick={() => setCurrent(p => (p - 1 + SLIDES.length) % SLIDES.length)} aria-label="Previous">‹</button>
            <button className="hero-arrow hero-arrow--next" onClick={() => setCurrent(p => (p + 1) % SLIDES.length)} aria-label="Next">›</button>
            <div className="hero-dots" role="tablist">
              {SLIDES.map((_, i) => (
                <button key={i} className={`hero-dot${i === current ? ' hero-dot--active' : ''}`}
                  onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`} role="tab" aria-selected={i === current} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════
          BRAND BAR
          ═══════════════════════════════════════════════════ */}
      <section className="section-compact" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }} aria-label="Browse by brand">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Trusted Brands</div>
            <h2 className="section-title" style={{ fontSize: '1.4rem' }}>Browse by Brand</h2>
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {BRANDS.map(brand => (
              <Link key={brand.name} to={`/browse?brand=${brand.name}`} className="brand-link">
                <span className="brand-link__icon">{brand.logo}</span>
                <span className="brand-link__name">{brand.name}</span>
                <span className="brand-link__count">{brand.count} listings</span>
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
              <Link to="/auctions"><Button variant="outline" size="sm">View All →</Button></Link>
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
            <Link to="/browse"><Button variant="outline" size="sm">Browse All →</Button></Link>
          </div>
          {loading ? (
            <div className="car-grid">
              {[...Array(8)].map((_, i) => <div key={i} className="skeleton-card" />)}
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
          <div className="escrow-grid">
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
                  <div key={s.step} className="escrow-step">
                    <div className="escrow-step__icon">{s.icon}</div>
                    <div>
                      <div className="escrow-step__title">{s.title}</div>
                      <div className="escrow-step__desc">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/escrow"><Button variant="primary" style={{ marginTop: 24 }}>Learn More →</Button></Link>
            </div>
            <div className="ui-card ui-card--premium" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🔒</div>
              <h3 style={{ marginBottom: 8 }}>100% Escrow Protected</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                Every transaction on KAYAD is backed by our M-Pesa escrow guarantee.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                {['Buyer protection guarantee', 'Full refund if car not delivered', 'Admin-monitored transactions', 'Dispute resolution within 48h'].map(b => (
                  <div key={b} className="trust-feature">
                    <span className="trust-feature__check">✓</span> {b}
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
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Flexible Financing</div>
            <h2 className="section-title">Drive Now, Pay Later</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '8px auto 0' }}>
              Partner with Kenya's leading banks for competitive auto loans. Get pre-approved in minutes.
            </p>
          </div>
          <div className="finance-grid">
            {FINANCING_FEATURES.map(f => (
              <div key={f.title} className="ui-card" style={{ padding: 28, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{f.icon}</div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: 8 }}>{f.title}</h4>
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
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
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
              <div key={p.name} className="ui-card ui-card--hover" style={{ padding: 24, textAlign: 'center', minWidth: 170 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{p.logo}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--gold-400)', marginTop: 4 }}>★ {p.rating}</div>
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
            <Link to="/register?role=dealer"><Button variant="outline" size="sm">Become a Dealer →</Button></Link>
          </div>
          <div className="ui-grid-4">
            {[
              { name: 'Nairobi Auto Hub',   location: 'Nairobi',   rating: 4.8, count: 42, logo: '🏪' },
              { name: 'Mombasa Motors',      location: 'Mombasa',   rating: 4.6, count: 28, logo: '🚙' },
              { name: 'Highland Cars',       location: 'Eldoret',   rating: 4.9, count: 35, logo: '🏎️' },
              { name: 'Premium Auto KE',     location: 'Nairobi',   rating: 4.7, count: 51, logo: '🚗' },
            ].map(d => (
              <div key={d.name} className="premium-card premium-card--dealer">
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'var(--gold-100)', border: '2px solid rgba(200,150,42,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, margin: '0 auto 14px',
                }}>{d.logo}</div>
                <h4 style={{ fontSize: 14, marginBottom: 4 }}>{d.name}</h4>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>📍 {d.location}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 12, marginBottom: 12 }}>
                  <span style={{ color: 'var(--gold-400)' }}>★ {d.rating}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{d.count} cars</span>
                </div>
                <Badge variant="verified" icon="✓">Verified Dealer</Badge>
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
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Trusted by Thousands</div>
            <h2 className="section-title">What Our Customers Say</h2>
          </div>
          <div className="ui-grid-3">
            {TESTIMONIALS.map(t => (
              <div key={t.id} className="testimonial-card">
                <div style={{ marginBottom: 14 }} aria-label={`${t.rating} out of 5 stars`}>
                  {[...Array(5)].map((_, i) => (
                    <span key={i} style={{ color: i < t.rating ? 'var(--gold-400)' : 'var(--text-muted)', fontSize: 17 }}>
                      {i < t.rating ? '★' : '☆'}
                    </span>
                  ))}
                </div>
                <blockquote style={{
                  fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7,
                  marginBottom: 18, fontStyle: 'italic',
                }}>"{t.text}"</blockquote>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="ui-avatar ui-avatar--sm ui-avatar--gold" style={{ width: 42, height: 42, fontSize: 15 }}>
                    {t.avatar}
                  </div>
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
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Got Questions?</div>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <Accordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          CTA
          ═══════════════════════════════════════════════════ */}
      <section className="cta-section" aria-label="Call to action">
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
      <footer className="premium-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Link to="/" className="footer-logo">
                <span style={{ fontSize: 22 }}>🚗</span>
                KAYAD
              </Link>
              <p className="footer-desc">
                Kenya's premier car marketplace. Buy, sell, and auction vehicles with M-Pesa escrow protection.
              </p>
              <div className="footer-social">
                {['📘', '🐦', '📸', '💬'].map((icon, i) => (
                  <a key={i} href="#" className="footer-social__icon" aria-label={`Social media ${i + 1}`}>{icon}</a>
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
                <div className="footer-col-title">{col.title}</div>
                {col.links.map(([label, to]) => (
                  <Link key={label} to={to} className="footer-link">{label}</Link>
                ))}
              </div>
            ))}
          </div>
          <div className="footer-bottom">
            <span>© 2026 KAYAD Motors. All rights reserved.</span>
            <span>Made in Kenya 🇰🇪</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
