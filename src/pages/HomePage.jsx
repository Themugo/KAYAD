// src/pages/HomePage.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { carsAPI, formatKES } from '../api/api';
import CarCard from '../components/CarCard';
import { CountdownDisplay } from '../hooks/useCountdown';

const BRANDS = ['Toyota', 'Mercedes', 'BMW', 'Land Rover', 'Subaru', 'Mazda', 'Nissan', 'Honda', 'Volkswagen', 'Lexus'];
const STATS = [
  { value: '12,400+', label: 'Cars Listed' },
  { value: 'KES 2.1B+', label: 'Transacted' },
  { value: '840+', label: 'Verified Dealers' },
  { value: '99.8%', label: 'Escrow Success Rate' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch]           = useState('');
  const [featured, setFeatured]       = useState([]);
  const [liveAuctions, setLiveAuctions] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      carsAPI.list({ limit: 6, sort: '-views' }),
      carsAPI.list({ limit: 4, auction: '1', auctionStatus: 'live' }),
    ]).then(([feat, auction]) => {
      setFeatured(feat.cars || feat.data || []);
      setLiveAuctions(auction.cars || auction.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/cars?search=${encodeURIComponent(search)}`);
  };

  return (
    <div className="page">

      {/* ═══ HERO ═══════════════════════════════════════════ */}
      <section className="hero-gradient" style={{
        padding: '80px 0 100px',
        borderBottom: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
          backgroundSize: '40px 40px', opacity: 0.3, pointerEvents: 'none',
        }}/>

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 700 }}>
            <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
              Kenya's #1 Premium Car Marketplace
            </div>
            <h1 style={{ marginBottom: 20, lineHeight: 1.1 }}>
              Find, Bid & Own Your{' '}
              <span style={{
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)',
                backgroundClip: 'text',
              }}>
                Dream Car
              </span>
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: 40, maxWidth: 560, lineHeight: 1.7 }}>
              Live auctions with M-Pesa bid commitments. Secure escrow payments.
              Verified dealers. Beat Jiji. Beat OLX. This is different.
            </p>

            {/* ─── Search Bar ─── */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 0, maxWidth: 560 }}>
              <input
                className="input"
                placeholder="Search brand, model, city..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ borderRadius: 'var(--radius) 0 0 var(--radius)', flex: 1, borderRight: 'none' }}
              />
              <button type="submit" className="btn btn-gold" style={{ borderRadius: '0 var(--radius) var(--radius) 0', flexShrink: 0 }}>
                🔍 Search
              </button>
            </form>

            {/* Quick Filters */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {['Under 1M', 'SUVs', 'Sedans', 'Nairobi', 'Live Auction'].map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    if (tag === 'Live Auction') navigate('/cars?auctionStatus=live');
                    else if (tag === 'Under 1M') navigate('/cars?maxPrice=1000000');
                    else if (tag === 'Nairobi') navigate('/cars?city=Nairobi');
                    else navigate(`/cars?search=${tag}`);
                  }}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 100, padding: '5px 14px', fontSize: 12,
                    color: 'var(--text-muted)', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.color = 'var(--gold)'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-muted)'; }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ══════════════════════════════════════ */}
      <section style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '28px 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {STATS.map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--gold-light)' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LIVE AUCTIONS ══════════════════════════════════ */}
      {liveAuctions.length > 0 && (
        <section style={{ padding: '60px 0' }}>
          <div className="container">
            <div className="section-header">
              <div>
                <div className="section-eyebrow">🔴 Happening Now</div>
                <h2>Live Auctions</h2>
              </div>
              <Link to="/cars?auctionStatus=live" className="btn btn-outline btn-sm">View All →</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {liveAuctions.map(car => (
                <Link key={car._id} to={`/auction/${car._id}`} style={{ display: 'block' }}>
                  <div className="card" style={{ border: '1px solid rgba(212,168,67,0.25)', cursor: 'pointer' }}>
                    <div className="car-img-wrap">
                      {car.images?.[0]?.url ? (
                        <img src={car.images[0].url} alt={car.title} loading="lazy" />
                      ) : (
                        <div className="car-img-placeholder">🚗</div>
                      )}
                      <div style={{ position: 'absolute', top: 10, left: 10 }}>
                        <span className="badge badge-green">
                          <span className="live-dot" /> LIVE
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>{car.title}</h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Current Bid</div>
                          <div className="price-tag">{formatKES(car.currentBid || car.price)}</div>
                        </div>
                        {car.auctionEnd && <CountdownDisplay endTime={car.auctionEnd} />}
                      </div>
                      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                        {car.bidsCount || 0} bids · Tap to join
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ HOW IT WORKS ══════════════════════════════════ */}
      <section style={{ padding: '60px 0', background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="section-eyebrow">Our Edge</div>
            <h2>Why Gari Motors Wins</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              {
                icon: '⚡',
                title: 'Live Bidding',
                desc: 'Real-time M-Pesa bid commitments go directly to dealers. No escrow holding — you pay to show seriousness.',
              },
              {
                icon: '🔒',
                title: 'Escrow Protection',
                desc: 'Final unit payment is held in escrow until both parties confirm the deal. Release or refund controlled by admin.',
              },
              {
                icon: '✅',
                title: 'Verified Dealers',
                desc: 'Every dealer is screened and approved. Fraud scores, trust ratings, and full audit trail on every listing.',
              },
            ].map(f => (
              <div key={f.title} className="card" style={{ padding: 28, textAlign: 'center' }}>
                <div style={{ fontSize: 42, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ marginBottom: 12 }}>{f.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURED CARS ══════════════════════════════════ */}
      <section style={{ padding: '60px 0' }}>
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Trending</div>
              <h2>Most Viewed</h2>
            </div>
            <Link to="/cars" className="btn btn-outline btn-sm">Browse All →</Link>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div className="car-grid">
              {featured.map(car => <CarCard key={car._id} car={car} />)}
            </div>
          )}
        </div>
      </section>

      {/* ═══ BRANDS ══════════════════════════════════════════ */}
      <section style={{ padding: '48px 0', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Browse by Brand</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {BRANDS.map(brand => (
              <Link key={brand} to={`/cars?brand=${brand}`}
                style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 20px',
                  fontSize: 14, fontWeight: 500, color: 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.color = 'var(--gold)'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-muted)'; }}
              >
                {brand}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA BANNER ══════════════════════════════════════ */}
      <section style={{
        padding: '64px 0',
        background: 'linear-gradient(135deg, rgba(212,168,67,0.12) 0%, transparent 60%)',
        borderTop: '1px solid var(--border)',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>Are You a Dealer?</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>
            List your inventory, run live auctions, get paid via M-Pesa. The most powerful car dealer platform in Kenya.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
            <Link to="/register" className="btn btn-gold btn-lg">Start Listing Free</Link>
            <Link to="/cars"     className="btn btn-outline btn-lg">Browse Market</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '32px 0', textAlign: 'center' }}>
        <div className="container">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: 8 }}>Gari Motors</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Kenya's Premium Car Marketplace · Live Auctions · M-Pesa · Escrow
          </div>
          <div style={{ marginTop: 16, color: 'var(--text-dim)', fontSize: 12 }}>
            © {new Date().getFullYear()} Gari Motors Ltd. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
