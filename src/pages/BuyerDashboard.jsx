import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { favoritesAPI, escrowAPI, paymentsAPI } from '../api/api';
import { Heart, Lock, CreditCard, MessageCircle, ChevronRight, TrendingUp, Car, Gavel } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, accent = 'var(--gold)', to }) {
  const inner = (
    <div style={{
      background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: '22px 22px',
      transition: 'border-color 0.2s, transform 0.2s',
      cursor: to ? 'pointer' : 'default', position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={e => { if (to) { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
      onMouseLeave={e => { if (to) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none'; }}}
    >
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '0 0 0 80px', background: `${accent}08` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
        {to && <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />}
      </div>
      <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

function QuickLink({ to, icon: Icon, label, desc, accent = 'rgba(212,196,168,0.12)' }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14, padding: '18px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.25)'; e.currentTarget.style.background = '#111'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = '#0C0C0C'; }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 11, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={19} style={{ color: 'var(--gold)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{desc}</div>
        </div>
        <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
      </div>
    </Link>
  );
}

export default function BuyerDashboard() {
  const { user, isDealer, isBroker, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [favorites,  setFavorites]  = useState([]);
  const [escrows,    setEscrows]    = useState([]);
  const [payments,   setPayments]   = useState([]);
  const [loading,    setLoading]    = useState(true);

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
    }).finally(() => setLoading(false));
  }, []);

  if (isDealer || isBroker || isAdmin) return null;

  const totalSpent = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '40px 0 36px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 8 }}>
            Buyer Dashboard
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: '#fff', margin: 0 }}>
            Welcome, <span style={{ color: 'var(--gold)' }}>{user?.name?.split(' ')[0] || 'Buyer'}</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 8 }}>
            Browse, bid, and buy with escrow protection
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 32px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* ── STATS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 36 }}>
              <StatCard icon={Heart}       label="Saved Cars"   value={favorites.length} sub="in your wishlist"       accent="#ef4444" to="/favorites" />
              <StatCard icon={Lock}        label="Escrows"      value={escrows.length}   sub="active protections"     accent="#22c55e" to="/escrow" />
              <StatCard icon={CreditCard}  label="Payments"     value={payments.length}  sub="transactions"           accent="#3b82f6" to="/payments" />
              <StatCard icon={TrendingUp}  label="Total Spent"
                value={totalSpent >= 1e6 ? `${(totalSpent/1e6).toFixed(1)}M` : totalSpent >= 1000 ? `${(totalSpent/1000).toFixed(0)}K` : totalSpent || '—'}
                sub="KES lifetime" accent="var(--gold)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
              {/* ── LEFT: quick links + recent escrows ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
                    Quick Actions
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <QuickLink to="/showroom"               icon={Car}            label="Browse Gallery"  desc="Discover all vehicles" />
                    <QuickLink to="/showroom?filter=auction" icon={Gavel}         label="Live Auctions"   desc="Bid in real-time" />
                    <QuickLink to="/favorites"              icon={Heart}          label="Saved Cars"      desc={`${favorites.length} vehicles saved`} accent="rgba(239,68,68,0.1)" />
                    <QuickLink to="/chat"                   icon={MessageCircle}  label="Messages"        desc="Chat with dealers" accent="rgba(59,130,246,0.1)" />
                  </div>
                </div>

                {/* Recent escrows */}
                {escrows.length > 0 && (
                  <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Active Escrows</div>
                      <Link to="/escrow" style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>View All →</Link>
                    </div>
                    {escrows.slice(0, 4).map(e => (
                      <div key={e._id} style={{ padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{e.car?.title || 'Vehicle'}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>KES {Number(e.amount||0).toLocaleString()}</div>
                        </div>
                        <span style={{
                          padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700,
                          background: e.status === 'completed' ? 'rgba(34,197,94,0.12)' : e.status === 'released' ? 'rgba(59,130,246,0.12)' : 'rgba(212,196,168,0.12)',
                          color: e.status === 'completed' ? '#22c55e' : e.status === 'released' ? '#3b82f6' : 'var(--gold)',
                        }}>{e.status?.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── RIGHT: saved cars panel ── */}
              <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', alignSelf: 'start' }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Heart size={14} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Saved Cars</span>
                  </div>
                  <Link to="/favorites" style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>All →</Link>
                </div>
                {favorites.length === 0 ? (
                  <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🚗</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>No saved cars yet.<br />Browse the gallery to start.</div>
                    <Link to="/showroom" style={{ display: 'inline-block', marginTop: 16, padding: '9px 20px', background: 'var(--gold)', color: '#000', borderRadius: 9999, fontSize: 11, fontWeight: 900, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Browse Gallery
                    </Link>
                  </div>
                ) : favorites.slice(0, 6).map(f => {
                  const car = f.car || f;
                  const img = car.images?.[0]?.url || car.images?.[0] || car.image;
                  return (
                    <Link key={f._id} to={`/cars/${car._id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 12, alignItems: 'center', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {img ? (
                          <img src={img} alt={car.title} loading="lazy" decoding="async" style={{ width: 44, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 44, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.title || 'Vehicle'}</div>
                          <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700 }}>
                            KES {Number(car.price||0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
