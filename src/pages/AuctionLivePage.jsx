// src/pages/AuctionLivePage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { carsAPI, bidsAPI, formatKES } from '../api/api';
import { getMockCar } from '../data/mockCars';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { CountdownDisplay } from '../hooks/useCountdown';
import WinnerModal from '../components/WinnerModal';
import MarketValuationMatrix from '../components/MarketValuationMatrix';
import usePageMeta from '../hooks/usePageMeta';
import api from '../api/api';

const AVATAR_COLORS = ['#f59e0b','#3b82f6','#22c55e','#ef4444','#a855f7','#ec4899','#14b8a6','#f97316'];

function hashColor(str) {
  let h = 0;
  if (!str) return AVATAR_COLORS[0];
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getAvatarInitials(tag) {
  if (!tag) return '?';
  const words = tag.replace(/[^a-zA-Z0-9 ]/g, '').split(' ');
  return words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : words[0]?.slice(0, 2).toUpperCase() || '?';
}

function ConfettiOverlay() {
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 2,
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    size: 6 + Math.random() * 8, rotation: Math.random() * 360,
    duration: 2 + Math.random() * 2,
  }));
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200, overflow: 'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', top: -20, left: `${p.left}%`, width: p.size, height: p.size,
          background: p.color, borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          transform: `rotate(${p.rotation}deg)`,
          animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          opacity: 0,
        }} />
      ))}
    </div>
  );
}

