import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { carsAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import CarCard from '../components/CarCard';
import { SkeletonGrid } from '../components/Skeleton';

export default function HomePage() {
  const navigate = useNavigate();
  const { isDealer, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carsAPI.list({ limit: 8, sort: '-createdAt' })
      .then(data => {
        const list = data.cars || data.data || [];
        setCars(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/cars?search=${encodeURIComponent(search)}`);
  };

  return (
    <div className="page">

      {/* Hero */}
      <section style={{
        padding: '60px 0 40px',
        background: 'linear-gradient(180deg, var(--card) 0%, rgba(10,22,40,0.98) 100%)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>
            Kenya's Premium Car Marketplace
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 700, marginBottom: 12, lineHeight: 1.15 }}>
            Find Your Next Car<br />
            <span style={{ color: 'var(--gold-light)' }}>With Confidence</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 480, margin: '0 auto 24px' }}>
            Browse thousands of verified listings from trusted dealers across Kenya.
            Live auctions, M-Pesa payments, and escrow protection included.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 0, maxWidth: 520, margin: '0 auto 20px' }}>
            <input
              className="input"
              placeholder="Search brand, model, or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ borderRadius: 'var(--radius) 0 0 var(--radius)', flex: 1, borderRight: 'none', height: 48, fontSize: 14 }}
            />
            <button type="submit" className="btn btn-gold" style={{ borderRadius: '0 var(--radius) var(--radius) 0', flexShrink: 0, padding: '0 28px', height: 48, fontSize: 14 }}>
              Search Cars
            </button>
          </form>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Under KSh 1M', 'SUVs', 'Sedans', 'Nairobi', 'Live Auction'].map(tag => (
              <button
                key={tag}
                onClick={() => {
                  if (tag === 'Live Auction') navigate('/cars?auctionStatus=live');
                  else if (tag === 'Under KSh 1M') navigate('/cars?maxPrice=1000000');
                  else if (tag === 'Nairobi') navigate('/cars?city=Nairobi');
                  else navigate(`/cars?search=${tag}`);
                }}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 100, padding: '6px 16px', fontSize: 12,
                  color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500,
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
      </section>

      {/* Sell CTA card — between hero and listings */}
      <section style={{ padding: '28px 0 0' }}>
        <div className="container">
          <div className="card" style={{
            border: '1px solid rgba(212,168,67,0.15)',
            background: 'linear-gradient(135deg, var(--card) 0%, #1A2F52 100%)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-50%', right: '-10%',
              width: '50%', height: '200%',
              background: 'radial-gradient(ellipse, rgba(212,168,67,0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              padding: '28px 32px',
              display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'space-between',
              position: 'relative',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 36 }}>{isDealer ? '🏪' : isAdmin ? '⚙' : '🚗'}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, marginBottom: 2 }}>
                    {isDealer ? 'Dealer Dashboard' : isAdmin ? 'Admin Panel' : 'Ready to Sell Your Car?'}
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {isDealer ? 'Manage listings, track earnings, view bids' :
                     isAdmin ? 'Manage users, cars, and platform settings' :
                     'List inventory, run auctions, get paid via M-Pesa escrow'}
                  </p>
                </div>
              </div>
              <Link
                to={isDealer ? '/dealer' : isAdmin ? '/admin' : '/register?role=dealer'}
                className="btn btn-gold"
                style={{ flexShrink: 0 }}
              >
                {isDealer ? 'Go to Dealer Hub →' : isAdmin ? 'Go to Admin Panel →' : 'Get Started Free →'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Latest listings */}
      <section style={{ padding: '32px 0 48px' }}>
        <div className="container">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 24,
          }}>
            <div>
              <h2 style={{ marginBottom: 4 }}>Latest Listings</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Recently added vehicles from verified dealers</p>
            </div>
            <Link to="/cars" className="btn btn-outline btn-sm" style={{ color: 'var(--gold)', borderColor: 'rgba(212,168,67,0.2)' }}>
              Browse All →
            </Link>
          </div>

          {loading ? (
            <SkeletonGrid count={4} />
          ) : cars.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🚗</div>
              <h3>No cars yet</h3>
              <p>Check back soon for new listings</p>
            </div>
          ) : (
            <div className="car-grid">
              {cars.map(car => <CarCard key={car._id} car={car} />)}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '32px 0', textAlign: 'center' }}>
        <div className="container">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: 12, fontWeight: 600 }}>Gari Motors</div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', fontSize: 12, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
            <Link to="/cars" style={{ color: 'var(--text-muted)' }}>Browse Cars</Link>
            <Link to="/cars?auctionStatus=live" style={{ color: 'var(--text-muted)' }}>Live Auctions</Link>
            <Link to="/register?role=dealer" style={{ color: 'var(--text-muted)' }}>List Your Car</Link>
          </div>
          <div style={{ marginTop: 16, color: 'var(--text-dim)', fontSize: 11 }}>
            © {new Date().getFullYear()} Gari Motors Ltd. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
