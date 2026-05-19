import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { carsAPI, reviewsAPI, chatAPI, ntsaAPI, favoritesAPI, formatKES } from '../api/api';
import { getMockCar } from '../data/mockCars';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import { useToast } from '../context/ToastContext';
import PaymentModal from '../components/PaymentModal';
import InspectionButton from '../components/InspectionButton';
import TcoCalculator from '../components/TcoCalculator';
import MarketValuationMatrix from '../components/MarketValuationMatrix';
import PriceHistoryChart from '../components/PriceHistoryChart';
import GalleryModal from '../components/GalleryModal';
import usePageMeta from '../hooks/usePageMeta';
import {
  MapPin, Gauge, Calendar, Fuel, Settings2, ShieldCheck,
  Heart, MessageCircle, ChevronLeft, ChevronRight, Bell,
  Star, Eye, Bookmark, Zap, Award, Lock, ArrowLeft, Pin, TrendingUp,
  CheckCircle, AlertTriangle, Clock, BarChart3
} from 'lucide-react';

function firstImage(car, idx = 0) {
  const imgs = car?.images || [];
  const img = imgs[idx];
  if (!img) return null;
  return typeof img === 'string' ? img : img?.url || null;
}

function GalleryImage({ car, idx, onPrev, onNext, total }) {
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const touchX = useRef(null);
  const src = (!err && firstImage(car, idx)) ||
    'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=1600&fit=crop';

  const handleTouchStart = useCallback((e) => { touchX.current = e.touches[0].clientX; }, []);
  const handleTouchEnd = useCallback((e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx > 50) onPrev();
    else if (dx < -50) onNext();
    touchX.current = null;
  }, [onPrev, onNext]);

  return (
    <div className="car-detail-gallery"
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {!loaded && <div className="gallery-shimmer" />}
      <img src={src} onError={() => setErr(true)} onLoad={() => setLoaded(true)} alt={car?.title || 'Vehicle'}
        style={{ opacity: loaded ? 1 : 0.3, transition: 'opacity 0.5s ease' }} />

      <div className="gallery-overlay" />

      {total > 1 && (
        <>
          <button onClick={onPrev} className="gallery-nav-btn gallery-nav-left"><ChevronLeft size={18} /></button>
          <button onClick={onNext} className="gallery-nav-btn gallery-nav-right"><ChevronRight size={18} /></button>
          <div className="gallery-counter">{idx + 1} / {total}</div>
        </>
      )}

      {car?.auctionStatus === 'live' && (
        <div className="gallery-badge-live">
          <span className="live-dot-pulse" />
          <span>LIVE AUCTION</span>
        </div>
      )}

      {car?.isPromoted && (
        <div className="gallery-badge-featured">
          <Star size={10} />
          <span>FEATURED</span>
        </div>
      )}
    </div>
  );
}

function SpecItem({ icon: Icon, label, value, delay = 0 }) {
  if (!value) return null;
  return (
    <div className="spec-item" style={{ animationDelay: `${delay}ms` }}>
      <div className="spec-item-header">
        <Icon size={12} className="spec-item-icon" />
        <span className="spec-item-label">{label}</span>
      </div>
      <div className="spec-item-value">{value}</div>
    </div>
  );
}