export default function AuctionLivePage() {
  const { id } = useParams();
  const { user, isAuth } = useAuth();
  const { joinAuction, on, connected } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [car, setCar] = useState(null);
  usePageMeta(
    car ? `Live Auction: ${car.title}` : 'Live Auction',
    car ? `Live auction for ${car.title} - ${car.brand} ${car.model} ${car.year}. Bid now on Kayad.` : 'Join live car auctions in Kenya on Kayad.'
  );
  const [bids, setBids]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [maxBid, setMaxBid] = useState('');
  const [phone, setPhone] = useState('');
  const [placing, setPlacing] = useState(false);
  const [pendingBidId, setPendingBidId] = useState(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [prevBid, setPrevBid] = useState(0);
  const [bidCount, setBidCount]   = useState(0);
  const [extended, setExtended] = useState(false);
  const [smsRegistered, setSmsRegistered] = useState(false);
  const [smsSubscribed, setSmsSubscribed] = useState(false);
  const [togglingSms, setTogglingSms] = useState(false);
  const [showWinner, setShowWinner] = useState(null);
  const [watchers, setWatchers] = useState(0);
  const [bidFlash, setBidFlash] = useState(false);
  const [auctionPhase, setAuctionPhase] = useState('');
  const [confetti, setConfetti] = useState(false);
  const bidListRef = useRef(null);
  const prevBidRef = useRef(0);

  // Load car + bid history
  useEffect(() => {
    Promise.all([
      carsAPI.get(id),
      bidsAPI.getForCar(id).catch(() => ({ bids: [] })),
    ]).then(([carData, bidData]) => {
      const c = carData.car || carData.data || carData;
      if (!c || !c._id) return Promise.reject();
      setCar(c);
      setCurrentBid(c.currentBid || c.price || 0);
      setPrevBid(c.currentBid || c.price || 0);
      setBidCount(c.bidsCount || 0);
      const bs = bidData.bids || bidData.data || [];
      setBids(bs.slice(0, 30));
      const minNext = (c.currentBid || c.price || 0) + 5000;
      setBidAmount(String(minNext));
    }).catch(() => {
      const mock = getMockCar(id);
      if (mock) {
        setCar(mock);
        setCurrentBid(mock.currentBid || mock.price || 0);
        setPrevBid(mock.currentBid || mock.price || 0);
        setBidCount(mock.bidsCount || 0);
        const minNext = (mock.currentBid || mock.price || 0) + 5000;
        setBidAmount(String(minNext));
      }
    }).finally(() => setLoading(false));
  }, [id]);

  // Join auction socket room
  useEffect(() => {
    if (!id) return;
    joinAuction(id);
  }, [id, connected]);

  // Check SMS bidding registration
  useEffect(() => {
    if (!isAuth) return;
    api.get('/sms-bidding/my').then(d => {
      if (d.smsBidder?.active && d.smsBidder?.phone) {
        setSmsRegistered(true);
        setSmsSubscribed(d.smsBidder.subscriptions?.some(s => s.car?._id === id || s.car === id));
      }
    }).catch(() => {});
  }, [id, isAuth]);

  // Real-time bid events
  useEffect(() => {
    if (!on) return;
    const offBid = on('newBid', (data) => {
      if (data.carId !== id) return;
      setPrevBid(prevBidRef.current);
      prevBidRef.current = data.amount;
      setCurrentBid(data.amount);
      setBidCount(prev => prev + 1);
      setBids(prev => [data, ...prev].slice(0, 30));
      const minNext = data.amount + 5000;
      setBidAmount(String(minNext));
      setBidFlash(true);
      setTimeout(() => setBidFlash(false), 800);
      bidListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

      // Outbid check
      if (isAuth && data.userId && data.userId !== user?._id && data.userId !== user?.id) {
        const myBids = bids.filter(b => String(b.userId) === String(user._id));
        if (myBids.length > 0) {
          toast('📢 You\'ve been outbid! Place a higher bid to stay ahead.', 'info', { duration: 5000 });
        }
      }
    });

    const offEnd = on('auctionEnded', (data) => {
      if (data.carId !== id) return;
      const isWinner = data.winner && (String(data.winner) === String(user?._id) || String(data.winner) === String(user?.id));
      if (isWinner) {
        setConfetti(true);
        setShowWinner({
          certificateNumber: `KAYD-${Date.now().toString(36).toUpperCase()}`,
          vehicle: { title: car?.title || 'Vehicle' },
          financials: { winningBid: data.highestBid || currentBid },
        });
        toast('🏆 You won the auction! Congratulations!', 'success');
      } else {
        toast('🏁 Auction has ended.', 'info');
        setTimeout(() => navigate(`/cars/${id}`), 4000);
      }
    });

    const offExt = on('auctionExtended', (data) => {
      if (data.carId !== id) return;
      setExtended(true);
      setCar(prev => ({ ...prev, auctionEnd: data.newEndTime }));
      toast('⏱ Auction extended by 2 min due to late bidding!', 'info');
      setTimeout(() => setExtended(false), 6000);
    });

    const offPhase = on('auctionPhase', (data) => {
      if (data.carId !== id) return;
      setAuctionPhase(data.phase);
    });

    return () => { offBid(); offEnd(); offExt(); offPhase(); };
  }, [id, on, isAuth, user]);

  const handlePlaceBid = async () => {
    if (!isAuth) { navigate('/login'); return; }
    const amount = Number(bidAmount);
    if (amount <= currentBid) {
      toast(`Bid must be above ${formatKES(currentBid)}`, 'error'); return;
    }
    if (!phone || phone.replace(/\D/g, '').length < 9) {
      toast('Enter your M-Pesa number', 'error'); return;
    }
    setPlacing(true);
    try {
      const data = await bidsAPI.place(id, {
        amount,
        phone: phone.replace(/\D/g, ''),
        maxBid: maxBid ? Number(maxBid) : null,
      });
      setPendingBidId(data.bid?._id || data._id);
      toast('STK push sent — check your M-Pesa to confirm bid', 'info');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to place bid', 'error');
    } finally {
      setPlacing(false);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const minBid = currentBid + 5000;
  const isOwner = user?.id === car?.dealer?._id?.toString() || user?.id === car?.dealer?.toString();
  const auctionLive = car?.auctionStatus === 'live';
  const reserveMet = !car?.reservePrice || currentBid >= car.reservePrice;

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;
  if (!car) return <div className="page loading-center"><h3>Auction not found</h3></div>;

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      {confetti && <ConfettiOverlay />}
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>

        {/* ─── Header ─── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 13 }}>← All Cars</Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {auctionLive ? (
              <span className="badge badge-green"><span className="live-dot" /> LIVE AUCTION</span>
            ) : (
              <span className="badge badge-muted">Auction Ended</span>
            )}
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{car.title}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Watchers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ fontSize: 14 }}>👁</span>
              <span>{watchers || Math.floor(Math.random() * 20) + 3} watching</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? 'var(--green)' : 'var(--red)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{connected ? 'Live' : 'Reconnecting...'}</span>
            </div>
          </div>
        </div>

        <div className="grid-sidebar-right" style={{ gap: 28, gridTemplateColumns: '1fr 380px' }}>

          {/* ─── LEFT: Car + Bid History ─── */}
          <div>
            {/* Car image */}
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 20, position: 'relative' }}>
              <div style={{ aspectRatio: '16/9', background: 'var(--surface)' }}>
                {car.images?.length > 0 ? (
                  <img src={(car.images[car.coverImage ?? 0]?.url || car.images[car.coverImage ?? 0])} alt={car.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, color: 'var(--text-dim)' }}>🚗</div>
                )}
              </div>
              {car.isDemo && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  background: 'rgba(251,191,36,0.92)', backdropFilter: 'blur(8px)',
                  borderRadius: 6, padding: '3px 8px', zIndex: 5,
                }}>
                  <span style={{ fontSize: 9, color: '#0A1628', fontWeight: 800, letterSpacing: '0.04em' }}>🧪 DEMO</span>
                </div>
              )}
            </div>

            {/* Car specs strip */}
            <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[
                  { label: 'Brand', val: car.brand },
                  { label: 'Year', val: car.year },
                  { label: 'Fuel', val: car.fuel },
                  { label: 'Trans.', val: car.transmission },
                  { label: 'Mileage', val: car.mileage ? `${Number(car.mileage).toLocaleString()} km` : null },
                  { label: 'Location', val: car.location?.city },
                ].filter(s => s.val).map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Valuation */}
            <div style={{ marginBottom: 20 }}>
              <MarketValuationMatrix
                carId={id}
                carPrice={car.price || currentBid}
                carBrand={car.brand}
                carModel={car.model}
                carYear={car.year}
              />
            </div>

            {/* Bid History */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem' }}>Bid History</h3>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{bidCount} bids</span>
              </div>
              <div ref={bidListRef} style={{ maxHeight: 400, overflowY: 'auto', padding: '4px 0' }}>
                {bids.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                    No bids yet — be the first!
                  </div>
                ) : bids.map((bid, i) => {
                  const color = hashColor(bid.bidderTag || `#${bidCount - i}`);
                  return (
                    <div key={bid._id || i} className="bid-row" style={{
                      padding: '10px 20px',
                      animation: i === 0 ? 'slideInRight 0.35s ease both' : 'fadeInDown 0.3s ease both',
                      background: i === 0 ? 'rgba(212,196,168,0.04)' : 'transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: i === 0 ? 'var(--gold)' : color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800,
                          color: i === 0 ? '#0A1628' : '#fff',
                          flexShrink: 0,
                        }}>
                          {i === 0 ? '👑' : getAvatarInitials(bid.bidderTag || `Bidder ${bidCount - i}`).slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? 'var(--gold-light)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {bid.bidderTag || `Bidder #${bidCount - i}`}
                            {bid.isVerifiedBuyer && (
                              <span style={{
                                fontSize: 9, padding: '2px 6px', borderRadius: 4,
                                background: 'rgba(59,130,246,0.15)', color: '#3B82F6',
                                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                              }}>✓ Buyer</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatTime(bid.createdAt)}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
                          color: i === 0 ? 'var(--gold-light)' : 'var(--text)',
                        }}>
                          {formatKES(bid.amount)}
                        </div>
                        {bid.mpesaPaid && (
                          <span style={{ fontSize: 10, color: 'var(--green)' }}>✓ M-Pesa confirmed</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Bid Panel ─── */}
          <div>
            <div style={{ position: 'sticky', top: 88 }}>

              {/* Reserve Indicator */}
              {car.reservePrice > 0 && (
                <div style={{
                  marginBottom: 12, padding: '8px 14px', borderRadius: 8,
                  background: reserveMet ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${reserveMet ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12, fontWeight: 600,
                  color: reserveMet ? '#22c55e' : '#ef4444',
                }}>
                  <span>{reserveMet ? '✅' : '🔒'}</span>
                  <span>{reserveMet ? 'Reserve Met' : 'Reserve Not Yet Met'}</span>
                </div>
              )}

              {/* Current Bid Display */}
              <div className="card" style={{
                padding: 24, marginBottom: 16,
                border: `1px solid ${bidFlash ? 'rgba(212,196,168,0.6)' : 'rgba(212,196,168,0.3)'}`,
                transition: 'border-color 0.3s',
              }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    {bidCount > 0 ? 'Current Leading Bid' : 'Starting Price'}
                  </div>
                  <div className={bidFlash ? 'price-flash' : ''} style={{
                    fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 700,
                    color: 'var(--gold-light)', lineHeight: 1,
                    transition: 'transform 0.15s',
                    transform: bidFlash ? 'scale(1.06)' : 'scale(1)',
                  }}>
                    {formatKES(currentBid || car.price)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                    {bidCount} bid{bidCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Going Once/Twice/Thrice */}
                {auctionPhase && (
                  <div style={{
                    textAlign: 'center', marginBottom: 12, padding: '6px 0',
                    animation: 'pulse 1s infinite',
                  }}>
                    <span style={{
                      display: 'inline-block', padding: '4px 16px', borderRadius: 6,
                      fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em',
                      background: auctionPhase === 'going_once' ? 'rgba(251,191,36,0.15)' :
                                  auctionPhase === 'going_twice' ? 'rgba(251,191,36,0.2)' :
                                  'rgba(239,68,68,0.2)',
                      color: auctionPhase === 'going_thrice' ? '#ef4444' : '#f59e0b',
                    }}>
                      {auctionPhase === 'going_once' ? '⏳ Going Once...' :
                       auctionPhase === 'going_twice' ? '⏳ Going Twice...' :
                       '🔔 Going Thrice...!'}
                    </span>
                  </div>
                )}

                {/* Countdown */}
                {car.auctionEnd && (
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Time Remaining</div>
                    <CountdownDisplay endTime={car.auctionEnd} />
                    {extended && (
                      <div style={{ marginTop: 8, padding: '6px 12px', background: 'rgba(212,196,168,0.15)', borderRadius: 6, fontSize: 12, color: 'var(--gold)' }}>
                        ⏱ Extended by 2 min
                      </div>
                    )}
                  </div>
                )}

                {/* Bid increment chips */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Quick Amounts</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[minBid, minBid + 10000, minBid + 25000, minBid + 50000].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setBidAmount(String(amt))}
                        style={{
                          background: bidAmount === String(amt) ? 'var(--gold)' : 'var(--surface)',
                          color: bidAmount === String(amt) ? '#0A1628' : 'var(--text-muted)',
                          border: `1px solid ${bidAmount === String(amt) ? 'var(--gold)' : 'var(--border)'}`,
                          borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer',
                          fontWeight: bidAmount === String(amt) ? 700 : 400,
                        }}
                      >
                        {formatKES(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bid Amount Input */}
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label className="input-label">Your Bid (KES)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder={`Min: ${minBid.toLocaleString()}`}
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                    min={minBid}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Minimum: {formatKES(minBid)}
                  </div>
                </div>

                {/* Proxy Bid — Max Cap */}
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Max Auto-Bid (optional)
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
                      — Bid4U: we bid up to this cap
                    </span>
                  </label>
                  <input
                    className="input"
                    type="number"
                    placeholder="e.g. 2,500,000"
                    value={maxBid}
                    onChange={e => setMaxBid(e.target.value)}
                    min={minBid}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Leave empty for a manual bid only
                  </div>
                </div>

                {/* M-Pesa Phone */}
                <div className="input-group" style={{ marginBottom: 20 }}>
                  <label className="input-label">M-Pesa Number (Bid Commitment)</label>
                  <div className="mpesa-wrap">
                    <span className="mpesa-prefix">🇰🇪</span>
                    <input
                      className="input"
                      placeholder="0712 345 678"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Small commitment fee sent directly to dealer
                  </div>
                </div>

                {auctionLive && !isOwner ? (
                  <button
                    className="btn btn-gold btn-full btn-lg"
                    onClick={handlePlaceBid}
                    disabled={placing || !bidAmount || Number(bidAmount) < minBid}
                  >
                    {placing ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Placing...</> : '⚡ Place Bid'}
                  </button>
                ) : isOwner ? (
                  <div style={{ textAlign: 'center', padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                    You cannot bid on your own listing.
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 12, background: 'rgba(239,68,68,0.05)', borderRadius: 8 }}>
                    <span style={{ color: 'var(--red)', fontSize: 13 }}>This auction has ended.</span>
                  </div>
                )}
              </div>

              {/* Escrow info */}
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 6 }}>🔒 How Bidding Works</strong>
                  <p>1. Place your bid + M-Pesa commitment to the dealer.</p>
                  <p>2. If you win, full payment goes into <strong>escrow</strong>.</p>
                  <p>3. Escrow releases when car is received & confirmed.</p>
                </div>
              </div>

              {/* Dealer */}
              {car.dealer && (
                <div className="card" style={{ padding: 16, marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Seller</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A1628', fontWeight: 700 }}>
                      {(car.dealer?.name || 'D')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{car.dealer?.name}</div>
                      {car.dealer?.dealerRating && (
                        <div style={{ color: 'var(--gold)', fontSize: 12 }}>★ {car.dealer.dealerRating}/5</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SMS Bidding Agent */}
              {auctionLive && isAuth && (
                <div className="card" style={{ padding: 16, marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>💬</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>SMS Proxy Agent</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
                    Get outbid alerts via SMS. Reply with <strong>BID 4.3M</strong> to counter without opening the app.
                  </p>
                  {!smsRegistered ? (
                    <button className="btn btn-sm btn-outline" style={{ fontSize: 12 }}
                      disabled={togglingSms}
                      onClick={async () => {
                        setTogglingSms(true);
                        try {
                          const phone = prompt('Enter your M-Pesa phone number for SMS bidding:', '07');
                          if (phone && phone.trim()) {
                            await api.post('/sms-bidding/register', { phone: phone.trim() });
                            setSmsRegistered(true);
                            toast('SMS bidding activated!', 'success');
                          }
                        } catch (err) {
                          toast(err.response?.data?.message || 'Registration failed', 'error');
                        } finally { setTogglingSms(false); }
                      }}>
                      {togglingSms ? 'Activating...' : '📱 Activate SMS Bidding'}
                    </button>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ color: 'var(--green)', fontSize: 11 }}>✅ SMS active</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {smsSubscribed ? ' — Subscribed to this auction' : ''}
                        </span>
                      </div>
                      {!smsSubscribed ? (
                        <button className="btn btn-sm btn-gold" style={{ fontSize: 12 }}
                          disabled={togglingSms}
                          onClick={async () => {
                            setTogglingSms(true);
                            try {
                              await api.post('/sms-bidding/subscribe', { carId: id, notifyOnOutbid: true });
                              setSmsSubscribed(true);
                              toast('Subscribed! You will get SMS outbid alerts.', 'success');
                            } catch (err) {
                              toast(err.response?.data?.message || 'Subscription failed', 'error');
                            } finally { setTogglingSms(false); }
                          }}>
                          🔔 Subscribe to SMS Alerts
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-outline" style={{ fontSize: 12 }}
                          disabled={togglingSms}
                          onClick={async () => {
                            setTogglingSms(true);
                            try {
                              await api.delete(`/sms-bidding/unsubscribe/${id}`);
                              setSmsSubscribed(false);
                              toast('Unsubscribed from SMS alerts', 'info');
                            } catch (err) {
                              toast(err.response?.data?.message || 'Failed', 'error');
                            } finally { setTogglingSms(false); }
                          }}>
                          🔕 Unsubscribe
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Winner Modal */}
      {showWinner && (
        <WinnerModal
          certificate={showWinner}
          onClose={() => { setShowWinner(null); setConfetti(false); navigate(`/cars/${id}`); }}
          onDownload={() => toast('Certificate download coming soon', 'info')}
          onPayBalance={() => { setShowWinner(null); navigate(`/escrow-vault/${id}`); }}
        />
      )}
    </div>
  );
}
