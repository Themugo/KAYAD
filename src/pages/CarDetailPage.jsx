import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { carsAPI, reviewsAPI, chatAPI, formatKES } from '../api/api';
import { getMockCar } from '../data/mockCars';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import { useToast } from '../context/ToastContext';
import PaymentModal from '../components/PaymentModal';
import InspectionButton from '../components/InspectionButton';
import TcoCalculator from '../components/TcoCalculator';
import MarketValuationMatrix from '../components/MarketValuationMatrix';
import usePageMeta from '../hooks/usePageMeta';
import {
  MapPin, Gauge, Calendar, Fuel, Settings2, ShieldCheck,
  Heart, MessageCircle, ChevronLeft, ChevronRight,
  Star, Eye, Bookmark, Zap, Award, Lock, ArrowLeft, Pin, TrendingUp
} from 'lucide-react';

function firstImage(car, idx = 0) {
  const imgs = car?.images || [];
  const img = imgs[idx];
  if (!img) return null;
  return typeof img === 'string' ? img : img?.url || null;
}

function GalleryImage({ car, idx, onPrev, onNext, total }) {
  const [err, setErr] = useState(false);
  const touchX = useRef(null);
  const src = (!err && firstImage(car, idx)) ||
    'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=1600&fit=crop';

  const handleTouchStart = useCallback((e) => {
    touchX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    const threshold = 50;
    if (dx > threshold) onPrev();
    else if (dx < -threshold) onNext();
    touchX.current = null;
  }, [onPrev, onNext]);

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#0a0a0a', borderRadius: 16, overflow: 'hidden', touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <img src={src} onError={() => setErr(true)} alt={car?.title || 'Vehicle'}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* gradient bottom overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%)', pointerEvents: 'none' }} />

      {/* nav arrows */}
      {total > 1 && (
        <>
          <button onClick={onPrev} style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)', transition: 'background 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
          ><ChevronLeft size={18} /></button>
          <button onClick={onNext} style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)', transition: 'background 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
          ><ChevronRight size={18} /></button>
        </>
      )}

      {/* counter */}
      {total > 1 && (
        <div style={{ position: 'absolute', bottom: 14, right: 14, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
          {idx + 1} / {total}
        </div>
      )}

      {/* live badge */}
      {car?.auctionStatus === 'live' && (
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.92)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '5px 12px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'block', animation: 'pulse 1.2s infinite' }} />
          <span style={{ fontSize: 10, color: '#fff', fontWeight: 800, letterSpacing: '0.08em' }}>LIVE AUCTION</span>
        </div>
      )}

      {/* promoted badge */}
      {car?.isPromoted && (
        <div style={{ position: 'absolute', top: 14, right: total > 1 ? 60 : 14, background: 'rgba(212,168,67,0.9)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Star size={10} style={{ color: '#000' }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: '#000', letterSpacing: '0.1em' }}>FEATURED</span>
        </div>
      )}
    </div>
  );
}

function SpecItem({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={13} style={{ color: 'rgba(212,168,67,0.6)', flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{value}</div>
    </div>
  );
}

export default function CarDetailPage() {
  const { id } = useParams();
  const { user, isAuth, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [car,             setCar]             = useState(null);
  usePageMeta(
    car ? `${car.title} - ${car.brand} ${car.model} ${car.year}` : 'Car Details',
    car ? `${car.title} - ${car.brand} ${car.model} ${car.year} in ${car.location}. Price: KES ${Number(car.price).toLocaleString()}. View details on Kayad.` : 'View premium car details on Kayad Marketplace.'
  );
  const [reviews,         setReviews]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [imgIdx,          setImgIdx]          = useState(0);
  const [showPayModal,    setShowPayModal]     = useState(false);
  const [isFav,           setIsFav]           = useState(false);
  const [reviewForm,      setReviewForm]      = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [startingChat,    setStartingChat]    = useState(false);
  const [promoting,       setPromoting]       = useState(false);

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
  }, [id]);

  const images = car?.images || [];
  const total  = images.length;
  const prevImg = useCallback(() => setImgIdx(i => i > 0 ? i - 1 : total - 1), [total]);
  const nextImg = useCallback(() => setImgIdx(i => i < total - 1 ? i + 1 : 0), [total]);

  // Keyboard nav
  useEffect(() => {
    const h = (e) => { if (e.key === 'ArrowLeft') prevImg(); if (e.key === 'ArrowRight') nextImg(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [prevImg, nextImg]);

  // Robust ownership check: user may have _id or id, dealer may be object or string
  const _userId   = String(user?._id || user?.id || '');
  const _dealerId = String(car?.dealer?._id || car?.dealer || '');
  const isOwner   = !!(_userId && _dealerId && _userId === _dealerId);
  const canManage = isOwner || isAdmin;
  const isLive  = car?.auctionStatus === 'live';
  const dealer  = car?.dealer;
  const dv      = dealer?.visibility || { showPhone: true, showEmail: true, showLocation: true, chatEnabled: true };

  const handleFav = async () => {
    if (!isAuth) { navigate(`/register?redirect=/cars/${id}`); return; }
    try { await carsAPI.toggleFav(id); setIsFav(p => !p); toast(isFav ? 'Removed from saved' : 'Saved!', 'success'); }
    catch { toast('Failed', 'error'); }
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
      toast(next ? '⭐ Car featured on homepage' : 'Removed from featured', 'success');
    } catch { toast('Failed', 'error'); }
    finally { setPromoting(false); }
  };

  if (loading) return (
    <div style={{ height: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(212,168,67,0.2)', borderTopColor: 'var(--gold)', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!car) return (
    <div style={{ height: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '4rem', fontStyle: 'italic', fontWeight: 900, color: 'var(--gold)' }}>Not Found</div>
      <p style={{ color: 'rgba(255,255,255,0.3)', marginTop: 12, marginBottom: 28, fontSize: 14 }}>This vehicle has been removed or sold.</p>
      <Link to="/showroom" style={{ padding: '12px 28px', background: 'var(--gold)', color: '#000', borderRadius: 9999, fontWeight: 900, fontSize: 11, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Back to Gallery</Link>
    </div>
  );

  const price = car.currentBid || car.price || 0;
  const priceStr = price >= 1e6 ? `${(price/1e6).toFixed(2)}M` : `${(price/1000).toFixed(0)}K`;

  return (
    <div style={{ background: '#050505', minHeight: '100vh', paddingBottom: 80 }}>

      {/* ── BREADCRUMB ── */}
      <div className="detail-breadcrumb" style={{ maxWidth: 1320, margin: '0 auto', padding: '20px 28px 0' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 500, padding: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
        >
          <ArrowLeft size={14} /> Back to Gallery
        </button>
      </div>

      <div className="detail-grid" style={{ maxWidth: 1320, margin: '0 auto', padding: '20px 28px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28, alignItems: 'start' }}>

        {/* ═══════════════ LEFT COLUMN ═══════════════ */}
        <div>
          {/* MAIN IMAGE */}
          <GalleryImage car={car} idx={imgIdx} onPrev={prevImg} onNext={nextImg} total={total} />

          {/* THUMBNAILS */}
          {total > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {images.map((img, i) => {
                const src = typeof img === 'string' ? img : img?.url;
                const isActive = i === imgIdx;
                const isCover  = i === (car.coverImage ?? 0);
                return (
                  <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                    <div onClick={() => setImgIdx(i)} style={{
                      width: 88, height: 60, borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                      border: `2px solid ${isActive ? 'var(--gold)' : 'transparent'}`,
                      opacity: isActive ? 1 : 0.55, transition: 'all 0.15s', background: '#111',
                    }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.opacity = '0.85'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.opacity = '0.55'; }}
                    >
                      {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    {/* Cover pin button for owner/admin */}
                    {canManage && (
                      <button onClick={() => handleSetCover(i)} title="Set as cover image"
                        style={{
                          position: 'absolute', top: 3, right: 3,
                          width: 18, height: 18, borderRadius: 4,
                          background: isCover ? 'var(--gold)' : 'rgba(0,0,0,0.65)',
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        <Pin size={9} style={{ color: isCover ? '#000' : 'rgba(255,255,255,0.7)' }} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* OWNER CONTROLS — feature on front page */}
          {canManage && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14, padding: '14px 16px', background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Homepage Feature</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  {car.isPromoted ? '⭐ This car is currently featured on the homepage' : 'Pin this car to the homepage gallery for maximum visibility'}
                </div>
              </div>
              <button onClick={handleTogglePromote} disabled={promoting} style={{
                padding: '9px 18px', borderRadius: 9, cursor: promoting ? 'wait' : 'pointer',
                background: car.isPromoted ? 'rgba(239,68,68,0.1)' : 'rgba(212,168,67,0.12)',
                border: `1px solid ${car.isPromoted ? 'rgba(239,68,68,0.2)' : 'rgba(212,168,67,0.25)'}`,
                color: car.isPromoted ? '#ef4444' : 'var(--gold)',
                fontSize: 12, fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {car.isPromoted ? <><TrendingUp size={13} /> Unfeature</> : <><Star size={13} /> Feature</>}
              </button>
              <Link to={`/dealer/edit/${car._id}`} style={{
                padding: '9px 18px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)',
                fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0,
              }}>✏ Edit</Link>
            </div>
          )}

          {/* ── TITLE (mobile-style, large) ── */}
          <div style={{ marginTop: 28, marginBottom: 24 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.6rem,3vw,2.2rem)', color: '#fff', margin: '0 0 10px', lineHeight: 1.05 }}>
              {car.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              {car.location?.city && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                  <MapPin size={12} style={{ color: 'rgba(212,168,67,0.6)' }} />{car.location.city}
                </span>
              )}
              {car.year && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                  <Calendar size={12} style={{ color: 'rgba(212,168,67,0.6)' }} />{car.year}
                </span>
              )}
              {car.mileage && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                  <Gauge size={12} style={{ color: 'rgba(212,168,67,0.6)' }} />{(car.mileage/1000).toFixed(0)}k km
                </span>
              )}
            </div>
          </div>

          {/* ── SPECS GRID ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>
              Full Specifications
            </div>
            <div className="spec-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <SpecItem icon={Settings2} label="Brand"         value={car.brand} />
              <SpecItem icon={Settings2} label="Model"         value={car.model} />
              <SpecItem icon={Calendar}  label="Year"          value={car.year} />
              <SpecItem icon={Fuel}      label="Fuel"          value={car.fuel} />
              <SpecItem icon={Settings2} label="Transmission"  value={car.transmission} />
              <SpecItem icon={Settings2} label="Body"          value={car.bodyType} />
              <SpecItem icon={Gauge}     label="Mileage"       value={car.mileage ? `${Number(car.mileage).toLocaleString()} km` : null} />
              <SpecItem icon={Settings2} label="Colour"        value={car.color} />
              <SpecItem icon={Settings2} label="Condition"     value={car.condition} />
              <SpecItem icon={Settings2} label="Engine"        value={car.engine} />
              <SpecItem icon={Settings2} label="Drivetrain"    value={car.drivetrain} />
              <SpecItem icon={MapPin}    label="Location"      value={car.location?.city} />
            </div>
          </div>

          {/* ── DESCRIPTION ── */}
          {car.description && (
            <div style={{
              marginBottom: 28,
              background: 'linear-gradient(135deg, #0C0C0C 0%, #0A0A0A 100%)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '28px 28px',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Gold left accent bar */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                background: 'linear-gradient(180deg, var(--gold) 0%, rgba(212,168,67,0.2) 100%)',
                borderRadius: '14px 0 0 14px',
              }} />
              <div style={{
                position: 'absolute', top: 0, right: 0, width: 200, height: 200,
                background: 'radial-gradient(circle at 100% 0%, rgba(212,168,67,0.04) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
              <div style={{
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
                color: 'var(--gold)', marginBottom: 14, position: 'relative', zIndex: 1,
              }}>
                About This Vehicle
              </div>
              <p style={{
                color: 'rgba(255,255,255,0.75)', fontSize: 17, lineHeight: 1.9,
                whiteSpace: 'pre-wrap', margin: 0, position: 'relative', zIndex: 1,
              }}>
                {car.description}
              </p>
            </div>
          )}

          {/* ── FEATURES ── */}
          {car.features?.length > 0 && (
            <div style={{ marginBottom: 28, background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(212,168,67,0.6)', marginBottom: 14 }}>
                Features & Equipment
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {car.features.map((f, i) => (
                  <span key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.14)',
                    borderRadius: 8, padding: '6px 13px', fontSize: 12, color: 'rgba(255,255,255,0.75)',
                    fontWeight: 500,
                  }}>
                    <span style={{ color: 'var(--gold)', fontSize: 10 }}>✓</span> {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── DEALER PROFILE ── */}
          {dealer && (
            <div style={{ marginBottom: 28, background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
                About The Seller
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg, var(--gold), var(--gold-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#000', fontFamily: 'var(--font-display)', flexShrink: 0 }}>
                  {(dealer.name || 'D')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{dealer.name || 'Seller'}</div>
                  {dealer.businessName && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>{dealer.businessName}</div>}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                    {dealer.dealerRating && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>
                        <Star size={12} fill="currentColor" /> {dealer.dealerRating}/5
                      </span>
                    )}
                    {dealer.trustScore && (
                      <span style={{ fontSize: 12, color: dealer.trustScore >= 80 ? '#22c55e' : '#eab308', fontWeight: 700 }}>
                        {dealer.trustScore}% Trust
                      </span>
                    )}
                    {dealer.totalTransactions > 0 && (
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                        {dealer.totalTransactions} sales
                      </span>
                    )}
                  </div>

                  {dealer.trustScore && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${dealer.trustScore}%`, height: '100%', borderRadius: 2, background: dealer.trustScore >= 80 ? '#22c55e' : '#eab308', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dealer.location && dv.showLocation && (
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={12} style={{ color: 'rgba(212,168,67,0.5)', flexShrink: 0 }} />{dealer.location}
                      </span>
                    )}
                    {dealer.phone && dv.showPhone && (
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12 }}>📞</span>{dealer.phone}
                      </span>
                    )}
                    {dealer.email && dv.showEmail && (
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12 }}>✉️</span>{dealer.email}
                      </span>
                    )}
                  </div>

                  {dealer.escrowMandatory && (
                    <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 8, padding: '5px 12px' }}>
                      <Lock size={11} style={{ color: '#22c55e' }} />
                      <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>Escrow Protected Seller</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── REVIEWS ── */}
          <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 24px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
              Dealer Reviews {reviews.length > 0 && `(${reviews.length})`}
            </div>
            {reviews.length === 0 ? (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginBottom: 20 }}>No reviews yet. Be the first to review this dealer.</div>
            ) : reviews.slice(0, 4).map(r => (
              <div key={r._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{r.reviewer?.name || 'Anonymous'}</span>
                  <span style={{ color: 'var(--gold)', fontSize: 13, letterSpacing: 2 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{r.comment}</p>
              </div>
            ))}

            {isAuth && !isOwner && (
              <form onSubmit={handleReview} style={{ paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 8 }}>Rating</label>
                  <select value={reviewForm.rating} onChange={e => setReviewForm(p => ({ ...p, rating: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '10px 13px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none' }}>
                    {[5,4,3,2,1].map(n => <option key={n} value={n} style={{ background: '#111' }}>{'★'.repeat(n)} — {n} star{n !== 1 ? 's' : ''}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 8 }}>Comment</label>
                  <textarea rows={3} placeholder="Share your experience with this dealer…" value={reviewForm.comment}
                    onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                    style={{ width: '100%', padding: '10px 13px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <button type="submit" disabled={submittingReview || !reviewForm.comment} style={{
                  padding: '10px 24px', background: reviewForm.comment ? 'var(--gold)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 9,
                  color: reviewForm.comment ? '#000' : 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 900, cursor: reviewForm.comment ? 'pointer' : 'default',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {submittingReview ? 'Submitting…' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ═══════════════ RIGHT COLUMN (sticky sidebar) ═══════════════ */}
        <div className="detail-sidebar" style={{ position: 'sticky', top: 108 }}>

          {/* PRICE CARD */}
          <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden', marginBottom: 12 }}>

            {/* top gold accent line */}
            <div style={{ height: 3, background: 'linear-gradient(90deg, var(--gold-muted), var(--gold), var(--gold-muted))' }} />

            <div style={{ padding: '22px 24px' }}>
              {/* badges */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {car.isVerifiedDealer && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, padding: '3px 9px', fontSize: 10, color: '#3b82f6', fontWeight: 700 }}>
                    <ShieldCheck size={10} /> Verified
                  </span>
                )}
                {car.isPromoted && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 6, padding: '3px 9px', fontSize: 10, color: 'var(--gold)', fontWeight: 700 }}>
                    <Star size={10} /> Featured
                  </span>
                )}
                {isLive && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '3px 9px', fontSize: 10, color: '#ef4444', fontWeight: 700 }}>
                    <Zap size={10} /> Live Auction
                  </span>
                )}
              </div>

              {/* title */}
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 6px', lineHeight: 1.3 }}>{car.title}</h2>
              {car.location?.city && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 18 }}>
                  <MapPin size={11} style={{ color: 'rgba(212,168,67,0.5)' }} />{car.location.city}
                </div>
              )}

              {/* PRICE */}
              <div style={{ background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.12)', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>
                  {isLive && car.currentBid > 0 ? 'Current Bid' : 'Asking Price'}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '2.1rem', color: 'var(--gold)', lineHeight: 1, marginBottom: 4 }}>
                  KES {priceStr}
                </div>
                {isLive && car.currentBid > 0 && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Starting: KES {(car.price / 1000).toFixed(0)}K</div>
                )}
                {car.bidsCount > 0 && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{car.bidsCount} bid{car.bidsCount !== 1 ? 's' : ''} placed</div>
                )}
              </div>

              {/* stats row */}
              <div className="detail-stats-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                {[
                  { icon: '👁', val: car.views || 0, label: 'Views' },
                  { icon: '❤️', val: car.favoritesCount || 0, label: 'Saved' },
                  { icon: '⚡', val: car.bidsCount || 0, label: 'Bids' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#111', borderRadius: 9, padding: '10px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: 15, marginBottom: 3 }}>{s.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              {isOwner ? (
                <Link to={`/dealer/edit/${car._id}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '13px', borderRadius: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  ✏ Edit Your Listing
                </Link>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {isLive ? (
                    <Link to={`/auction/${car._id}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, padding: '14px', borderRadius: 11, background: 'var(--gold)', color: '#000', fontSize: 13, fontWeight: 900, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.07em', boxShadow: '0 6px 24px rgba(212,168,67,0.25)' }}>
                      <Zap size={15} /> Join Live Auction
                    </Link>
                  ) : (
                    <>
                      {car.allowBuy && (
                        <button onClick={() => setShowPayModal(true)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, padding: '14px', borderRadius: 11, background: 'var(--gold)', border: 'none', color: '#000', fontSize: 13, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.07em', boxShadow: '0 6px 24px rgba(212,168,67,0.22)', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(212,168,67,0.35)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(212,168,67,0.22)'; }}
                        >
                          <Lock size={14} /> Buy via Escrow
                        </button>
                      )}
                      {car.allowBid && (
                        <button onClick={() => navigate(`/auction/${car._id}`)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, padding: '13px', borderRadius: 11, background: 'transparent', border: '1px solid rgba(212,168,67,0.3)', color: 'var(--gold)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,168,67,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Zap size={14} /> Place a Bid
                        </button>
                      )}
                    </>
                  )}

                  {dv.chatEnabled && !car.chatDisabled && (
                    <button onClick={handleChat} disabled={startingChat} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, padding: '13px', borderRadius: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 600, cursor: startingChat ? 'wait' : 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                    >
                      <MessageCircle size={14} /> {startingChat ? 'Opening…' : 'Message Dealer'}
                    </button>
                  )}

                  <button onClick={handleFav} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '10px', borderRadius: 11, background: isFav ? 'rgba(239,68,68,0.08)' : 'transparent', border: `1px solid ${isFav ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`, color: isFav ? '#ef4444' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Heart size={13} fill={isFav ? 'currentColor' : 'none'} /> {isFav ? 'Saved to Wishlist' : 'Save Car'}
                  </button>
                </div>
              )}

              {/* Trust note — escrow only for non-dealers */}
              {dealer?.role === 'dealer' ? (
                <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <ShieldCheck size={12} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
                      <strong style={{ color: '#3b82f6' }}>Verified Dealer.</strong> This vehicle is listed by a KRA-vetted, Kayad-approved dealer. Direct purchase — no escrow required.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Lock size={12} style={{ color: '#22c55e', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
                      <strong style={{ color: '#22c55e' }}>Escrow Protected.</strong> Payment held securely until you confirm receipt. Protects you when buying from independent sellers.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compare */}
          <CompareToggle car={car} />

          {/* Inspection */}
          <InspectionButton carId={car._id} location={car.location?.city || dealer?.location} />

          {/* TCO Calculator */}
          <TcoCalculator vehicle={car} />

          {/* Market Valuation */}
          <MarketValuationMatrix
            carId={car._id}
            carPrice={car.price || car.currentBid}
            carBrand={car.brand}
            carModel={car.model}
            carYear={car.year}
          />

          {/* DEALER MINI CARD */}
          {dealer && (
            <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.25)', marginBottom: 12 }}>Listed By</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--gold), var(--gold-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 900, color: '#000', flexShrink: 0 }}>
                  {(dealer.name || 'D')[0]}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{dealer.name || 'Dealer'}</div>
                  {dealer.dealerRating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gold)', marginTop: 2 }}>
                      <Star size={11} fill="currentColor" /> {dealer.dealerRating}/5
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPayModal && (
        <PaymentModal
          amount={car.price}
          carId={car._id}
          type="escrow"
          title={`Buy: ${car.title}`}
          onClose={() => setShowPayModal(false)}
          onSuccess={() => toast('Escrow funded! Seller has been notified.', 'success')}
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
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '10px', marginBottom: 12,
        borderRadius: 10, background: isComp ? 'rgba(212,168,67,0.08)' : 'transparent',
        border: `1px solid ${isComp ? 'rgba(212,168,67,0.25)' : 'rgba(255,255,255,0.07)'}`,
        color: isComp ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
        fontSize: 11, fontWeight: 700, cursor: !isComp && full ? 'not-allowed' : 'pointer',
        opacity: !isComp && full ? 0.4 : 1, transition: 'all 0.2s',
      }}>
      {isComp ? '✓ Added to Compare' : full ? 'Compare full (max 4)' : '+ Add to Compare'}
    </button>
  );
}
