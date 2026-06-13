import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { favoritesAPI, escrowAPI, paymentsAPI, carsAPI, chatAPI, savedSearchAPI, bidsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import BackButton from '../components/BackButton';
import BuyerOverviewTab from './buyer/components/BuyerOverviewTab';
import BuyerEscrowsTab from './buyer/components/BuyerEscrowsTab';
import BuyerBidsTab from './buyer/components/BuyerBidsTab';

export default function BuyerDashboard() {
  const { user, isDealer, isBroker, isAdmin, logout } = useAuth();
  const { connected } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [favorites,  setFavorites]  = useState([]);
  const [escrows,    setEscrows]    = useState([]);
  const [payments,   setPayments]   = useState([]);
  const [myBids,     setMyBids]     = useState([]);
  const [chats,      setChats]      = useState([]);
  const [watchlist,  setWatchlist]  = useState([]);
  const [trending,   setTrending]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [bidLoading, setBidLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [tab,        setTab]        = useState('overview');

  useEffect(() => {
    if (isDealer || isBroker) { navigate('/dealer', { replace: true }); return; }
    if (isAdmin) { navigate('/admin', { replace: true }); return; }
  }, [isDealer, isBroker, isAdmin, navigate]);

  useEffect(() => {
    let ignore = false;
    let hadError = false;
    const withFallback = (p, fallback) => {
      return p.catch(() => { hadError = true; return fallback; });
    };
    Promise.all([
      withFallback(favoritesAPI.list(), { favorites: [] }),
      withFallback(escrowAPI.mine(), { escrows: [] }),
      withFallback(paymentsAPI.myPayments(), { payments: [] }),
      withFallback(chatAPI.inbox(), { chats: [] }),
      withFallback(savedSearchAPI.list(), { searches: [] }),
    ]).then(([fav, esc, pay, chatRes, searchRes]) => {
      if (ignore) return;
      setFavorites(fav.favorites || []);
      setEscrows(esc.escrows || []);
      setPayments(pay.payments || []);
      setChats(chatRes.chats || []);
      setWatchlist(searchRes.searches || []);
      if (hadError) toast('Some data failed to load', 'warning');
    }).finally(() => { if (ignore) return; setLoading(false); });
    return () => { ignore = true; };
  }, []);

  // Fetch trending cars
  useEffect(() => {
    let ignore = false;
    carsAPI.list({ sort: 'views', limit: 6 })
      .then(data => { if (ignore) return; setTrending(data.cars || []); })
      .catch(() => { if (ignore) return; setTrending([]); })
      .finally(() => { if (ignore) return; setTrendingLoading(false); });
    return () => { ignore = true; };
  }, []);

  // Attempt to fetch user's bids — fall back gracefully if no endpoint exists
  useEffect(() => {
    let ignore = false;
    const tryFetchBids = async () => {
      try {
        const res = await fetch('/api/bids/my', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (ignore) return;
          setMyBids(data.bids || data || []);
        }
      } catch { /* no dedicated my-bids endpoint */ }
      if (ignore) return;
      setBidLoading(false);
    };
    tryFetchBids();
    return () => { ignore = true; };
  }, []);

  if (isDealer || isBroker || isAdmin) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)', padding: '40px 0 36px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <BackButton fallback="/" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, marginBottom: 12, padding: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              Buyer Dashboard
            </span>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: connected ? 'var(--green)' : 'var(--red)',
              display: 'inline-block',
              animation: connected ? 'pulse-dot 1.5s infinite' : 'none',
            }} />
            <span style={{ fontSize: 9, color: connected ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)', fontWeight: 600 }}>
              {connected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: '#fff', margin: 0 }}>
            {greeting}, <span style={{ color: 'var(--gold)' }}>{user?.name?.split(' ')[0] || 'Buyer'}</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 8 }}>
            Browse, bid, and buy with escrow protection
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Link to="/" style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Home
            </Link>
            <button onClick={async () => { await logout(); navigate('/'); }} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.7)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 32px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* ── TAB BAR ── */}
            <div className="tab-bar" style={{ marginBottom: 28, paddingBottom: 2 }}>
              {['overview', 'escrows', 'bids'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '10px 20px', borderRadius: '10px 10px 0 0', border: 'none',
                  background: tab === t ? 'rgba(212,196,168,0.08)' : 'transparent',
                  color: tab === t ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
                  fontWeight: tab === t ? 700 : 500, fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.2s', textTransform: 'capitalize',
                  borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
                  marginBottom: -2,
                }}>
                  {t === 'overview' ? 'Overview' : t === 'escrows' ? 'Escrows' : 'My Bids'}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <BuyerOverviewTab
                favorites={favorites}
                escrows={escrows}
                payments={payments}
                myBids={myBids}
                chats={chats}
                watchlist={watchlist}
                trending={trending}
                trendingLoading={trendingLoading}
                onSetTab={setTab}
              />
            )}

            {tab === 'escrows' && <BuyerEscrowsTab escrows={escrows} />}

            {tab === 'bids' && <BuyerBidsTab myBids={myBids} bidLoading={bidLoading} />}
          </>
        )}
      </div>
    </div>
  );
}
