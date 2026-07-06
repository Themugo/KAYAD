import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import '../styles/car-detail.css';
import BackButton from '../components/BackButton';
import ReportButton from '../components/ReportButton';
import DetailSkeleton from './car/components/DetailSkeleton';
import AuctionAnnouncement from './car/components/AuctionAnnouncement';
import InlineBidding from './car/components/InlineBidding';
import NtsaStatusCard from './car/components/NtsaStatusCard';
import NotFoundState from '../components/NotFoundState';
import { carsAPI, reviewsAPI, chatAPI, ntsaAPI, favoritesAPI, bidsAPI, formatKES } from '../api/api';
import { getDemoCar } from '../data/demoData';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import PaymentModal from '../components/PaymentModal';
import InspectionButton from '../components/InspectionButton';
import TcoCalculator from '../components/TcoCalculator';
import MarketValuationMatrix from '../components/MarketValuationMatrix';
import MarketPulse from '../components/MarketPulse';
import PriceHistoryChart from '../components/PriceHistoryChart';
import GalleryModal from '../components/GalleryModal';
import { VehicleStructuredData, BreadcrumbStructuredData } from '../components/SeoStructuredData';
import SEOHead from '../components/SEOHead';
import { generateVehicleMetadata } from '../utils/seoService';
import usePageMeta from '../hooks/usePageMeta';
import useMediaQuery from '../hooks/useMediaQuery';
import {
  MapPin, Gauge, Calendar, Fuel, Settings2, ShieldCheck,
  Heart, MessageCircle, ChevronLeft, ChevronRight, Bell,
  Star, Eye, Bookmark, Zap, Award, Lock, Pin, TrendingUp,
  CheckCircle, AlertTriangle, Clock, BarChart3, Phone, Mail, X
} from 'lucide-react';

// Extracted sub-components
import { firstImage, GalleryImage, SpecItem, CompareToggle } from './car/components/CarDetailWidgets';
import CarDetailReviews from './car/components/CarDetailReviews';
import SimilarCars from './car/components/SimilarCars';

