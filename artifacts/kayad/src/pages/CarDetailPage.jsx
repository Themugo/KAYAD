import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import '../styles/car-detail.css';
import BackButton from '../components/BackButton';
import ReportButton from '../components/ReportButton';
import DetailSkeleton from './car/components/DetailSkeleton';
import AuctionAnnouncement from './car/components/AuctionAnnouncement';
import InlineBidding from './car/components/InlineBidding';
import NtsaStatusCard from './car/components/NtsaStatusCard';
import { carsAPI, reviewsAPI, chatAPI, ntsaAPI, favoritesAPI, bidsAPI, formatKES } from '../api/api';
import { getMockCar } from '../data/mockCars';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import { useToast } from '../context/ToastContext';
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
import {
  MapPin, Gauge, Calendar, Fuel, Settings2, ShieldCheck,
  Heart, MessageCircle, ChevronLeft, ChevronRight, Bell,
  Star, Eye, Bookmark, Zap, Award, Lock, Pin, TrendingUp,
  CheckCircle, AlertTriangle, Clock, BarChart3
} from 'lucide-react';

// Extracted sub-components
import { firstImage, GalleryImage, SpecItem, CompareToggle } from './car/components/CarDetailWidgets';
import CarDetailReviews from './car/components/CarDetailReviews';

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

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    carsAPI.get(id)
      .then(data => {
        let c = data?.car || data?.data || data;
        if (!c || !c._id) c = getMockCar(id);
        setCar(c);
        if (c) { setImgIdx(c.coverImage ?? 0); carsAPI.trackClick?.(id).catch((error) => console.error('Track click failed:', error)); }
        if (c?.dealer?._id) reviewsAPI.forDealer(c.dealer._id).then(d => setReviews(d.reviews || [])).catch((error) => console.error('Fetch reviews failed:', error));
      })
      .catch((error) => {
        console.error('Failed to fetch car:', error);
        const m = getMockCar(id);
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

  useEffect(() => {
    if (!car?._id || !isLive) return;
    const fetchBids = () => {
      bidsAPI.getForCar(car._id).then(d => setBidHistory(d?.bids || [])).catch((error) => console.error('Failed to fetch bids:', error));
    };
    fetchBids();
    const iv = setInterval(fetchBids, 8000);
    return () => clearInterval(iv);
  }, [car?._id, isLive]);

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

  const handlePlaceBid = async () => {
    if (!isAuth) { navigate(`/login?redirect=/cars/${id}`); return; }
    if (!bidAmount || bidAmount <= (car.currentBid || car.startingBid || 0)) {
      setBidError('Bid must be higher than current bid');
      return;
    }
    setBidPlacing(true); setBidError('');
    try {
      await bidsAPI.place(car._id, { amount: bidAmount });
      setCar(c => ({ ...c, currentBid: bidAmount, bidsCount: (c?.bidsCount || 0) + 1 }));
      bidsAPI.getForCar(car._id).then(d => setBidHistory(d?.bids || [])).catch((error) => console.error('Failed to fetch bids after placement:', error));
    } catch (e) { setBidError(e?.response?.data?.message || 'Bid failed'); }
    finally { setBidPlacing(false); }
  };

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

  if (!car) return (
    <div className="page-notfound">
      <div className="notfound-icon">Not Found</div>
      <p>This vehicle has been removed or sold.</p>
      <Link to="/showroom" className="notfound-back">Back to Gallery</Link>
    </div>
  );

  const price = car.currentBid || car.price || 0;
  const priceStr = price >= 1e6 ? `${(price/1e6).toFixed(2)}M` : `${(price/1000).toFixed(0)}K`;

  const isScheduled = car?.auctionStatus === 'scheduled';
  const showAuctionCard = isLive || isScheduled;

  return (
    <>
      {seoMetadata && <SEOHead metadata={seoMetadata} />}
      <div className="car-detail-page">
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

      <div className="detail-grid">

        {/* ═══════ LEFT COLUMN ═══════ */}
        <div className="detail-left">

          {/* Gallery */}
          <div onClick={() => setShowGallery(true)} style={{ cursor: 'zoom-in' }}>
            <GalleryImage car={car} idx={imgIdx} onPrev={prevImg} onNext={nextImg} total={total} />
          </div>

          {/* Thumbnails */}
          {total > 1 && (
            <div className="detail-thumbnails">
              {images.map((img, i) => {
                const src = typeof img === 'string' ? img : img?.url;
                const isActive = i === imgIdx;
                const isCover = i === (car.coverImage ?? 0);
                return (
                  <div key={i} className="thumb-wrap">
                    <div className={`thumb ${isActive ? 'thumb-active' : ''}`} onClick={() => setImgIdx(i)}>
                      {src && <img src={src} alt={car?.title || ''} loading="lazy" decoding="async" />}
                    </div>
                    {canManage && (
                      <button onClick={() => handleSetCover(i)} title="Set as cover"
                        className={`thumb-pin ${isCover ? 'thumb-pin-active' : ''}`}>
                        <Pin size={8} />
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
                className={`owner-btn-feature ${car.isPromoted ? 'owner-btn-unfeature' : ''}`}>
                {car.isPromoted ? <><TrendingUp size={13} /> Unfeature</> : <><Star size={13} /> Feature</>}
              </button>
              <Link to={`/dealer/edit/${car._id}`} className="owner-btn-edit">Edit</Link>
            </div>
          )}

          {/* Title Bar */}
          <div className="detail-titlebar">
            <h1 className="detail-title">{car.title}</h1>
            <div className="detail-meta">
              {car.location?.city && (
                <span className="detail-meta-item">
                  <MapPin size={12} className="detail-meta-icon" />{car.location.city}
                </span>
              )}
              {car.year && (
                <span className="detail-meta-item">
                  <Calendar size={12} className="detail-meta-icon" />{car.year}
                </span>
              )}
              {car.mileage && (
                <span className="detail-meta-item">
                  <Gauge size={12} className="detail-meta-icon" />{(car.mileage/1000).toFixed(0)}k km
                </span>
              )}
              {car.fuel && (
                <span className="detail-meta-item">
                  <Fuel size={12} className="detail-meta-icon" />{car.fuel}
                </span>
              )}
              {car.transmission && (
                <span className="detail-meta-item">
                  <Settings2 size={12} className="detail-meta-icon" />{car.transmission}
                </span>
              )}
            </div>
          </div>

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

          {/* Description */}
          {car.description && (
            <div className="detail-description">
              <div className="desc-accent" />
              <div className="desc-glow" />
              <div className="desc-label">About This Vehicle</div>
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
                      <span className="dealer-contact-item"><span className="contact-emoji">📞</span>{dealer.phone}</span>
                    )}
                    {dealer.email && dv.showEmail && (
                      <span className="dealer-contact-item"><span className="contact-emoji">✉️</span>{dealer.email}</span>
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

          <AuctionAnnouncement car={car} />

          {/* Price Card */}
          <div className="price-card">
            <div className="price-card-accent" />

            <div className="price-card-body">
              {/* Badges */}
              <div className="price-badges">
                {car.isVerifiedDealer && (
                  <span className="badge badge-blue"><ShieldCheck size={10} /> Verified</span>
                )}
                {car.isPromoted && (
                  <span className="badge badge-gold"><Star size={10} /> Featured</span>
                )}
                {isLive && (
                  <span className="badge badge-red"><Zap size={10} /> Live Auction</span>
                )}
                {isP2P && (
                  <span className="badge badge-green"><Lock size={10} /> P2P Escrow</span>
                )}
              </div>

              <h2 className="price-card-title">{car.title}</h2>
              {car.location?.city && (
                <div className="price-card-location">
                  <MapPin size={11} className="price-card-location-icon" />{car.location.city}
                </div>
              )}

              {/* Pricing */}
              <div className="price-box">
                <div className="price-box-label">
                  {isLive && car.currentBid > 0 ? 'Current Bid' : isP2P || car.escrowEnabled !== false ? 'Escrow Price' : 'Buy Now Price'}
                </div>
                <div className="price-box-amount">KES {priceStr}</div>
                {isLive && car.currentBid > 0 && (
                  <div className="price-box-starting">Starting: KES {(car.price / 1000).toFixed(0)}K</div>
                )}
                {car.bidsCount > 0 && (
                  <div className="price-box-bids">{car.bidsCount} bid{car.bidsCount !== 1 ? 's' : ''} placed</div>
                )}
              </div>

              {/* Stats row */}
              <div className="price-stats">
                {[
                  { icon: '👁', val: car.views || 0, label: 'Views' },
                  { icon: '❤️', val: car.favoritesCount || 0, label: 'Saved' },
                  { icon: '⚡', val: car.bidsCount || 0, label: 'Bids' },
                ].map(s => (
                  <div key={s.label} className="price-stat-item">
                    <div className="price-stat-icon">{s.icon}</div>
                    <div className="price-stat-val">{s.val}</div>
                    <div className="price-stat-label">{s.label}</div>
                  </div>
                ))}
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
                      bidPlacing={bidPlacing}
                      bidError={bidError}
                      bidHistory={bidHistory}
                      countdown={countdown}
                    />
                  )}

                <div className="cta-group">
                  {car.allowBuy && (isP2P || isDealerSeller) ? (
                    car.escrowEnabled !== false ? (
                      <button onClick={() => handleBuy('escrow')} className="cta-primary cta-escrow">
                        <Lock size={15} /> Buy via Escrow
                      </button>
                    ) : (
                      <button onClick={() => handleBuy('escrow')} className="cta-primary cta-buynow">
                        <ShieldCheck size={15} /> Buy Now
                      </button>
                    )
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
                      📋 Copy link
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
              {isP2P || car.escrowEnabled !== false ? (
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

          <NtsaStatusCard
            car={car}
            ntsaStatus={ntsaStatus}
            ntsaLoading={ntsaLoading}
            canManage={canManage}
            onRequestNtsa={handleRequestNtsa}
          />

          {/* Compare */}
          <CompareToggle car={car} />

          {/* Inspection */}
          <InspectionButton carId={car._id} location={car.location?.city || dealer?.location} />
          <Link to="/ghost-checker" style={{ display: 'block', fontSize: 11, color: 'var(--gold)', textDecoration: 'none', marginTop: -8, marginBottom: 8, opacity: 0.7 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}>
            Learn about Ghost Check →
          </Link>

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

          {/* Dealer Mini Card */}
          {dealer && (
            <div className="sidebar-dealer-card">
              <div className="sidebar-dealer-label">Listed By</div>
              <div className="sidebar-dealer-row">
                <div className="sidebar-dealer-avatar">
                  {(dealer.name || 'D')[0]}
                </div>
                <div>
                  <div className="sidebar-dealer-name">{dealer.name || 'Dealer'}</div>
                  {dealer.dealerRating && (
                    <div className="sidebar-dealer-rating">
                      <Star size={10} fill="currentColor" /> {dealer.dealerRating}/5
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showGallery && (
        <GalleryModal car={car} initialIdx={imgIdx} onClose={() => setShowGallery(false)} />
      )}

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
    </div>
    </>
  );
}
