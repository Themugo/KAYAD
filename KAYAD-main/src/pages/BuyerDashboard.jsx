import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { favoritesAPI, escrowAPI, paymentsAPI } from '../api/api';

export default function BuyerDashboard() {
  const { user, isDealer, isBroker, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState([]);
  const [escrows, setEscrows] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDealer || isBroker) { navigate('/dealer', { replace: true }); return; }
    if (isAdmin) { navigate('/admin', { replace: true }); return; }
  }, [isDealer, isBroker, isAdmin, navigate]);

  useEffect(() => {
    Promise.all([
      favoritesAPI.list().catch(() => ({ favorites: [] })),
      escrowAPI.mine().catch(() => ({ escrows: [] })),
      paymentsAPI.myPayments().catch(() => ({ payments: [] })),
    ]).then(([fav, esc, pay]) => {
      setFavorites(fav.favorites || []);
      setEscrows(esc.escrows || []);
      setPayments(pay.payments || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (isDealer || isBroker || isAdmin) return null;

  const quickLinks = [
    { to: '/showroom', icon: '🎨', label: 'Browse Gallery', desc: 'Explore all listings' },
    { to: '/favorites', icon: '❤️', label: 'Favourites', desc: `${favorites.length} saved cars` },
    { to: '/escrow', icon: '🔒', label: 'Escrows', desc: `${escrows.length} active` },
    { to: '/payments', icon: '💳', label: 'Payments', desc: `${payments.length} transactions` },
    { to: '/chat', icon: '💬', label: 'Messages', desc: 'Dealer conversations' },
  ];

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div style={{ marginBottom: 32 }}>
          <div className="section-eyebrow">Dashboard</div>
          <h2>Welcome, {user?.name?.split(' ')[0]}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Browse, bid, and buy with confidence
          </p>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <>
            <div className="grid-3" style={{ marginBottom: 32 }}>
              <div className="stat-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">Saved Cars</div>
                    <div className="stat-value">{favorites.length}</div>
                  </div>
                  <span style={{ fontSize: 28 }}>❤️</span>
                </div>
              </div>
              <div className="stat-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">Escrows</div>
                    <div className="stat-value">{escrows.length}</div>
                  </div>
                  <span style={{ fontSize: 28 }}>🔒</span>
                </div>
              </div>
              <div className="stat-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">Transactions</div>
                    <div className="stat-value">{payments.length}</div>
                  </div>
                  <span style={{ fontSize: 28 }}>💳</span>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Quick Links</h3>
            <div className="grid-2" style={{ marginBottom: 32 }}>
              {quickLinks.map(a => (
                <Link key={a.to} to={a.to} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: 16, borderRadius: 12,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  transition: 'border-color 0.2s', textDecoration: 'none',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <span style={{ fontSize: 28 }}>{a.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{a.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.desc}</div>
                  </div>
                </Link>
              ))}
            </div>

            {favorites.length > 0 && (
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: '1rem' }}>Saved Cars</h3>
                  <Link to="/favorites" style={{ fontSize: 12, color: 'var(--gold)' }}>View All →</Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {favorites.slice(0, 3).map(f => (
                    <Link key={f._id} to={`/cars/${f._id || f.car?._id}`} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none',
                    }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)' }}>{f.title || f.car?.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.year || f.car?.year || ''}</div>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--gold)' }}>View →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {favorites.length === 0 && (
              <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
                <h3 style={{ marginBottom: 8 }}>Start Exploring</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Browse the gallery to find your dream car
                </p>
                <Link to="/showroom" className="btn btn-gold">Browse Gallery</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