export default function CarDetailPage() {
  const { id } = useParams();
  const { user, isAuth, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [car, setCar] = useState(null);
  const [seoMetadata, setSeoMetadata] = useState(null);

  // Generate SEO metadata when car data is loaded
  useEffect(() => {
    if (car) {
      setSeoMetadata(generateVehicleMetadata(car));
    }
  }, [car]);

  usePageMeta(
    car ? `${car.title} - ${car.brand} ${car.model} ${car.year}` : 'Car Details',
    car ? `${car.title} - ${car.brand} ${car.model} ${car.year} in ${car.location}. Price: KES ${Number(car.price).toLocaleString()}. View details on Kayad.` : 'View premium car details on Kayad Marketplace.',
    car ? { image: (car.images?.[0]?.url || car.images?.[0]), type: 'product' } : {}
  );
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payType, setPayType] = useState('escrow');
  const [isFav, setIsFav] = useState(false);
  const [priceAlertOn, setPriceAlertOn] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [ntsaStatus, setNtsaStatus] = useState(null);
  const [ntsaLoading, setNtsaLoading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showBidConfirm, setShowBidConfirm] = useState(false);
  const [outbidAlert, setOutbidAlert] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { on, connected } = useSocket();

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    carsAPI.get(id)
      .then(data => {
        let c = data?.car || data?.data || data;
        if (!c || !c._id) c = getDemoCar(id);
        setCar(c);
        if (c) { setImgIdx(c.coverImage ?? 0); carsAPI.trackClick?.(id).catch((error) => console.error('Track click failed:', error)); }
        if (c?.dealer?._id) reviewsAPI.forDealer(c.dealer._id).then(d => setReviews(d.reviews || [])).catch((error) => console.error('Fetch reviews failed:', error));
      })
      .catch((error) => {
        console.error('Failed to fetch car:', error);
        const m = getDemoCar(id);
        setCar(m);
        if (m) setImgIdx(m.coverImage ?? 0);
      })
      .finally(() => setLoading(false));
    if (isAuth) {
      favoritesAPI.list().then(d => {
        const favs = d.favorites || d.cars || d.data || [];
        const match = favs.find(f => (f._id === id || f?.car?._id === id));
        setIsFav(!!match);
        setPriceAlertOn(match?.notifyOnPriceDrop === true);
      }).catch((error) => console.error('Failed to fetch favorites:', error));
    }
  }, [id]);

  // Load NTSA verification status
  useEffect(() => {
    if (!car?._id) return;
    setNtsaLoading(true);
    ntsaAPI.status(car._id).then(d => {
      setNtsaStatus(d);
    }).catch((error) => console.error('Failed to fetch NTSA status:', error)).finally(() => setNtsaLoading(false));
  }, [car?._id]);

  const handleRequestNtsa = async () => {
    if (!isAuth) { navigate(`/register?redirect=/cars/${id}`); return; }
    setNtsaLoading(true);
    try {
      await ntsaAPI.queue(car._id);
      toast('NTSA verification requested!', 'success');
      const d = await ntsaAPI.status(car._id);
      setNtsaStatus(d);
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to request verification', 'error');
    } finally { setNtsaLoading(false); }
  };

  const images = car?.images || [];
  const total = images.length;
  const prevImg = useCallback(() => setImgIdx(i => i > 0 ? i - 1 : total - 1), [total]);
  const nextImg = useCallback(() => setImgIdx(i => i < total - 1 ? i + 1 : 0), [total]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'ArrowLeft') prevImg(); if (e.key === 'ArrowRight') nextImg(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [prevImg, nextImg]);

  const _userId = String(user?._id || user?.id || '');
  const _dealerId = String(car?.dealer?._id || car?.dealer || '');
  const isOwner = !!(_userId && _dealerId && _userId === _dealerId);
  const canManage = isOwner || isAdmin;

  // Time-aware auction status
  const _now = Date.now();
  const _auctionStartTime = car?.auctionStartTime ? new Date(car.auctionStartTime).getTime() : 0;
  const _auctionEnd = car?.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
  const isLive = _auctionStartTime > 0 && _auctionEnd > 0 && _auctionStartTime <= _now && _auctionEnd > _now;

  const dealer = car?.dealer;
  const dv = dealer?.visibility || { showPhone: true, showEmail: true, showLocation: true, chatEnabled: true };

  const isP2P = !dealer || dealer.role === 'individual_seller' || dealer.role === 'user' || !dealer.role;
  const isDealerSeller = dealer?.role === 'dealer';

  // ═══ INLINE BIDDING ═══
  const [bidAmount, setBidAmount] = useState(car?.currentBid || car?.startingBid || 0);
  const [bidHistory, setBidHistory] = useState([]);
  const [bidPlacing, setBidPlacing] = useState(false);
  const [bidError, setBidError] = useState('');
  const [countdown, setCountdown] = useState('');
  const bidHistoryRef = useRef([]);

  // Reserve status calculation
  const reserveMet = !car?.reservePrice || (car.currentBid || car.price || 0) >= car.reservePrice;
  const showReserve = car?.reservePrice > 0 && car.reserveMode !== 'hidden';

  useEffect(() => {
    if (!car?._id || !isLive) return;
    const fetchBids = () => {
      bidsAPI.getForCar(car._id).then(d => {
        setBidHistory(d?.bids || []);
        bidHistoryRef.current = d?.bids || [];
      }).catch((error) => console.error('Failed to fetch bids:', error));
    };
    fetchBids();
    const iv = setInterval(fetchBids, 8000);
    return () => clearInterval(iv);
  }, [car?._id, isLive]);

  // Sync bidHistoryRef
  useEffect(() => {
    bidHistoryRef.current = bidHistory;
  }, [bidHistory]);

  useEffect(() => {
    if (!isLive || !car?.auctionEnd) return;
    const update = () => {
      const diff = new Date(car.auctionEnd) - new Date();
      if (diff <= 0) { setCountdown('Ended'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(d > 0 ? `${d}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [isLive, car?.auctionEnd]);

  const handleShowBidConfirm = () => {
    if (!isAuth) { navigate(`/login?redirect=/cars/${id}`); return; }
    const minBid = (car.currentBid || car.startingBid || 0) + 5000;
    if (!bidAmount || bidAmount < minBid) {
      setBidError(`Bid must be at least KES ${minBid.toLocaleString()}`);
      return;
    }
    setShowBidConfirm(true);
  };

  const handlePlaceBid = async () => {
    setShowBidConfirm(false);
    setBidPlacing(true); setBidError('');
    try {
      await bidsAPI.place(car._id, { amount: bidAmount });
      setCar(c => ({ ...c, currentBid: bidAmount, bidsCount: (c?.bidsCount || 0) + 1 }));
      toast('Bid placed successfully!', 'success');
      bidsAPI.getForCar(car._id).then(d => setBidHistory(d?.bids || [])).catch((error) => console.error('Failed to fetch bids after placement:', error));
    } catch (e) { setBidError(e?.response?.data?.message || 'Bid failed'); }
    finally { setBidPlacing(false); }
  };

  // Real-time bid events via socket
  useEffect(() => {
    if (!on || !isLive) return;
    const offBid = on('newBid', (data) => {
      if (data.carId !== id) return;
      setCar(c => ({ ...c, currentBid: data.amount, bidsCount: (c?.bidsCount || 0) + 1 }));
      setBidHistory(prev => [data, ...prev].slice(0, 30));
      const minNext = data.amount + 5000;
      setBidAmount(minNext);

      // Outbid check
      if (isAuth && data.userId && data.userId !== user?._id && data.userId !== user?.id) {
        const myBids = bidHistoryRef.current.filter(b => String(b.userId) === String(user._id));
        if (myBids.length > 0) {
          setOutbidAlert(true);
          setTimeout(() => setOutbidAlert(false), 5000);
          toast('📢 You\'ve been outbid! Place a higher bid to stay ahead.', 'info', { duration: 5000 });
        }
      }
    });

    const offEnd = on('auctionEnded', (data) => {
      if (data.carId !== id) return;
      const isWinner = data.winner && (String(data.winner) === String(user?._id) || String(data.winner) === String(user?.id));
      if (isWinner) {
        toast('🏆 You won the auction! Congratulations!', 'success');
      } else {
        toast('🏁 Auction has ended.', 'info');
      }
    });

    const offExt = on('auctionExtended', (data) => {
      if (data.carId !== id) return;
      setCar(prev => ({ ...prev, auctionEnd: data.newEndTime }));
      toast('⏱ Auction extended by 2 min due to late bidding!', 'info');
    });

    return () => { offBid(); offEnd(); offExt(); };
  }, [id, on, isLive, isAuth, user]);

  const handleBuy = (type) => {
    if (!isAuth) { navigate(`/register?redirect=/cars/${id}`); return; }
    setPayType(type);
    setShowPayModal(true);
  };

  const handleFav = async () => {
    if (!isAuth) { navigate(`/register?redirect=/cars/${id}`); return; }
    try {
      const res = await favoritesAPI.toggle(id);
      const nowFav = res.favorited === true || res.favorited === 'true';
      setIsFav(nowFav);
      if (!nowFav) setPriceAlertOn(false);
      toast(nowFav ? 'Saved to wishlist' : 'Removed from wishlist', 'success');
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast('Failed to update wishlist', 'error');
    }
  };

  const handlePriceAlert = async () => {
    if (!isAuth) { navigate(`/register?redirect=/cars/${id}`); return; }
    const next = !priceAlertOn;
    try {
      await favoritesAPI.setPriceAlert(id, next);
      setPriceAlertOn(next);
      toast(next ? 'Price alerts enabled' : 'Price alerts disabled', 'success');
    } catch (error) {
      console.error('Failed to update price alert:', error);
      toast('Failed to update price alert', 'error');
    }
  };

  const handleChat = async () => {
    if (!isAuth) { navigate(`/register?redirect=/cars/${id}`); return; }
    setStartingChat(true);
    try { const d = await chatAPI.start({ carId: id, participantId: car.dealer?._id }); navigate(`/chat/${d.chat?._id || d._id}`); }
    catch { toast('Could not start chat', 'error'); }
    finally { setStartingChat(false); }
  };

  const handleSetCover = async (idx) => {
    setImgIdx(idx);
    try {
      await carsAPI.promote(id, { coverImage: idx });
      setCar(p => ({ ...p, coverImage: idx }));
      toast('Cover image updated', 'success');
    } catch (error) {
      console.error('Failed to update cover image:', error);
      toast('Failed to update cover', 'error');
    }
  };

  const handleTogglePromote = async () => {
    setPromoting(true);
    try {
      const next = !car.isPromoted;
      await carsAPI.promote(id, { isPromoted: next });
      setCar(p => ({ ...p, isPromoted: next }));
      toast(next ? 'Featured on homepage' : 'Removed from featured', 'success');
    } catch (error) {
      console.error('Failed to toggle promotion:', error);
      toast('Failed to update promotion status', 'error');
    } finally { setPromoting(false); }
  };

  if (loading) return <DetailSkeleton />;

  if (!car) return <NotFoundState title="Vehicle Not Found" message="This vehicle has been removed or sold." actions={[{ label: 'Back to Showroom', to: '/showroom' }, { label: 'Go Home', to: '/' }]} />;

  const price = car.currentBid || car.price || 0;

  const isScheduled = car?.auctionStatus === 'scheduled';
  const showAuctionCard = isLive || isScheduled;

  return (
    <>
      {seoMetadata && <SEOHead metadata={seoMetadata} />}
      <div className="car-detail-page" style={isMobile ? { paddingBottom: 80 } : undefined}>
      <VehicleStructuredData car={car} />
      <BreadcrumbStructuredData items={[
      { name: 'Home', url: '/' },
      { name: 'Showroom', url: '/showroom' },
      { name: car.title || `${car.brand || ''} ${car.model || ''}`.trim() || 'Vehicle', url: `/cars/${car._id}` },
    ]} />

      {/* Breadcrumb */}
      <div className="detail-breadcrumb">
        <BackButton fallback="/showroom" label="Back" />
      </div>

      {/* Trust Strip */}
      <div className="trust-strip">
        {[
          { icon: ShieldCheck, label: 'Verified Listing', show: car?.isVerifiedDealer },
          { icon: Lock, label: 'Escrow Protected', show: isP2P || (isDealerSeller && car?.escrowEnabled) },
          { icon: Star, label: 'Featured', show: car?.isPromoted },
          { icon: Zap, label: 'Live Auction', show: isLive },
          { icon: CheckCircle, label: 'NTSA Verified', show: car?.ntsaVerified },
        ].filter(item => item.show).map((item, i) => (
          <div key={i} className="trust-strip-item">
            <item.icon size={11} />
            {item.label}
          </div>
        ))}
      </div>

      <div className="detail-grid">

        {/* ═══════ LEFT COLUMN ═══════ */}
        <div className="detail-left">

          {/* Vehicle Header */}
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: 'clamp(1.5rem,3vw,2.2rem)',
              fontWeight: 800, color: '#fff', lineHeight: 1.1,
              margin: '0 0 10px',
            }}>{car.title}</h1>
            <div className="vh-meta">
              <span style={{
                fontSize: 15, color: 'var(--gold)', fontWeight: 700,
                letterSpacing: '0.02em',
              }}>
                KES {Number(price).toLocaleString()}
              </span>
              {car.location?.city && (
                <span className="vh-meta-item">
                  <MapPin size={12} className="vh-meta-icon" /> {car.location.city}
                </span>
              )}
              {car.year && (
                <span className="vh-meta-item">
                  <Calendar size={12} className="vh-meta-icon" /> {car.year}
                </span>
              )}
            </div>
          </div>

          {/* Gallery */}
          <GalleryImage car={car} idx={imgIdx} onPrev={prevImg} onNext={nextImg} total={total} onExpand={() => setShowGallery(true)} />

          {/* Thumbnail Strip */}
          {total > 1 && (
            <div className="detail-thumbnails">
              {images.map((img, i) => {
                const src = typeof img === 'string' ? img : img?.url;
                const isActive = i === imgIdx;
                const isCover = i === (car.coverImage ?? 0);
                return (
                  <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                    <button onClick={() => setImgIdx(i)}
                      className="thumb-btn"
                      style={{
                        border: isActive ? '2px solid var(--gold)' : '2px solid rgba(255,255,255,0.08)',
                        opacity: isActive ? 1 : 0.55,
                      }}
                    >
                      {src && <img src={src} alt="" loading="lazy" decoding="async" />}
                    </button>
                    {isCover && (
                      <span className="thumb-badge" style={{ background: 'var(--gold)', color: '#000' }}>★</span>
                    )}
                    {canManage && (
                      <button onClick={() => handleSetCover(i)} title="Set as cover"
                        className="thumb-badge"
                        style={{
                          top: 'auto', bottom: -4,
                          background: isCover ? 'var(--gold)' : 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: isCover ? '#000' : 'rgba(255,255,255,0.5)',
                          cursor: 'pointer', fontSize: 7,
                        }}
                      >
                        <Pin size={7} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Owner controls */}
          {canManage && (
            <div className="owner-controls">
              <div className="owner-controls-info">
                <div className="owner-controls-title">Homepage Feature</div>
                <div className="owner-controls-desc">
                  {car.isPromoted ? 'This car is currently featured on the homepage' : 'Pin this car to the homepage gallery'}
                </div>
              </div>
              <button onClick={handleTogglePromote} disabled={promoting}
                className={`owner-btn ${car.isPromoted ? 'owner-btn-danger' : ''}`}>
                <TrendingUp size={13} /> {car.isPromoted ? 'Unfeature' : 'Feature'}
              </button>
              <Link to={`/dealer/edit/${car._id}`} className="owner-btn">Edit</Link>
            </div>
          )}

          {/* Specs Grid */}
          <div className="detail-section">
            <div className="detail-section-label">Full Specifications</div>
            <div className="spec-grid">
              <SpecItem icon={Settings2} label="Brand" value={car.brand} delay={0} />
              <SpecItem icon={Settings2} label="Model" value={car.model} delay={40} />
              <SpecItem icon={Calendar} label="Year" value={car.year} delay={80} />
              <SpecItem icon={Fuel} label="Fuel" value={car.fuel} delay={120} />
              <SpecItem icon={Settings2} label="Transmission" value={car.transmission} delay={160} />
              <SpecItem icon={Settings2} label="Body" value={car.bodyType} delay={200} />
              <SpecItem icon={Gauge} label="Mileage" value={car.mileage ? `${Number(car.mileage).toLocaleString()} km` : null} delay={240} />
              <SpecItem icon={Settings2} label="Colour" value={car.color} delay={280} />
              <SpecItem icon={Settings2} label="Condition" value={car.condition} delay={320} />
              <SpecItem icon={Settings2} label="Engine" value={car.engine} delay={360} />
              <SpecItem icon={Settings2} label="Drivetrain" value={car.drivetrain} delay={400} />
              <SpecItem icon={MapPin} label="Location" value={car.location?.city} delay={440} />
            </div>
          </div>

          {/* Vehicle Overview */}
          <div>
            <div className="detail-section-label">Vehicle Overview</div>
            <div className="stat-grid">
              <div className="stat-card">
                <div>Views</div>
                <div className="stat-card-val">{car.views || 0}</div>
              </div>
              <div className="stat-card">
                <div>Saved</div>
                <div className="stat-card-val">{car.favoritesCount || 0}</div>
              </div>
              <div className="stat-card">
                <div>Bids</div>
                <div className="stat-card-val">{car.bidsCount || 0}</div>
              </div>
              <div className="stat-card">
                <div>Listed</div>
                <div className="stat-card-val" style={{ fontSize: 15, fontWeight: 600 }}>
                  {car.createdAt ? new Date(car.createdAt).toLocaleDateString() : 'Recently'}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {car.description && (
            <div className="detail-description">
              <div className="detail-section-label">About This Vehicle</div>
              <p className="desc-text">{car.description}</p>
            </div>
          )}

          {/* Features */}
          {car.features?.length > 0 && (
            <div className="detail-features">
              <div className="detail-section-label">Features & Equipment</div>
              <div className="features-grid">
                {car.features.map((f, i) => (
                  <span key={i} className="feature-chip">
                    <CheckCircle size={10} className="feature-chip-icon" /> {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Inspection Status */}
          <div className="detail-section">
            <div className="detail-section-label">Inspection Status</div>
            <NtsaStatusCard
              car={car}
              ntsaStatus={ntsaStatus}
              ntsaLoading={ntsaLoading}
              canManage={canManage}
              onRequestNtsa={handleRequestNtsa}
            />
          </div>

          {/* Escrow Status */}
          {(isP2P || (isDealerSeller && car?.escrowEnabled)) && (
            <div>
              <div className="detail-section-label">Escrow Protection</div>
              <div className="info-card" style={{
                background: 'rgba(34,197,94,0.04)',
                border: '1px solid rgba(34,197,94,0.18)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: 'rgba(34,197,94,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Lock size={15} style={{ color: '#22C55E' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Escrow Protected</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Secure payment protection</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>
                  Your payment is held securely in escrow until you confirm receipt of the vehicle. Funds are only released to the seller after your approval, ensuring a safe transaction.
                </div>
              </div>
            </div>
          )}

          {/* Auction Status */}
          {showAuctionCard && (
            <div>
              <div className="detail-section-label">Auction Status</div>
              <div className="info-card" style={{
                background: isLive ? 'rgba(239,68,68,0.04)' : 'rgba(245,158,11,0.04)',
                border: isLive ? '1px solid rgba(239,68,68,0.18)' : '1px solid rgba(245,158,11,0.18)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: isLive ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Zap size={15} style={{ color: isLive ? '#EF4444' : '#F59E0B' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                      {isLive ? 'Live Auction' : 'Scheduled Auction'}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                      {isLive ? 'Bidding in progress' : 'Auction scheduled'}
                    </div>
                  </div>
                </div>
                {isLive && countdown && (
                  <div style={{
                    fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)', fontWeight: 700, color: '#EF4444',
                    fontFamily: 'var(--font-display)', fontStyle: 'italic',
                  }}>
                    {countdown}
                  </div>
                )}
                </div>
                {isLive && car.currentBid > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Current Bid</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>
                      KES {Number(car.currentBid).toLocaleString()}
                    </span>
                  </div>
                )}
                {car.bidsCount > 0 && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {car.bidsCount} bid{car.bidsCount !== 1 ? 's' : ''} placed
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dealer Profile */}
          {dealer && (
            <div className="detail-card">
              <div className="detail-section-label">About The Seller</div>
              <div className="dealer-profile">
                <div className="dealer-avatar">
                  {(dealer.name || 'D')[0].toUpperCase()}
                </div>
                <div className="dealer-info">
                  <div className="dealer-name">{dealer.name || 'Seller'}</div>
                  {dealer.businessName && <div className="dealer-business">{dealer.businessName}</div>}
                  <div className="dealer-stats">
                    {dealer.dealerRating && (
                      <span className="dealer-rating">
                        <Star size={11} fill="currentColor" /> {dealer.dealerRating}/5
                      </span>
                    )}
                    {dealer.trustScore && (
                      <span className={`dealer-trust ${dealer.trustScore >= 80 ? 'trust-high' : 'trust-mid'}`}>
                        {dealer.trustScore}% Trust
                      </span>
                    )}
                    {dealer.totalTransactions > 0 && (
                      <span className="dealer-sales">{dealer.totalTransactions} sales</span>
                    )}
                  </div>
                  {dealer.trustScore && (
                    <div className="dealer-trust-bar">
                      <div className="dealer-trust-fill" style={{ width: `${dealer.trustScore}%` }} />
                    </div>
                  )}
                  <div className="dealer-contact">
                    {dealer.location && dv.showLocation && (
                      <span className="dealer-contact-item"><MapPin size={11} className="contact-icon" />{dealer.location}</span>
                    )}
                    {dealer.phone && dv.showPhone && (
                      <span className="dealer-contact-item"><Phone size={11} className="contact-icon" />{dealer.phone}</span>
                    )}
                    {dealer.email && dv.showEmail && (
                      <span className="dealer-contact-item"><Mail size={11} className="contact-icon" />{dealer.email}</span>
                    )}
                  </div>
                  {dealer.escrowMandatory && (
                    <div className="dealer-escrow-badge">
                      <Lock size={10} /> Escrow Protected Seller
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <CarDetailReviews
            dealerId={car.dealer?._id}
            carId={id}
            reviews={reviews}
            isAuth={isAuth}
            isOwner={isOwner}
            onReviewSubmitted={() => {
              if (car?.dealer?._id)
                reviewsAPI.forDealer(car.dealer._id).then(d => setReviews(d.reviews || [])).catch(() => {});
            }}
          />
        </div>

        {/* ═══════ RIGHT COLUMN (Sticky Sidebar) ═══════ */}
        <div className="detail-sidebar">

          {/* Price Card */}
          <div className="price-card">
            <div className="price-card-accent" />

            <div className="price-card-body">
              {/* Pricing */}
              <div className="price-box">
                <div className="price-box-label">
                  {isLive && car.currentBid > 0 ? 'Current Bid' : isP2P || (isDealerSeller && car.escrowEnabled) ? 'Escrow Price' : 'Buy Now Price'}
                </div>
                <div className="price-box-amount">{formatKES(price)}</div>
                {isLive && car.currentBid > 0 && (
                  <div className="price-box-starting">Starting: KES {(car.price / 1000).toFixed(0)}K</div>
                )}
              </div>

              {/* CTAs */}
              {isOwner ? (
                <Link to={`/dealer/edit/${car._id}`} className="cta-edit-listing">
                  Edit Your Listing
                </Link>
              ) : (
                <>
                  {isLive && (
                    <InlineBidding
                      car={car}
                      bidAmount={bidAmount}
                      onBidAmountChange={v => setBidAmount(v)}
                      onPlaceBid={handlePlaceBid}
                      onShowConfirm={handleShowBidConfirm}
                      bidPlacing={bidPlacing}
                      bidError={bidError}
                      bidHistory={bidHistory}
                      countdown={countdown}
                      isAuth={isAuth}
                      reserveMet={reserveMet}
                      showReserve={showReserve}
                      bidCount={car.bidsCount}
                      currentBid={car.currentBid}
                      startingBid={car.startingBid}
                    />
                  )}

                <div className="cta-group">
                  {car.allowBuy && isP2P ? (
                    <button onClick={() => handleBuy('escrow')} className="cta-primary cta-escrow">
                      <Lock size={15} /> Buy via Escrow
                    </button>
                  ) : car.allowBuy && isDealerSeller ? (
                    <button onClick={() => handleBuy('escrow')} className="cta-primary cta-buynow">
                      <ShieldCheck size={15} /> Buy Now
                    </button>
                  ) : null}

                  {dv.chatEnabled && !car.chatDisabled && (
                    <button onClick={handleChat} disabled={startingChat} className="cta-secondary">
                      <MessageCircle size={14} /> {startingChat ? 'Opening…' : 'Message Seller'}
                    </button>
                  )}

                  <button onClick={handleFav} className={`cta-fav ${isFav ? 'cta-fav-active' : ''}`}>
                    <Heart size={13} fill={isFav ? 'currentColor' : 'none'} />
                    {isFav ? 'Saved to Wishlist' : 'Save Car'}
                  </button>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        const text = `Check out this ${car.title} on KAYAD — KES ${Number(car.currentBid || car.price || 0).toLocaleString()}\n${window.location.href}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
                      }}
                      className="cta-fav"
                      style={{ fontSize: 11, flex: 1, color: '#25D366', borderColor: 'rgba(37,211,102,0.3)' }}
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </button>
                    <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast('Link copied!', 'success'); }} className="cta-fav" style={{ fontSize: 11, flex: 1 }}>
                      <span className="contact-emoji">📋</span> Copy link
                    </button>
                  </div>

                  {(dealer?.phone || car.dealerPhone) && (
                    <a
                      href={`https://wa.me/${String(dealer?.phone || car.dealerPhone).replace(/[^0-9]/g, '').replace(/^0/, '254')}?text=${encodeURIComponent(`Hi, I'm interested in the ${car.title} listed on KAYAD (${window.location.href})`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="cta-fav"
                      style={{ fontSize: 12, justifyContent: 'center', color: '#25D366', borderColor: 'rgba(37,211,102,0.3)', textDecoration: 'none' }}
                    >
                      <MessageCircle size={14} /> Chat with seller on WhatsApp
                    </a>
                  )}

                  {isFav && (
                    <button onClick={handlePriceAlert} className={`cta-fav ${priceAlertOn ? 'cta-fav-active' : ''}`} style={{ borderColor: priceAlertOn ? 'rgba(212,196,168,0.2)' : undefined }}>
                      <Bell size={13} fill={priceAlertOn ? 'currentColor' : 'none'} />
                      {priceAlertOn ? 'Price Alerts On' : 'Notify on Price Drop'}
                    </button>
                  )}
                </div>
                </>
              )}

              {/* Trust Note */}
              {isP2P || (isDealerSeller && car.escrowEnabled) ? (
                <div className="trust-note trust-note-escrow">
                  <Lock size={12} className="trust-note-icon" />
                  <div className="trust-note-text">
                    <strong>Escrow Protected.</strong> Payment held securely until you confirm receipt. Funds released to the seller only after your approval.
                  </div>
                </div>
              ) : (
                <div className="trust-note trust-note-dealer">
                  <ShieldCheck size={12} className="trust-note-icon" />
                  <div className="trust-note-text">
                    <strong>Direct Purchase.</strong> Pay the seller directly — no escrow holding. This vehicle is listed by a Kayad-approved dealer.
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <ReportButton targetType="listing" targetId={car._id} />
              </div>
            </div>
          </div>

          {/* Compare */}
          <CompareToggle car={car} />

          {/* Location */}
          {car.location?.city && (
            <div className="sidebar-block">
              <div className="sidebar-block-label">Location</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                <MapPin size={14} style={{ color: 'var(--gold)' }} />
                {car.location.city}
                {car.location.region && `, ${car.location.region}`}
              </div>
            </div>
          )}

          {/* Dealer Mini Card */}
          {dealer && (
            <div className="sidebar-block">
              <div className="sidebar-block-label">Listed By</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(212,196,168,0.12)', color: 'var(--gold)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14,
                }}>
                  {(dealer.name || 'D')[0]}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{dealer.name || 'Dealer'}</div>
                  {dealer.dealerRating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>
                      <Star size={10} fill="currentColor" /> {dealer.dealerRating}/5
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TCO */}
          <TcoCalculator vehicle={car} />

          {/* Market Valuation */}
          <MarketValuationMatrix
            carId={car._id}
            carPrice={car.price || car.currentBid}
            carBrand={car.brand}
            carModel={car.model}
            carYear={car.year}
          />

          {/* Price History */}
          <PriceHistoryChart carId={car._id} currentPrice={car.price} />

          {/* Market Pulse (SokoAI) */}
          <MarketPulse carId={car._id} carPrice={car.price || car.currentBid} carBrand={car.brand} carYear={car.year} />
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      {isMobile && (
        <div className="mobile-sticky-bar">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mobile-sticky-price-label">
              {isLive && car.currentBid > 0 ? 'Current Bid' : isLive ? 'Starting Bid' : 'Price'}
            </div>
            <div className="mobile-sticky-price">
              {formatKES(price)}
            </div>
          </div>
          {isOwner ? (
            <Link to={`/dealer/edit/${car._id}`} className="mobile-sticky-btn mobile-sticky-btn-primary" style={{ textDecoration: 'none' }}>
              Edit Listing
            </Link>
          ) : (
            <>
              {car.allowBuy && (
                <button onClick={() => handleBuy('escrow')} className="mobile-sticky-btn mobile-sticky-btn-primary">
                  {isP2P ? 'Buy via Escrow' : 'Buy Now'}
                </button>
              )}
              {dv.chatEnabled && !car.chatDisabled && (
                <button onClick={handleChat} className="mobile-sticky-btn-secondary">
                  <MessageCircle size={18} />
                </button>
              )}
              <button onClick={handleFav} className="mobile-sticky-fav"
                style={{
                  background: isFav ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isFav ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  color: isFav ? '#ef4444' : 'rgba(255,255,255,0.5)',
                }}>
                <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
              </button>
            </>
          )}
        </div>
      )}

      {showGallery && (
        <GalleryModal car={car} initialIdx={imgIdx} onClose={() => setShowGallery(false)} />
      )}

      {/* Similar Cars */}
      {car && !loading && <SimilarCars carId={car._id} brand={car.brand} />}

      {showPayModal && (
        <PaymentModal
          amount={car.price}
          carId={car._id}
          type={payType}
          title={`${payType === 'escrow' ? 'Buy via Escrow' : 'Buy Now'}: ${car.title}`}
          onClose={() => setShowPayModal(false)}
          onSuccess={() => toast(
            payType === 'escrow' ? 'Escrow funded! Seller has been notified.' : 'Purchase confirmed!',
            'success'
          )}
        />
      )}

      {showBidConfirm && (
        <div className="bid-modal-overlay">
          <div className="bid-modal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="bid-modal-title">Confirm Your Bid</div>
              <button onClick={() => setShowBidConfirm(false)} className="bid-modal-close">
                <X size={20} />
              </button>
            </div>
            <div className="bid-modal-body">
              You are about to place a bid of <strong style={{ color: 'var(--gold)' }}>KES {Number(bidAmount).toLocaleString()}</strong> on {car.title}.
              <br /><br />
              This is a binding bid. If you win the auction, you'll be required to complete the purchase through escrow.
            </div>
            <div className="bid-modal-amount-box">
              <div className="bid-modal-amount-label">Your Bid</div>
              <div className="bid-modal-amount">KES {Number(bidAmount).toLocaleString()}</div>
            </div>
            <div className="bid-modal-actions">
              <button onClick={handlePlaceBid} disabled={bidPlacing} className="bid-modal-confirm">
                {bidPlacing ? 'Processing...' : 'Confirm Bid'}
              </button>
              <button onClick={() => setShowBidConfirm(false)} disabled={bidPlacing} className="bid-modal-cancel">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outbid Alert Toast */}
      {outbidAlert && (
        <div className="outbid-toast">
          <AlertTriangle size={18} style={{ color: '#fff', flexShrink: 0 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
            You've been outbid!
          </div>
          <button onClick={() => setOutbidAlert(false)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', marginLeft: 8, flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
    </>
  );
}
