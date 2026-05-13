import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CartyGrid from '../components/CartyGrid';
import { useState, useEffect } from 'react';
import { carsAPI, isDemoMode } from '../api/api';
import { filterMockCars } from '../data/mockCars';

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuth, user } = useAuth();
  const [featured, setFeatured] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      let all;
      if (isDemoMode()) {
        all = filterMockCars({});
      } else {
        carsAPI.list({ limit: 20 })
          .then(data => { all = data.cars || data.data || []; })
          .catch(() => { all = filterMockCars({}); })
          .finally(() => {
            process(all || []);
          });
        return;
      }
      process(all);
    };
    const process = (cars) => {
      const elite = cars.filter(c => c.auctionStatus === 'live' || c.allowBid).slice(0, 3);
      const rest = cars.filter(c => !(c.auctionStatus === 'live' || c.allowBid)).slice(0, 6);
      setFeatured(elite);
      setRecent(rest);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="page" style={{ background: '#050505' }}>

      {/* ─── Hero ─── */}
      <section style={{
        minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '120px 20px 60px',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(212,168,67,0.08) 0%, transparent 60%)',
      }}>
        <div>
          <div style={{
            fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 20,
          }}>
            Kenya's Premium Car Marketplace
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
            fontSize: 'clamp(3rem, 10vw, 7rem)', lineHeight: 0.85,
            textTransform: 'uppercase', color: '#fff', marginBottom: 24,
          }}>
            Drive in <span style={{ color: 'var(--gold)' }}>Gold</span>
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.4)', fontSize: 15, maxWidth: 480,
            margin: '0 auto 40px', lineHeight: 1.7,
          }}>
            East Africa's most sophisticated automotive marketplace — live auctions,
            verified dealers, and secure escrow payments.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/showroom" style={{
              padding: '18px 44px', background: 'var(--gold)', color: '#000',
              borderRadius: 9999, fontWeight: 900, fontSize: 12,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              boxShadow: '0 8px 40px rgba(212,168,67,0.25)',
              transition: 'all 0.3s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 50px rgba(212,168,67,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(212,168,67,0.25)'; }}
            >
              Enter The Gallery
            </Link>
            <Link to="/showroom?filter=auction" style={{
              padding: '18px 44px', background: 'transparent', color: '#fff',
              borderRadius: 9999, fontWeight: 700, fontSize: 12,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              border: '1px solid rgba(255,255,255,0.15)',
              transition: 'all 0.3s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
            >
              Live Auctions
            </Link>
          </div>
          {isAuth && (
            <div style={{ marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
              Signed in as <strong style={{ color: 'var(--gold)' }}>{user?.email}</strong>
            </div>
          )}
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.04)' }}>
          {[
            { label: 'Vehicles Listed', value: '340+' },
            { label: 'Verified Dealers', value: '48' },
            { label: 'Successful Trades', value: 'KES 12B+' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '32px 16px', background: '#050505' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, fontStyle: 'italic', color: 'var(--gold)' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Featured Elite ─── */}
      {featured.length > 0 && (
        <section style={{ padding: '80px 0' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Featured</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 900, fontStyle: 'italic', color: '#fff' }}>
                  Elite <span style={{ color: 'var(--gold)' }}>Auctions</span>
                </h2>
              </div>
              <Link to="/showroom?filter=auction" style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, borderBottom: '1px solid var(--gold)', paddingBottom: 2 }}>
                View All →
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 28 }}>
              {featured.map(car => <CartyGrid key={car._id} car={car} />)}
            </div>
          </div>
        </section>
      )}

      {/* ─── Recent Listings ─── */}
      {recent.length > 0 && (
        <section style={{ padding: '0 0 80px' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Marketplace</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 900, fontStyle: 'italic', color: '#fff' }}>
                  Recent <span style={{ color: 'rgba(255,255,255,0.5)' }}>Arrivals</span>
                </h2>
              </div>
              <Link to="/showroom" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 2 }}>
                Browse All →
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 28 }}>
              {recent.map(car => <CartyGrid key={car._id} car={car} />)}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA ─── */}
      <section style={{ padding: '80px 0', background: 'linear-gradient(180deg, transparent, rgba(212,168,67,0.04))', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontWeight: 900, fontStyle: 'italic', color: '#fff', marginBottom: 12 }}>
            Ready to <span style={{ color: 'var(--gold)' }}>Sell</span> Your Car?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, maxWidth: 400, margin: '0 auto 32px' }}>
            Join Kenya's most trusted dealer network. List your vehicle and reach thousands of serious buyers.
          </p>
          <Link to={isAuth ? '/dealer/add-car' : '/register?role=dealer'} style={{
            padding: '16px 40px', background: '#fff', color: '#000',
            borderRadius: 9999, fontWeight: 900, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            transition: 'all 0.3s', display: 'inline-block',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            List Your Vehicle
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ padding: '40px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: '#fff', fontWeight: 700, fontStyle: 'italic', marginBottom: 16 }}>Kayad</div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', flexWrap: 'wrap' }}>
            <Link to="/showroom">The Gallery</Link>
            <Link to="/showroom?filter=auction">Live Auctions</Link>
            <Link to="/register?role=dealer">List Your Car</Link>
          </div>
          <div style={{ marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
            © {new Date().getFullYear()} Kayad Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
