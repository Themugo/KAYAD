// src/pages/AuctionLivePage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { carsAPI, bidsAPI, formatKES } from '../api/api';
import { getMockCar } from '../data/mockCars';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { CountdownDisplay } from '../hooks/useCountdown';
import BackButton from '../components/BackButton';
import WinnerModal from '../components/WinnerModal';
import MarketValuationMatrix from '../components/MarketValuationMatrix';
import GalleryModal from '../components/GalleryModal';
import usePageMeta from '../hooks/usePageMeta';
import api from '../api/api';
import { ChevronLeft, ChevronRight, Eye, Users, MapPin, Star, CheckCircle } from 'lucide-react';
import '../styles/auction-live.css';

// Extracted visual effects
import {
  AVATAR_COLORS, hashColor, getAvatarInitials,
  ConfettiOverlay, ViewersCounter, OutbidBell, PriceParticles,
} from './auction/components/AuctionEffects';

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
  const [outbidAlert, setOutbidAlert] = useState(false);
  const [priceParticles, setPriceParticles] = useState(false);
  const bidListRef = useRef(null);
  const prevBidRef = useRef(0);
  const newBidIdsRef = useRef(new Set());

  // Gallery navigation
  const [imgIdx, setImgIdx] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const totalImages = car?.images?.length || 0;
  const auctionImages = car?.images || [];
  const firstImgSrc = (idx = 0) => {
    const img = auctionImages[idx];
    if (!img) return '';
    return typeof img === 'string' ? img : img?.url || '';
  };
  const prevImg = useCallback(() => setImgIdx(i => (totalImages > 0 ? (i > 0 ? i - 1 : totalImages - 1) : 0)), [totalImages]);
  const nextImg = useCallback(() => setImgIdx(i => (totalImages > 0 ? (i < totalImages - 1 ? i + 1 : 0) : 0)), [totalImages]);

  // Spectator join state
  const [spectatorMode, setSpectatorMode] = useState(false);
  const spectatorRef = useRef(null);

  // Simulated live viewers
  const [liveViewers, setLiveViewers] = useState(0);
  useEffect(() => {
    const base = Math.floor(Math.random() * 20) + 8;
    setLiveViewers(base);
    const iv = setInterval(() => {
      setLiveViewers(prev => Math.max(3, prev + (Math.random() > 0.55 ? Math.floor(Math.random() * 3) + 1 : -Math.floor(Math.random() * 2))));
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  // Check if auction is in last 5 minutes for pulse effect
  const [isEnding, setIsEnding] = useState(false);
  useEffect(() => {
    if (!car?.auctionEnd) return;
    const check = () => {
      const diff = new Date(car.auctionEnd).getTime() - Date.now();
      setIsEnding(diff > 0 && diff <= 300000);
    };
    check();
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
  }, [car?.auctionEnd]);

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

  // Keyboard image navigation
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowLeft') { prevImg(); }
      if (e.key === 'ArrowRight') { nextImg(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [prevImg, nextImg]);

  // Auto-scroll spectator feed
  useEffect(() => {
    if (!spectatorMode || !spectatorRef.current) return;
    const iv = setInterval(() => {
      if (spectatorRef.current) {
        spectatorRef.current.scrollTop = spectatorRef.current.scrollHeight;
      }
    }, 2000);
    return () => clearInterval(iv);
  }, [spectatorMode, bids]);

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
      setPriceParticles(true);
      setTimeout(() => { setBidFlash(false); setPriceParticles(false); }, 800);
      bidListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

      // Outbid check
      if (isAuth && data.userId && data.userId !== user?._id && data.userId !== user?.id) {
        const myBids = bids.filter(b => String(b.userId) === String(user._id));
        if (myBids.length > 0) {
          setOutbidAlert(true);
          setTimeout(() => setOutbidAlert(false), 3000);
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

  // Leaderboard sorted by highest bid
  const biddersMap = {};
  (bids || []).forEach(b => {
    const tag = b.bidderTag || 'Anonymous';
    if (!biddersMap[tag] || b.amount > biddersMap[tag].amount) {
      biddersMap[tag] = { tag, amount: b.amount, count: (biddersMap[tag]?.count || 0) + 1, isVerified: b.isVerifiedBuyer };
    } else {
      biddersMap[tag].count += 1;
    }
  });
  const leaderboard = Object.values(biddersMap).sort((a, b) => b.amount - a.amount).slice(0, 8);

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;
  if (!car) return <div className="page loading-center"><h3>Auction not found</h3></div>;

  return (
    <div className="auction-live-page">
      {confetti && <ConfettiOverlay />}
      <div className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>

        {/* ─── Header ─── */}
        <div className="auction-live-header">
          <BackButton fallback="/showroom" label="Back" className="" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0 }} />
          <span style={{ color: 'var(--border)', fontSize: 10 }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {auctionLive ? (
              <span className="badge badge-green"><span className="live-dot" /> LIVE AUCTION</span>
            ) : (
              <span className="badge badge-muted">Auction Ended</span>
            )}
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{car.title}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Viewers */}
            <ViewersCounter />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? 'var(--green)' : 'var(--red)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{connected ? 'Live' : 'Reconnecting...'}</span>
          </div>
        </div>

        <div className="auction-live-grid">

          {/* ─── LEFT: Car + Bid History ─── */}
          <div>
            {/* Car image gallery */}
            <div className="auction-car-image" onClick={() => totalImages > 0 && setShowGallery(true)} style={{ cursor: totalImages > 0 ? 'zoom-in' : 'default' }}>
              <div className="auction-car-image-wrap">
                {totalImages > 0 ? (
                  <img src={firstImgSrc(imgIdx) || firstImgSrc(0)} alt={car.title} decoding="async" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, color: 'var(--text-dim)' }}>🚗</div>
                )}
              </div>
              {totalImages > 1 && (
                <>
                  <button onClick={e => { e.stopPropagation(); prevImg(); }} className="gallery-nav-btn gallery-nav-left"><ChevronLeft size={18} /></button>
                  <button onClick={e => { e.stopPropagation(); nextImg(); }} className="gallery-nav-btn gallery-nav-right"><ChevronRight size={18} /></button>
                  <div className="gallery-counter">{imgIdx + 1} / {totalImages}</div>
                </>
              )}
              {car.isDemo && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(251,191,36,0.92)', backdropFilter: 'blur(8px)',
                  borderRadius: 5, padding: '2px 7px', zIndex: 5,
                }}>
                  <span style={{ fontSize: 8, color: '#0A1628', fontWeight: 800, letterSpacing: '0.04em' }}>🧪 DEMO</span>
                </div>
              )}
              {car.isPromoted && (
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  background: 'rgba(212,196,168,0.92)', backdropFilter: 'blur(8px)',
                  borderRadius: 5, padding: '2px 8px', zIndex: 5,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Star size={9} style={{ color: '#0A1628' }} />
                  <span style={{ fontSize: 8, color: '#0A1628', fontWeight: 800, letterSpacing: '0.06em' }}>FEATURED</span>
                </div>
              )}
              {/* Countdown overlay on image */}
              {car.auctionEnd && auctionLive && (
                <div style={{
                  position: 'absolute', bottom: 10, left: 10,
                  background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
                  borderRadius: 10, padding: '8px 12px',
                  display: 'flex', flexDirection: 'column', gap: 5,
                  zIndex: 5,
                }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Ends In</span>
                  <CountdownDisplay endTime={car.auctionEnd} size="sm" />
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {totalImages > 1 && (
              <div style={{
                display: 'flex', gap: 8, marginBottom: 16, overflow: 'auto',
                paddingBottom: 4,
              }}>
                {auctionImages.map((img, i) => {
                  const src = typeof img === 'string' ? img : img?.url;
                  return (
                    <div key={i} onClick={() => setImgIdx(i)} style={{
                      width: 72, height: 52, borderRadius: 6, overflow: 'hidden',
                      border: i === imgIdx ? '2px solid var(--gold)' : '2px solid transparent',
                      flexShrink: 0, cursor: 'pointer', transition: 'border 0.2s',
                      opacity: i === imgIdx ? 1 : 0.5,
                    }}>
                      {src && <img src={src} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Car specs strip */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="auction-specs-strip">
                {[
                  { label: 'Brand', val: car.brand },
                  { label: 'Year', val: car.year },
                  { label: 'Fuel', val: car.fuel },
                  { label: 'Trans.', val: car.transmission },
                  { label: 'Mileage', val: car.mileage ? `${Number(car.mileage).toLocaleString()} km` : null },
                  { label: 'Location', val: car.location?.city },
                ].filter(s => s.val).map(s => (
                  <div key={s.label}>
                    <div className="auction-spec-item-label">{s.label}</div>
                    <div className="auction-spec-item-value">{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description & Features */}
            {car.description && (
              <div className="card" style={{ padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 8 }}>About This Vehicle</div>
                <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>{car.description}</p>
                {car.features?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {car.features.map((f, i) => (
                      <span key={i} style={{
                        fontSize: 10, padding: '3px 8px', borderRadius: 4,
                        background: 'rgba(212,196,168,0.08)', color: 'var(--text-muted)',
                        border: '1px solid rgba(212,196,168,0.1)',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <CheckCircle size={8} /> {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ LIVE ACTIVITY FEED ═══ */}
            <div className="card" style={{ marginBottom: 14, overflow: 'hidden' }}>
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                    background: '#ef4444', animation: 'pulse 1.5s infinite',
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Live Activity</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span><Eye size={11} style={{ display: 'inline', marginRight: 2 }} />{liveViewers} watching</span>
                  <span>👥 {bidCount} bids</span>
                </div>
              </div>
              <div ref={spectatorRef} style={{
                maxHeight: 200, overflowY: 'auto', padding: '6px 0',
                background: 'rgba(0,0,0,0.15)',
              }}>
                {bids.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    No activity yet. Waiting for first bid...
                  </div>
                ) : (
                  bids.slice(0, 20).map((bid, i) => {
                    const isTop = i === 0;
                    return (
                      <div key={bid._id || i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '5px 16px', fontSize: 11,
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        animation: 'slideInRight 0.3s ease both',
                        background: isTop ? 'rgba(212,196,168,0.04)' : 'transparent',
                      }}>
                        <span style={{ fontSize: 14 }}>{isTop ? '⚡' : '💰'}</span>
                        <span style={{ flex: 1, color: 'var(--text-muted)' }}>
                          <strong style={{ color: '#fff' }}>{bid.bidderTag || `Bidder #${bids.length - i}`}</strong>
                          {' '}placed a bid
                        </span>
                        <span style={{ fontWeight: 700, color: isTop ? 'var(--gold-light)' : 'var(--text)', fontSize: 12 }}>
                          {formatKES(bid.amount)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{
                padding: '8px 16px', borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 10, color: 'var(--text-muted)',
              }}>
                <span>🔴 Live — {formatTime(new Date().toISOString())}</span>
                <span>{bids.length} activity events</span>
              </div>
            </div>

            {/* ═══ SPECTATOR JOIN ═══ */}
            {!isAuth && !spectatorMode && (
              <div style={{
                marginBottom: 14, padding: 16,
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, rgba(212,196,168,0.08), rgba(212,196,168,0.02))',
                border: '1px solid rgba(212,196,168,0.15)',
                textAlign: 'center',
                animation: 'fadeInUp 0.5s ease',
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🎥</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Join the Live Show</div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, margin: '0 0 10px' }}>
                  Watch this auction unfold in real time. See every bid, every move — no account needed.
                </p>
                <button
                  onClick={() => setSpectatorMode(true)}
                  className="btn btn-gold"
                  style={{ fontSize: 12, padding: '8px 24px' }}
                >
                  🎬 Join Live Show
                </button>
              </div>
            )}

            {spectatorMode && (
              <div style={{
                marginBottom: 14, padding: 12, borderRadius: 'var(--radius-lg)',
                background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)',
                display: 'flex', alignItems: 'center', gap: 8,
                animation: 'fadeInUp 0.4s ease',
              }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>👁</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>You're watching live</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Spectator · {liveViewers} others watching
                  </div>
                </div>
                <span style={{
                  display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                  background: '#22c55e', animation: 'pulse 1.5s infinite',
                }} />
              </div>
            )}

            {/* Market Valuation */}
            <div style={{ marginBottom: 16 }}>
              <MarketValuationMatrix
                carId={id}
                carPrice={car.price || currentBid}
                carBrand={car.brand}
                carModel={car.model}
                carYear={car.year}
              />
            </div>

            {/* Bid History */}
            <div className="card bid-history-card">
              <div className="bid-history-header">
                <h3 style={{ fontSize: '0.9rem', margin: 0 }}>Bid History</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <OutbidBell show={outbidAlert} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{bidCount} bids</span>
                </div>
              </div>
              <div ref={bidListRef} className="bid-history-list">
                {bids.length === 0 ? (
                  <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No bids yet — be the first!
                  </div>
                
                  ) : bids.map((bid, i) => {
                    const color = hashColor(bid.bidderTag || `#${bidCount - i}`);
                    const isNew = i === 0 && bidFlash;
                    return (
                      <div key={bid._id || i} className="bid-row" style={{
                        animation: isNew ? 'slideInRight 0.35s ease both, bidGlow 0.8s ease both' : 'fadeInDown 0.3s ease both',
                        background: isNew ? 'rgba(212,196,168,0.06)' : 'transparent',
                      }}>
                        {isNew && <PriceParticles active={priceParticles} />}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: i === 0 ? 'var(--gold)' : color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 800,
                            color: i === 0 ? '#0A1628' : '#fff',
                            flexShrink: 0,
                            transition: 'transform 0.2s',
                            transform: isNew ? 'scale(1.12)' : 'scale(1)',
                          }}>
                            {i === 0 ? '👑' : getAvatarInitials(bid.bidderTag || `Bidder ${bidCount - i}`).slice(0, 2)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? 'var(--gold-light)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {bid.bidderTag || `Bidder #${bidCount - i}`}
                              {bid.isVerifiedBuyer && (
                                <span style={{
                                  fontSize: 8, padding: '1px 5px', borderRadius: 3,
                                  background: 'rgba(59,130,246,0.15)', color: '#3B82F6',
                                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                                }}>✓ Buyer</span>
                              )}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTime(bid.createdAt)}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                          <div style={{
                            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem',
                            color: i === 0 ? 'var(--gold-light)' : 'var(--text)',
                            transition: 'transform 0.2s',
                            transform: isNew ? 'scale(1.08)' : 'scale(1)',
                          }}>
                            {formatKES(bid.amount)}
                          </div>
                          {bid.mpesaPaid && (
                            <span style={{ fontSize: 9, color: 'var(--green)' }}>✓ M-Pesa confirmed</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Bid Panel ─── */}
          <div className="auction-live-bid-panel">

              {/* Reserve Indicator */}
              {car.reservePrice > 0 && (
                <div style={{
                  marginBottom: 12, padding: '8px 14px', borderRadius: 8,
                  background: reserveMet ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${reserveMet ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12, fontWeight: 600,
                  color: reserveMet ? '#22c55e' : '#ef4444',
                  transition: 'all 0.5s',
                }}>
                  <span style={{
                    display: 'inline-block',
                    animation: reserveMet ? 'pulse 1.5s infinite' : 'none',
                  }}>{reserveMet ? '✅' : '🔒'}</span>
                  <span>{reserveMet ? 'Reserve Met' : 'Reserve Not Yet Met'}</span>
                </div>
              )}

              {/* Current Bid Display */}
              <div className="current-bid-card" style={{
                borderColor: bidFlash ? 'rgba(212,196,168,0.6)' : 'rgba(212,196,168,0.2)',
              }}>
                {bidFlash && <PriceParticles active={priceParticles} />}
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                    {bidCount > 0 ? 'Current Leading Bid' : 'Starting Price'}
                  </div>
                  <div className="current-bid-amount" style={{
                    transform: bidFlash ? 'scale(1.08)' : 'scale(1)',
                    color: bidFlash ? '#fff' : undefined,
                  }}>
                    {formatKES(currentBid || car.price)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
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
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                      {isEnding ? (
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>● Auction Ending</span>
                      ) : 'Time Remaining'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <CountdownDisplay endTime={car.auctionEnd} size="lg" />
                    </div>
                    {extended && (
                      <div style={{ marginTop: 12, display: 'inline-flex', padding: '6px 12px', background: 'rgba(212,196,168,0.15)', borderRadius: 6, fontSize: 12, color: 'var(--gold)', animation: 'slideInRight 0.4s ease both' }}>
                        ⏱ Extended by 2 min
                      </div>
                    )}
                  </div>
                )}

                {/* Bid increment chips */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Quick Amounts</div>
                  <div className="quick-bid-chips">
                    {[minBid, minBid + 10000, minBid + 25000, minBid + 50000].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setBidAmount(String(amt))}
                        className={`quick-bid-chip ${bidAmount === String(amt) ? 'active' : ''}`}
                      >
                        {formatKES(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bid Amount Input */}
                <div className="input-group" style={{ marginBottom: 10 }}>
                  <label className="input-label" style={{ fontSize: 11 }}>Your Bid (KES)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder={`Min: ${minBid.toLocaleString()}`}
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                    min={minBid}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Minimum: {formatKES(minBid)}
                  </div>
                </div>

                {/* Proxy Bid — Max Cap */}
                <div className="input-group" style={{ marginBottom: 10 }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                    Max Auto-Bid (optional)
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 400 }}>
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
                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label className="input-label" style={{ fontSize: 11 }}>M-Pesa Number (Bid Commitment)</label>
                  <div className="mpesa-wrap">
                    <span className="mpesa-prefix">🇰🇪</span>
                    <input
                      className="input"
                      placeholder="0712 345 678"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Small commitment fee sent directly to dealer
                  </div>
                </div>

                {auctionLive && !isOwner ? (
                  <button
                    className="btn btn-gold btn-full btn-lg"
                    onClick={handlePlaceBid}
                    disabled={placing || !bidAmount || Number(bidAmount) < minBid}
                    style={{
                      animation: isEnding ? 'pulse 1s infinite' : 'none',
                      fontSize: 13, padding: '11px 20px',
                    }}
                  >
                    {placing ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Placing...</> : '⚡ Place Bid'}
                  </button>
                ) : isOwner ? (
                  <div style={{ textAlign: 'center', padding: 10, color: 'var(--text-muted)', fontSize: 12 }}>
                    You cannot bid on your own listing.
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 10, background: 'rgba(239,68,68,0.05)', borderRadius: 6 }}>
                    <span style={{ color: 'var(--red)', fontSize: 12 }}>This auction has ended.</span>
                  </div>
                )}
              </div>

              {/* Bidder Leaderboard */}
              {leaderboard.length > 0 && (
                <div className="leaderboard-card">
                  <div className="leaderboard-title">
                    <span>🏆</span> Bidder Leaderboard
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {leaderboard.map((b, i) => (
                      <div key={b.tag} className="leaderboard-row" style={{
                        borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      }}>
                        <div className="leaderboard-rank" style={{
                          color: i === 0 ? 'var(--gold)' : i < 3 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                        }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
                        <div className="leaderboard-avatar" style={{ background: hashColor(b.tag) }}>
                          {getAvatarInitials(b.tag).slice(0, 2)}
                        </div>
                        <div className="leaderboard-name">
                          {b.tag}
                          {b.isVerified && <span style={{ color: '#3B82F6', marginLeft: 3, fontSize: 9 }}>✓</span>}
                        </div>
                        <div className="leaderboard-amount">
                          <div className="leaderboard-amount-value">{formatKES(b.amount)}</div>
                          <div className="leaderboard-bidcount">{b.count} bid{b.count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Escrow info */}
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>🔒 How Bidding Works</strong>
                  <p style={{ margin: '2px 0' }}>1. Place your bid + M-Pesa commitment to the dealer.</p>
                  <p style={{ margin: '2px 0' }}>2. If you win, full payment goes into <strong>escrow</strong>.</p>
                  <p style={{ margin: '2px 0' }}>3. Escrow releases when car is received & confirmed.</p>
                </div>
              </div>

              {/* Dealer */}
              {car.dealer && (
                <div className="card" style={{ padding: 14, marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Seller</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A1628', fontWeight: 700, fontSize: 13 }}>
                      {(car.dealer?.name || 'D')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{car.dealer?.name}</div>
                      {car.dealer?.dealerRating && (
                        <div style={{ color: 'var(--gold)', fontSize: 11 }}>★ {car.dealer.dealerRating}/5</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SMS Bidding Agent */}
              {auctionLive && isAuth && (
                <div className="card" style={{ padding: 14, marginTop: 10 }}>
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

      {/* Gallery Modal */}
      {showGallery && (
        <GalleryModal car={car} initialIdx={imgIdx} onClose={() => setShowGallery(false)} />
      )}

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
