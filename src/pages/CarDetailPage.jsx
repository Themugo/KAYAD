import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MOCK_CARS } from '../data/mockCars.js';
import { formatPriceFull, formatPrice, formatCountdown } from '../utils/formatters.js';
import CarCard from '../components/CarCard.jsx';

export default function CarDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const car = MOCK_CARS.find((c) => c.id === Number(id));
  const [activeImg, setActiveImg] = useState(0);
  const [countdown, setCountdown] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [wished, setWished] = useState(false);

  const related = MOCK_CARS.filter((c) => c.id !== car?.id && c.brand === car?.brand).slice(0, 3);

  useEffect(() => {
    if (!car?.isAuction || !car?.auctionEnd) return;
    const tick = () => setCountdown(formatCountdown(car.auctionEnd));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [car]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!car) {
    return (
      <div style={{ paddingTop: 120, textAlign: 'center', minHeight: '60vh' }}>
        <div className="empty-state">
          <div className="icon">🚗</div>
          <h3>Car not found</h3>
          <p>This listing may have been sold or removed.</p>
          <Link to="/browse" className="btn btn-primary" style={{ marginTop: 20 }}>Browse All Cars</Link>
        </div>
      </div>
    );
  }

  const imgs = car.images && car.images.length ? car.images : [car.image];

  const specs = [
    { label: 'Year', value: car.year },
    { label: 'Brand', value: car.brand },
    { label: 'Fuel Type', value: car.fuel },
    { label: 'Mileage', value: car.mileage },
    { label: 'Transmission', value: car.transmission },
    { label: 'Body Type', value: car.bodyType },
    { label: 'Color', value: car.color || '—' },
    { label: 'Engine', value: car.engine || '—' },
    { label: 'Condition', value: car.condition || 'Used' },
    { label: 'Location', value: car.location },
  ];

  return (
    <>
      <div style={{ paddingTop: 68, background: 'var(--bg-base)', borderBottom: '1px solid var(--border)', padding: '80px 0 0' }}>
        <div className="container" style={{ paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            <Link to="/" style={{ color: 'var(--text-muted)', transition: 'var(--transition)' }}>Home</Link>
            <span>/</span>
            <Link to="/browse" style={{ color: 'var(--text-muted)' }}>Browse</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)' }}>{car.title}</span>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="detail-layout">
          {/* Gallery */}
          <div className="detail-gallery">
            <div className="gallery-main">
              <img
                src={imgs[activeImg]}
                alt={car.title}
                onError={(e) => { e.target.src = 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800'; }}
              />
            </div>
            {imgs.length > 1 && (
              <div className="gallery-thumbs">
                {imgs.map((img, i) => (
                  <div
                    key={i}
                    className={`gallery-thumb${activeImg === i ? ' active' : ''}`}
                    onClick={() => setActiveImg(i)}
                  >
                    <img src={img} alt={`${car.title} ${i + 1}`} />
                  </div>
                ))}
              </div>
            )}

            {/* Details */}
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                {car.isLive && <span className="badge badge-live">LIVE</span>}
                {car.isAuction && <span className="badge badge-gold">AUCTION</span>}
                <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  {car.condition || 'Used'}
                </span>
              </div>

              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                {car.title} {car.year}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
                <span style={{ color: 'var(--gold-500)' }}>📍</span>
                {car.location}, Kenya
              </div>
            </div>

            {/* Specs Grid */}
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Vehicle Specifications</h3>
              <div className="detail-specs-grid">
                {specs.map((s) => (
                  <div key={s.label} className="spec-item">
                    <div className="spec-label">{s.label}</div>
                    <div className="spec-value">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            <div style={{ marginTop: 32 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Key Features</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Sunroof', 'Leather Seats', 'Rear Camera', 'Navigation', 'Bluetooth', 'Keyless Entry', 'Lane Assist', 'Apple CarPlay'].map((f) => (
                  <span key={f} style={{
                    padding: '6px 14px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                  }}>{f}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="detail-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-price">{formatPriceFull(car.price)}</div>
              <div className="sidebar-price-note">
                {car.isAuction ? 'Starting / Reserve Price' : 'Buy Now Price · Negotiable'}
              </div>

              {car.isAuction && car.auctionEnd && (
                <div style={{
                  background: 'rgba(200,150,42,0.08)',
                  border: '1px solid rgba(200,150,42,0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Current Bid</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gold-400)' }}>{formatPriceFull(car.currentBid)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Ends in</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gold-400)', animation: 'countdown-pulse 1s ease-in-out infinite' }}>{countdown}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{car.totalBids} bids placed</div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      className="form-input"
                      placeholder={`Min: ${formatPrice(car.currentBid + 50000)}`}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => { alert('Sign in to place a bid'); setBidAmount(''); }}
                    >
                      Bid
                    </button>
                  </div>
                </div>
              )}

              <div className="sidebar-actions">
                {!car.isAuction && (
                  <button
                    className="btn btn-primary btn-lg"
                    style={{ justifyContent: 'center' }}
                    onClick={() => navigate('/auth')}
                  >
                    Buy Now — {formatPrice(car.price)}
                  </button>
                )}
                <button
                  className="btn btn-outline btn-lg"
                  style={{ justifyContent: 'center' }}
                  onClick={() => navigate('/auth')}
                >
                  Make an Offer
                </button>
                <button
                  className="btn btn-ghost btn-lg"
                  style={{ justifyContent: 'center', color: wished ? 'var(--red-400)' : 'var(--text-secondary)' }}
                  onClick={() => setWished(!wished)}
                >
                  {wished ? '♥ Saved to Wishlist' : '♡ Add to Wishlist'}
                </button>
              </div>

              <div className="mpesa-badge" style={{ marginTop: 16 }}>
                💳 M-Pesa Escrow Protection
              </div>
            </div>

            {/* Seller Card */}
            <div className="sidebar-card">
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>Seller</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-elevated)', border: '2px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>👤</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Premium Dealer</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--green-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>✓</span> Verified Seller
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-outline btn-sm" style={{ justifyContent: 'center' }} onClick={() => navigate('/auth')}>
                  📞 Contact Seller
                </button>
                <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }}>
                  💬 Send Message
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              {[
                { icon: '🛡️', title: 'Fully Verified', desc: 'Inspection & history report' },
                { icon: '💰', title: 'Escrow Protected', desc: 'Funds held until delivery' },
                { icon: '🔄', title: '7-Day Return', desc: 'Not satisfied? Return it' },
              ].map((t) => (
                <div key={t.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{t.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.desc}</div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>📋</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Digital Docs</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Full paperwork included</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div style={{ padding: '40px 0 60px' }}>
            <div className="section-header">
              <div>
                <div className="section-eyebrow">More from {car.brand}</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700 }}>Similar Vehicles</h2>
              </div>
              <Link to={`/browse?brand=${car.brand}`} className="btn btn-outline btn-sm">View All →</Link>
            </div>
            <div className="cars-grid">
              {related.map((c) => <CarCard key={c.id} car={c} />)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