export default function CarDetailPage() {
  const { id } = useParams();
  const { user, isAuth, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [car, setCar] = useState(null);
  usePageMeta(
    car ? `${car.title} - ${car.brand} ${car.model} ${car.year}` : 'Car Details',
    car ? `${car.title} - ${car.brand} ${car.model} ${car.year} in ${car.location}. Price: KES ${Number(car.price).toLocaleString()}. View details on Kayad.` : 'View premium car details on Kayad Marketplace.'
  );
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payType, setPayType] = useState('escrow');
  const [isFav, setIsFav] = useState(false);
  const [priceAlertOn, setPriceAlertOn] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
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
        if (c) { setImgIdx(c.coverImage ?? 0); carsAPI.trackClick?.(id).catch(() => {}); }
        if (c?.dealer?._id) reviewsAPI.forDealer(c.dealer._id).then(d => setReviews(d.reviews || [])).catch(() => {});
      })
      .catch(() => { const m = getMockCar(id); setCar(m); if (m) setImgIdx(m.coverImage ?? 0); })
      .finally(() => setLoading(false));
    if (isAuth) {
      favoritesAPI.list().then(d => {
        const favs = d.favorites || d.cars || d.data || [];
        const match = favs.find(f => (f._id === id || f?.car?._id === id));
        setIsFav(!!match);
        setPriceAlertOn(match?.notifyOnPriceDrop === true);
      }).catch(() => {});
    }
  }, [id]);

  // Load NTSA verification status
  useEffect(() => {
    if (!car?._id) return;
    setNtsaLoading(true);
    ntsaAPI.status(car._id).then(d => {
      setNtsaStatus(d);
    }).catch(() => {}).finally(() => setNtsaLoading(false));
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
  const isLive = car?.auctionStatus === 'live';
  const dealer = car?.dealer;
  const dv = dealer?.visibility || { showPhone: true, showEmail: true, showLocation: true, chatEnabled: true };

  const isP2P = !dealer || dealer.role === 'individual_seller' || dealer.role === 'broker' || dealer.role === 'user' || !dealer.role;
  const isDealerSeller = dealer?.role === 'dealer';

  const handleBuy = (type) => {
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
    } catch { toast('Failed', 'error'); }
  };

  const handlePriceAlert = async () => {
    if (!isAuth) { navigate(`/register?redirect=/cars/${id}`); return; }
    const next = !priceAlertOn;
    try {
      await favoritesAPI.setPriceAlert(id, next);
      setPriceAlertOn(next);
      toast(next ? 'Price alerts enabled' : 'Price alerts disabled', 'success');
    } catch { toast('Failed to update price alert', 'error'); }
  };

  const handleChat = async () => {
    if (!isAuth) { navigate(`/register?redirect=/cars/${id}`); return; }
    setStartingChat(true);
    try { const d = await chatAPI.start({ carId: id, participantId: car.dealer?._id }); navigate(`/chat/${d.chat?._id || d._id}`); }
    catch { toast('Could not start chat', 'error'); }
    finally { setStartingChat(false); }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!isAuth) { navigate('/login'); return; }
    setSubmittingReview(true);
    try {
      await reviewsAPI.create({ ...reviewForm, dealer: car.dealer?._id, carId: id });
      toast('Review submitted!', 'success');
      setReviewForm({ rating: 5, comment: '' });
      if (car?.dealer?._id) reviewsAPI.forDealer(car.dealer._id).then(d => setReviews(d.reviews || [])).catch(() => {});
    } catch { toast('Failed to submit', 'error'); }
    finally { setSubmittingReview(false); }
  };

  const handleSetCover = async (idx) => {
    setImgIdx(idx);
    try { await carsAPI.promote(id, { coverImage: idx }); setCar(p => ({ ...p, coverImage: idx })); toast('Cover image updated', 'success'); }
    catch { toast('Failed to update cover', 'error'); }
  };

  const handleTogglePromote = async () => {
    setPromoting(true);
    try {
      const next = !car.isPromoted;
      await carsAPI.promote(id, { isPromoted: next });
      setCar(p => ({ ...p, isPromoted: next }));
      toast(next ? 'Featured on homepage' : 'Removed from featured', 'success');
    } catch { toast('Failed', 'error'); }
    finally { setPromoting(false); }
  };

  if (loading) return (
    <div className="page-loader">
      <div className="page-loader-spinner" />
    </div>
  );

  if (!car) return (
    <div className="page-notfound">
      <div className="notfound-icon">Not Found</div>
      <p>This vehicle has been removed or sold.</p>
      <Link to="/showroom" className="notfound-back">Back to Gallery</Link>
    </div>
  );

  const price = car.currentBid || car.price || 0;
  const priceStr = price >= 1e6 ? `${(price/1e6).toFixed(2)}M` : `${(price/1000).toFixed(0)}K`;

  return (
    <div className="car-detail-page">

      {/* Breadcrumb */}
      <div className="detail-breadcrumb">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={14} /> Back to Gallery
        </button>
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
                      {src && <img src={src} alt="" />}
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

          {/* Reviews */}
          <div className="detail-card">
            <div className="detail-section-label">
              Dealer Reviews {reviews.length > 0 && `(${reviews.length})`}
            </div>
            {reviews.length === 0 ? (
              <div className="reviews-empty">No reviews yet. Be the first to review this dealer.</div>
            ) : reviews.slice(0, 4).map(r => (
              <div key={r._id} className="review-item">
                <div className="review-header">
                  <span className="review-author">{r.reviewer?.name || 'Anonymous'}</span>
                  <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p className="review-comment">{r.comment}</p>
              </div>
            ))}

            {isAuth && !isOwner && (
              <form onSubmit={handleReview} className="review-form">
                <div className="review-field">
                  <label className="review-label">Rating</label>
                  <select value={reviewForm.rating} onChange={e => setReviewForm(p => ({ ...p, rating: Number(e.target.value) }))}
                    className="review-select">
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{'★'.repeat(n)} — {n} star{n !== 1 ? 's' : ''}</option>)}
                  </select>
                </div>
                <div className="review-field">
                  <label className="review-label">Comment</label>
                  <textarea rows={3} placeholder="Share your experience with this dealer…" value={reviewForm.comment}
                    onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                    className="review-textarea" />
                </div>
                <button type="submit" disabled={submittingReview || !reviewForm.comment}
                  className={`review-submit ${reviewForm.comment ? 'review-submit-active' : ''}`}>
                  {submittingReview ? 'Submitting…' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ═══════ RIGHT COLUMN (Sticky Sidebar) ═══════ */}
        <div className="detail-sidebar">

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
                  {isLive && car.currentBid > 0 ? 'Current Bid' : isP2P ? 'Escrow Price' : 'Buy Now Price'}
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
                <div className="cta-group">
                  {isLive ? (
                    <Link to={`/auction/${car._id}`} className="cta-primary cta-auction">
                      <Zap size={15} /> Join Live Auction
                    </Link>
                  ) : isP2P ? (
                    <button onClick={() => handleBuy('escrow')} className="cta-primary cta-escrow">
                      <Lock size={15} /> Buy via Escrow
                    </button>
                  ) : isDealerSeller && car.allowBuy ? (
                    <button onClick={() => handleBuy('direct')} className="cta-primary cta-buynow">
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

                  {isFav && (
                    <button onClick={handlePriceAlert} className={`cta-fav ${priceAlertOn ? 'cta-fav-active' : ''}`} style={{ borderColor: priceAlertOn ? 'rgba(212,196,168,0.2)' : undefined }}>
                      <Bell size={13} fill={priceAlertOn ? 'currentColor' : 'none'} />
                      {priceAlertOn ? 'Price Alerts On' : 'Notify on Price Drop'}
                    </button>
                  )}
                </div>
              )}

              {/* Trust Note */}
              {isP2P ? (
                <div className="trust-note trust-note-escrow">
                  <Lock size={12} className="trust-note-icon" />
                  <div className="trust-note-text">
                    <strong>Escrow Protected.</strong> Payment held securely until you confirm receipt. Protects you when buying from independent sellers.
                  </div>
                </div>
              ) : isDealerSeller ? (
                <div className="trust-note trust-note-dealer">
                  <ShieldCheck size={12} className="trust-note-icon" />
                  <div className="trust-note-text">
                    <strong>Verified Dealer.</strong> This vehicle is listed by a KRA-vetted, Kayad-approved dealer. Direct purchase — no escrow required.
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* NTSA Verification Status */}
          <div className="ntsa-status-card">
            <div className="ntsa-status-header">
              <ShieldCheck size={13} className="ntsa-status-icon" />
              <span className="ntsa-status-label">NTSA Verification</span>
            </div>
            {ntsaLoading ? (
              <div style={{ padding: '12px 0', textAlign: 'center' }}>
                <div className="spinner" style={{ width: 20, height: 20, margin: '0 auto' }} />
              </div>
            ) : car.ntsaVerified ? (
              <div className="ntsa-status-passed">
                <span className="ntsa-badge-passed">Verified</span>
                <span className="ntsa-status-sub">Logbook & chassis verified by Kayad</span>
              </div>
            ) : ntsaStatus?.status === 'pending' ? (
              <div className="ntsa-status-pending">
                <span className="ntsa-badge-pending">Pending Review</span>
                <span className="ntsa-status-sub">Queued for NTSA verification</span>
              </div>
            ) : ntsaStatus?.status === 'in_review' ? (
              <div className="ntsa-status-review">
                <span className="ntsa-badge-review">In Review</span>
                <span className="ntsa-status-sub">Under review by Kayad team</span>
              </div>
            ) : ntsaStatus?.status === 'failed' ? (
              <div className="ntsa-status-failed">
                <span className="ntsa-badge-failed">Not Verified</span>
                {ntsaStatus?.request?.adminNotes && (
                  <span className="ntsa-status-sub">{ntsaStatus.request.adminNotes}</span>
                )}
                <button onClick={handleRequestNtsa} className="ntsa-retry-btn">Request Re-verification</button>
              </div>
            ) : canManage ? (
              <div className="ntsa-status-none">
                <span className="ntsa-status-sub">Not yet verified</span>
                <button onClick={handleRequestNtsa} disabled={ntsaLoading} className="ntsa-request-btn">
                  {ntsaLoading ? 'Requesting…' : 'Request NTSA Check'}
                </button>
              </div>
            ) : (
              <div className="ntsa-status-none">
                <span className="ntsa-status-sub">Verification not yet completed</span>
              </div>
            )}
          </div>

          {/* Compare */}
          <CompareToggle car={car} />

          {/* Inspection */}
          <InspectionButton carId={car._id} location={car.location?.city || dealer?.location} />

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
  );
}

function CompareToggle({ car }) {
  const { compareCount, maxCompare, addCar, removeCar, isComparing } = useCompare();
  const isComp = isComparing(car._id);
  const full = compareCount >= maxCompare;

  if (!car?._id) return null;

  return (
    <button onClick={() => isComp ? removeCar(car._id) : addCar(car._id)}
      disabled={!isComp && full}
      className={`compare-toggle ${isComp ? 'compare-active' : ''}`}>
      <BarChart3 size={13} />
      {isComp ? 'Added to Compare' : full ? 'Compare full (max 4)' : 'Add to Compare'}
    </button>
  );
}
