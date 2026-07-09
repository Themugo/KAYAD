// src/pages/AuctionLivePage.jsx
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { carsAPI, bidsAPI, smsBiddingAPI, formatKES } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { CountdownDisplay } from '../components/CountdownDisplay';
import BackButton from '../components/BackButton';
import WinnerModal from '../components/WinnerModal';
const MarketValuationMatrix = lazy(() => import('../components/MarketValuationMatrix'));
const GalleryModal = lazy(() => import('../components/GalleryModal'));
import usePageMeta from '../hooks/usePageMeta';
import SEOHead from '../components/SEOHead';
import NotFoundState from '../components/NotFoundState';
import { generateAuctionMetadata } from '../utils/seoService';
import { ChevronLeft, ChevronRight, Eye, Star, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import '../styles/auction-live.css';

// Extracted visual effects
import { hashColor, getAvatarInitials, ConfettiOverlay, ViewersCounter, OutbidBell, PriceParticles } from './auction/components/AuctionEffects';

export default function AuctionLivePage() {
  const { id } = useParams();
  const { user, isAuth } = useAuth();
  const { joinAuction, on, connected } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [car, setCar] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const seoMetadata = car ? generateAuctionMetadata(car) : null;
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
  const [_pendingBidId, setPendingBidId] = useState(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [_prevBid, setPrevBid] = useState(0);
  const [bidCount, setBidCount]   = useState(0);
  const [extended, setExtended] = useState(false);
  const [smsRegistered, setSmsRegistered] = useState(false);
  const [smsSubscribed, setSmsSubscribed] = useState(false);
  const [togglingSms, setTogglingSms] = useState(false);
  const [showWinner, setShowWinner] = useState(null);
  const [_watchers, _setWatchers] = useState(0);
  const [bidFlash, setBidFlash] = useState(false);
  const [auctionPhase, setAuctionPhase] = useState('');
  const [confetti, setConfetti] = useState(false);
  const [outbidAlert, setOutbidAlert] = useState(false);
  const [priceParticles, setPriceParticles] = useState(false);
  const [showBidConfirm, setShowBidConfirm] = useState(false);
  const bidListRef = useRef(null);
  const prevBidRef = useRef(0);
  const _newBidIdsRef = useRef(new Set());
  const bidsRef = useRef([]);
  const carRef = useRef(null);
  const currentBidRef = useRef(0);

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

  // Sync refs with latest state (avoids stale closures in socket handlers)
  useEffect(() => { bidsRef.current = bids; }, [bids]);
  useEffect(() => { carRef.current = car; }, [car]);
  useEffect(() => { currentBidRef.current = currentBid; }, [currentBid]);

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
    let ignore = false;
    Promise.all([
      carsAPI.get(id),
      bidsAPI.getForCar(id).catch(() => ({ bids: [] })),
    ]).then(([carData, bidData]) => {
      const c = carData.car || carData.data || carData;
      if (!c || !c._id) return Promise.reject();
      if (ignore) return;
      setCar(c);
      setCurrentBid(c.currentBid || c.price || 0);
      setPrevBid(c.currentBid || c.price || 0);
      setBidCount(c.bidsCount || 0);
      const bs = bidData.bids || bidData.data || [];
      setBids(bs.slice(0, 30));
      const minNext = (c.currentBid || c.price || 0) + 5000;
      setBidAmount(String(minNext));
    }).catch((error) => {
      console.error('Failed to load auction data:', error);
      if (!ignore) {
        let errorMessage = 'Could not load auction data. Please try again.';
        if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error.response?.status === 404) {
          errorMessage = 'Auction not found.';
        } else if (error.response?.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        setLoadError(errorMessage);
        setCar(null);
      }
    }).finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [id, toast]);

  // Join auction socket room
  useEffect(() => {
    if (!id) return;
    joinAuction(id);
  }, [id, connected, joinAuction]);

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
    let ignore = false;
    smsBiddingAPI.my().then(d => {
      if (ignore) return;
      if (d.smsBidder?.active && d.smsBidder?.phone) {
        setSmsRegistered(true);
        setSmsSubscribed(d.smsBidder.subscriptions?.some(s => s.car?._id === id || s.car === id));
      }
    }).catch(() => {});
    return () => { ignore = true; };
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
        const myBids = bidsRef.current.filter(b => String(b.userId) === String(user._id));
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
          vehicle: { title: carRef.current?.title || 'Vehicle' },
          financials: { winningBid: data.highestBid || currentBidRef.current },
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
  }, [id, on, isAuth, user, navigate, toast]);

  const handlePlaceBid = async () => {
    if (!isAuth) { navigate('/login'); return; }
    const amount = Number(bidAmount);
    if (amount <= currentBid) {
      toast(`Bid must be above ${formatKES(currentBid)}`, 'error'); return;
    }
    if (!phone || phone.replace(/\D/g, '').length < 9) {
      toast('Enter your M-Pesa number', 'error'); return;
    }
    setShowBidConfirm(true);
  };

  const confirmBid = async () => {
    setShowBidConfirm(false);
    setPlacing(true);
    try {
      const amount = Number(bidAmount);
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

  // Time-aware: is the auction actually live right now?
  const _now = Date.now();
  const _aStart = car?.auctionStartTime ? new Date(car.auctionStartTime).getTime() : 0;
  const _aEnd = car?.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
  const auctionLive = _aStart > 0 && _aEnd > 0 && _aStart <= _now && _aEnd > _now;

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
  if (loadError) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ opacity: 0.35, marginBottom: 16 }}><AlertTriangle size={48} strokeWidth={1.2} /></div>
        <h3 style={{ color: 'var(--text)', marginBottom: 8 }}>{loadError}</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>You can try again or browse other auctions.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button type="button" onClick={() => { setLoadError(null); setLoading(true); window.location.reload(); }} className="btn btn-gold btn-sm">
            <RefreshCw size={14} style={{ marginRight: 6 }} /> Retry
          </button>
        </div>
      </div>
    </div>
  );
  if (!car) return <NotFoundState title="Auction Not Found" message="This auction doesn't exist or has ended." actions={[{ label: 'Browse Auctions', to: '/auctions/calendar' }, { label: 'Go Home', to: '/' }]} />;

  return (
    <>
      <SEOHead metadata={seoMetadata} />
      <div className="auction-live-page">
      {confetti && <ConfettiOverlay />}
      {showBidConfirm && (
        <div className="bid-confirm-overlay">
          <div className="bid-confirm-card">
            <div className="bid-confirm-title">Confirm Your Bid</div>
            <div className="bid-confirm-desc">
              You are about to place a bid of <strong className="bid-confirm-gold">{formatKES(Number(bidAmount))}</strong> on {car.title}.
              <br /><br />
              A 5% commitment fee ({formatKES(Math.ceil(Number(bidAmount) * 0.05))}) will be sent via M-Pesa to the dealer.
            </div>
            <div className="bid-confirm-actions">
              <button onClick={confirmBid} disabled={placing} className="btn-confirm-primary">
                {placing ? 'Processing...' : 'Confirm & Place Bid'}
              </button>
              <button onClick={() => setShowBidConfirm(false)} className="btn-confirm-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>

        {/* ─── Header ─── */}
        <div className="auction-live-header">
          <BackButton fallback="/showroom" label="Back" className="header-back-link" />
          <span className="header-separator">·</span>
          <div className="header-title-area">
            {auctionLive ? (
              <span className="badge badge-green"><span className="live-dot" /> LIVE AUCTION</span>
            ) : (
              <span className="badge badge-muted">Auction Ended</span>
            )}
            <span className="header-title">{car.title}</span>
          </div>
          <div className="header-right">
            <ViewersCounter />
            <div className="header-connection-dot" style={{ background: connected ? 'var(--green)' : 'var(--red)' }} />
            <span className="header-connection-label">{connected ? 'Live' : 'Reconnecting...'}</span>
          </div>
        </div>

        <div className="auction-live-grid">

          {/* ─── LEFT: Car + Bid History ─── */}
          <div>
            {/* Car image gallery */}
            <div className="auction-car-image" onClick={() => totalImages > 0 && setShowGallery(true)} onKeyDown={e => { if (totalImages > 0 && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setShowGallery(true); } }} role="button" tabIndex={totalImages > 0 ? 0 : -1} aria-label={totalImages > 0 ? 'Open image gallery' : undefined} style={{ cursor: totalImages > 0 ? 'zoom-in' : 'default' }}>
              <div className="auction-car-image-wrap">
                {totalImages > 0 ? (
                  <img src={firstImgSrc(imgIdx) || firstImgSrc(0)} alt={car.title} decoding="async" />
                ) : (
                  <div className="car-img-placeholder">🚗</div>
                )}
              </div>
              {totalImages > 1 && (
                <>
                  <button onClick={e => { e.stopPropagation(); prevImg(); }} aria-label="Previous image" className="gallery-nav-btn gallery-nav-left"><ChevronLeft size={18} /></button>
                  <button onClick={e => { e.stopPropagation(); nextImg(); }} aria-label="Next image" className="gallery-nav-btn gallery-nav-right"><ChevronRight size={18} /></button>
                  <div className="gallery-counter">{imgIdx + 1} / {totalImages}</div>
                </>
              )}
              {car.isDemo && (
                <div className="badge-overlay badge-overlay-demo">
                  <span className="badge-overlay-text">🧪 DEMO</span>
                </div>
              )}
              {car.isPromoted && (
                <div className="badge-overlay badge-overlay-featured">
                  <Star size={9} style={{ color: '#0A1628' }} />
                  <span className="badge-overlay-featured-text">FEATURED</span>
                </div>
              )}
              {/* Countdown overlay on image */}
              {car.auctionEnd && auctionLive && (
                <div className="countdown-overlay">
                  <span className="countdown-overlay-label">Ends In</span>
                  <CountdownDisplay endTime={car.auctionEnd} size="sm" />
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {totalImages > 1 && (
              <div className="thumbnail-strip">
                {auctionImages.map((img, i) => {
                  const src = typeof img === 'string' ? img : img?.url;
                  return (
                    <div key={i} onClick={() => setImgIdx(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setImgIdx(i); } }} role="button" tabIndex={0} aria-label={`View image ${i + 1}`} className={`thumbnail-item ${i === imgIdx ? 'active' : 'inactive'}`}>
                      {src && <img src={src} alt="" loading="lazy" decoding="async" className="thumbnail-img" />}
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
                  <div key={s.label} className="auction-spec-item">
                    <div className="auction-spec-item-label">{s.label}</div>
                    <div className="auction-spec-item-value">{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description & Features */}
            {car.description && (
              <div className="card desc-section">
                <div className="desc-title">About This Vehicle</div>
                <p className="desc-text">{car.description}</p>
                {car.features?.length > 0 && (
                  <div className="feature-tags">
                    {car.features.map((f, i) => (
                      <span key={i} className="feature-tag">
                        <CheckCircle size={8} /> {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ LIVE ACTIVITY FEED ═══ */}
            <div className="card live-activity-section">
              <div className="live-activity-header">
                <div className="live-activity-header-left">
                  <span className="live-activity-dot" />
                  <span className="live-activity-header-text">Live Activity</span>
                </div>
                <div className="live-activity-stats">
                  <span><Eye size={11} style={{ display: 'inline', marginRight: 2 }} />{liveViewers} watching</span>
                  <span>👥 {bidCount} bids</span>
                </div>
              </div>
              <div ref={spectatorRef} className="live-activity-feed">
                {bids.length === 0 ? (
                  <div className="live-activity-empty">No activity yet. Waiting for first bid...</div>
                ) : (
                  bids.slice(0, 20).map((bid, i) => {
                    const isTop = i === 0;
                    return (
                      <div key={bid._id || i} className={`live-activity-event${isTop ? ' top' : ''}`}>
                        <span className="activity-event-icon">{isTop ? '⚡' : '💰'}</span>
                        <span className="activity-event-name">
                          <strong>{bid.bidderTag || `Bidder #${bids.length - i}`}</strong> placed a bid
                        </span>
                        <span className="activity-event-amount" style={{ color: isTop ? 'var(--gold-light)' : 'var(--text)' }}>
                          {formatKES(bid.amount)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="live-activity-footer">
                <span>🔴 Live — {formatTime(new Date().toISOString())}</span>
                <span>{bids.length} activity events</span>
              </div>
            </div>

            {/* ═══ SPECTATOR JOIN ═══ */}
            {!isAuth && !spectatorMode && (
              <div className="spectator-join-card">
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
              <div className="spectator-badge">
                <span style={{ fontSize: 20, lineHeight: 1 }}>👁</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>You're watching live</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Spectator · {liveViewers} others watching
                  </div>
                </div>
                <span className="spectator-live-dot" />
              </div>
            )}

            {/* Market Valuation */}
            <div className="bid-history-card">
              <Suspense fallback={null}>
                <MarketValuationMatrix
                  carId={id}
                  carPrice={car.price || currentBid}
                  carBrand={car.brand}
                  carModel={car.model}
                  carYear={car.year}
                />
              </Suspense>
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
                  <div className="bid-empty">No bids yet — be the first!</div>
                
                  ) : bids.map((bid, i) => {
                    const color = hashColor(bid.bidderTag || `#${bidCount - i}`);
                    const isNew = i === 0 && bidFlash;
                    const anim = isNew ? 'slideInRight 0.35s ease both, bidGlow 0.8s ease both' : 'fadeInDown 0.3s ease both';
                    return (
                      <div key={bid._id || i} className={`bid-row${isNew ? ' bid-row-highlight' : ''}`} style={{ animation: anim }}>
                        {isNew && <PriceParticles active={priceParticles} />}
                        <div className="bidder-info-col">
                          <div className="bid-row-avatar" style={{
                            background: i === 0 ? 'var(--gold)' : color,
                            color: i === 0 ? '#0A1628' : '#fff',
                            transform: isNew ? 'scale(1.12)' : 'scale(1)',
                          }}>
                            {i === 0 ? '👑' : getAvatarInitials(bid.bidderTag || `Bidder ${bidCount - i}`).slice(0, 2)}
                          </div>
                          <div className="bidder-details">
                            <div className={`bidder-name-row ${i === 0 ? 'bidder-name-lead' : 'bidder-name-normal'}`}>
                              {bid.bidderTag || `Bidder #${bidCount - i}`}
                              {bid.isVerifiedBuyer && <span className="bidder-tag">✓ Buyer</span>}
                            </div>
                            <div className="bidder-time">{formatTime(bid.createdAt)}</div>
                          </div>
                        </div>
                        <div className="bidder-amount-col">
                          <div className={`bidder-amount-text ${i === 0 ? 'bidder-amount-lead' : 'bidder-amount-normal'}`} style={{ transform: isNew ? 'scale(1.08)' : 'scale(1)' }}>
                            {formatKES(bid.amount)}
                          </div>
                          {bid.mpesaPaid && <span className="bidder-mpesa-confirmed">✓ M-Pesa confirmed</span>}
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
              {car.reservePrice > 0 && car.reserveMode === 'visible' && (
                <div className={`reserve-bar ${reserveMet ? 'reserve-bar-met' : 'reserve-bar-not-met'}`}>
                  <span style={{ animation: reserveMet ? 'pulse 1.5s infinite' : 'none' }}>{reserveMet ? '✅' : '🔒'}</span>
                  <span>{reserveMet ? 'Reserve Met' : 'Reserve Not Yet Met'}</span>
                </div>
              )}
              {car.reservePrice > 0 && car.reserveMode === 'hidden' && !reserveMet && (
                <div className="reserve-bar reserve-bar-not-met">
                  <span>🔒</span>
                  <span>Reserve Not Yet Met</span>
                </div>
              )}

              {/* Current Bid Display */}
              <div className="current-bid-card" style={{
                borderColor: bidFlash ? 'rgba(212,196,168,0.6)' : 'rgba(212,196,168,0.2)',
              }}>
                {bidFlash && <PriceParticles active={priceParticles} />}
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <div className="current-bid-label">
                    {bidCount > 0 ? 'Current Leading Bid' : 'Starting Price'}
                  </div>
                  <div className="current-bid-amount" style={{
                    transform: bidFlash ? 'scale(1.08)' : 'scale(1)',
                    color: bidFlash ? '#fff' : undefined,
                  }}>
                    {formatKES(currentBid || car.price)}
                  </div>
                  <div className="bid-count-text">
                    {bidCount} bid{bidCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Going Once/Twice/Thrice */}
                {auctionPhase && (
                  <div className="phase-wrapper">
                    <span className={`auction-phase-badge ${
                      auctionPhase === 'going_once' ? 'auction-phase-once' :
                      auctionPhase === 'going_twice' ? 'auction-phase-twice' :
                      'auction-phase-thrice'
                    }`}>
                      {auctionPhase === 'going_once' ? '⏳ Going Once...' :
                       auctionPhase === 'going_twice' ? '⏳ Going Twice...' :
                       '🔔 Going Thrice...!'}
                    </span>
                  </div>
                )}

                {/* Countdown */}
                {car.auctionEnd && (
                  <div className="countdown-section">
                    <div className="countdown-section-label">
                      {isEnding ? <span className="ending-label">● Auction Ending</span> : 'Time Remaining'}
                    </div>
                    <div className="countdown-row">
                      <CountdownDisplay endTime={car.auctionEnd} size="lg" />
                    </div>
                    {extended && <div className="extended-badge">⏱ Extended by 2 min</div>}
                  </div>
                )}

                {/* Bid increment chips */}
                <div style={{ marginBottom: 12 }}>
                  <div className="quick-amounts-label">Quick Amounts</div>
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
                <div className="input-group bid-input-section">
                  <label className="input-label" style={{ fontSize: 11 }}>Your Bid (KES)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder={`Min: ${minBid.toLocaleString()}`}
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                    min={minBid}
                  />
                  <div className="bid-input-footer">Minimum: {formatKES(minBid)}</div>
                </div>

                {/* Proxy Bid — Max Cap */}
                <div className="input-group bid-input-section">
                  <label className="input-label auto-bid-label">
                    Max Auto-Bid (optional)
                    <span className="auto-bid-sub">— Bid4U: we bid up to this cap</span>
                  </label>
                  <input
                    className="input"
                    type="number"
                    placeholder="e.g. 2,500,000"
                    value={maxBid}
                    onChange={e => setMaxBid(e.target.value)}
                    min={minBid}
                  />
                  <div className="bid-input-footer-sm">Leave empty for a manual bid only</div>
                </div>

                {/* M-Pesa Phone */}
                <div className="input-group mpesa-section">
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
                  <div className="bid-input-footer">Small commitment fee sent directly to dealer</div>
                </div>

                {auctionLive && !isOwner ? (
                  <button
                    className="btn btn-gold btn-full btn-lg place-bid-btn"
                    onClick={handlePlaceBid}
                    disabled={placing || !bidAmount || Number(bidAmount) < minBid}
                    style={{ animation: isEnding ? 'pulse 1s infinite' : 'none' }}
                  >
                    {placing ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Placing...</> : '⚡ Place Bid'}
                  </button>
                ) : isOwner ? (
                  <div className="owner-notice">You cannot bid on your own listing.</div>
                ) : (
                  <div className="end-notice">
                    <span className="end-notice-text">This auction has ended.</span>
                  </div>
                )}
              </div>

              {/* Bidder Leaderboard */}
              {leaderboard.length > 0 && (
                <div className="leaderboard-card">
                  <div className="leaderboard-title">
                    <span>🏆</span> Bidder Leaderboard
                  </div>
                  <div>
                    {leaderboard.map((b, i) => (
                      <div key={b.tag} className="leaderboard-row">
                        <div className={`leaderboard-rank ${
                          i === 0 ? 'leaderboard-rank-gold' :
                          i < 3 ? 'leaderboard-rank-silver' :
                          'leaderboard-rank-muted'
                        }`}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
                        <div className="leaderboard-avatar" style={{ background: hashColor(b.tag) }}>
                          {getAvatarInitials(b.tag).slice(0, 2)}
                        </div>
                        <div className="leaderboard-name">
                          {b.tag}
                          {b.isVerified && <span className="leaderboard-name-verified">✓</span>}
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
              <div className="card escrow-card">
                <div className="escrow-text">
                  <strong className="escrow-title">🔒 How Bidding Works</strong>
                  <p className="escrow-step">1. Place your bid + M-Pesa commitment to the dealer.</p>
                  <p className="escrow-step">2. If you win, full payment goes into <strong className="escrow-strong">escrow</strong>.</p>
                  <p className="escrow-step">3. Escrow releases when car is received & confirmed.</p>
                </div>
              </div>

              {/* Dealer */}
              {car.dealer && (
                <div className="card dealer-mini-card">
                  <div className="dealer-mini-label">Seller</div>
                  <div className="dealer-mini-body">
                    <div className="dealer-mini-avatar">{(car.dealer?.name || 'D')[0].toUpperCase()}</div>
                    <div className="dealer-mini-info">
                      <div className="dealer-mini-name">{car.dealer?.name}</div>
                      {car.dealer?.dealerRating && (
                        <div className="dealer-mini-rating">★ {car.dealer.dealerRating}/5</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SMS Bidding Agent */}
              {auctionLive && isAuth && (
                <div className="card sms-agent-card">
                  <div className="sms-agent-header">
                    <span className="sms-agent-icon">💬</span>
                    <span className="sms-agent-title">SMS Proxy Agent</span>
                  </div>
                  <p className="sms-agent-desc">
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
                            await smsBiddingAPI.register(phone.trim());
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
                      <div className="sms-status">
                        <span className="sms-status-active">✅ SMS active</span>
                        <span className="sms-status-label">
                          {smsSubscribed ? ' — Subscribed to this auction' : ''}
                        </span>
                      </div>
                      {!smsSubscribed ? (
                        <button className="btn btn-sm btn-gold" style={{ fontSize: 12 }}
                          disabled={togglingSms}
                          onClick={async () => {
                            setTogglingSms(true);
                            try {
                              await smsBiddingAPI.subscribe({ carId: id, notifyOnOutbid: true });
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
                              await smsBiddingAPI.unsubscribe(id);
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
        <Suspense fallback={null}>
          <GalleryModal car={car} initialIdx={imgIdx} onClose={() => setShowGallery(false)} />
        </Suspense>
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
    </>
  );
}
