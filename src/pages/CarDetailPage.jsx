// src/pages/CarDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { carsAPI, reviewsAPI, chatAPI, formatKES } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PaymentModal from '../components/PaymentModal';

export default function CarDetailPage() {
  const { id } = useParams();
  const { user, isAuth } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [car, setCar]           = useState(null);
  const [insights, setInsights] = useState(null);
  const [reviews, setReviews]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [imgIdx, setImgIdx]     = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [isFav, setIsFav]       = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      carsAPI.get(id),
      carsAPI.insights(id).catch(() => null),
      car?.dealer?._id ? reviewsAPI.forDealer(car.dealer._id).catch(() => ({ reviews: [] })) : Promise.resolve({ reviews: [] }),
    ]).then(([carData, ins]) => {
      const c = carData.car || carData.data || carData;
      setCar(c);
      setInsights(ins?.data || null);
      // Track click
      carsAPI.trackClick(id).catch(() => {});
      if (c?.dealer?._id) {
        reviewsAPI.forDealer(c.dealer._id).then(d => setReviews(d.reviews || [])).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const handleBuy = () => {
    if (!isAuth) { navigate('/login'); return; }
    setShowPayModal(true);
  };

  const handleFav = async () => {
    if (!isAuth) { navigate('/login'); return; }
    try {
      await carsAPI.toggleFav(id);
      setIsFav(!isFav);
      toast(isFav ? 'Removed from favourites' : '❤️ Added to favourites', 'success');
    } catch { toast('Failed', 'error'); }
  };

  const handleChat = async () => {
    if (!isAuth) { navigate('/login'); return; }
    setStartingChat(true);
    try {
      const data = await chatAPI.start({ carId: id, participantId: car.dealer?._id });
      navigate(`/chat/${data.chat?._id || data._id}`);
    } catch { toast('Could not start chat', 'error'); }
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
      if (car?.dealer?._id) {
        reviewsAPI.forDealer(car.dealer._id).then(d => setReviews(d.reviews || [])).catch(() => {});
      }
    } catch { toast('Failed to submit review', 'error'); }
    finally { setSubmittingReview(false); }
  };

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;
  if (!car) return <div className="page loading-center"><h3>Car not found</h3></div>;

  const images = car.images || [];
  const isOwner = user?.id === car.dealer?._id?.toString() || user?.id === car.dealer?.toString();
  const isLive  = car.auctionStatus === 'live';

  const DEAL_INFO = {
    great:      { color: 'var(--green)',  label: '🔥 Great Deal — Below Market' },
    good:       { color: 'var(--blue)',   label: '👍 Good Price' },
    fair:       { color: 'var(--gold)',   label: '✓ Fair Market Price' },
    overpriced: { color: 'var(--red)',    label: '⚠ Above Market Price' },
  };
  const dealInfo = car.dealRating ? DEAL_INFO[car.dealRating] : null;

  return (
    <div className="page">
      <div className="container" style={{ padding: '32px 24px' }}>

        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          <Link to="/">Home</Link> · <Link to="/cars">Cars</Link> · {car.title}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32 }}>

          {/* ─── LEFT ─── */}
          <div>
            {/* Image Gallery */}
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ aspectRatio: '16/9', background: 'var(--surface)', position: 'relative' }}>
                {images.length > 0 ? (
                  <img
                    src={images[imgIdx]?.url || images[imgIdx]}
                    alt={car.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72, color: 'var(--text-dim)' }}>🚗</div>
                )}
                {/* Auction badge */}
                {isLive && (
                  <div style={{ position: 'absolute', top: 16, left: 16 }}>
                    <span className="badge badge-green" style={{ fontSize: 12 }}>
                      <span className="live-dot" /> LIVE AUCTION
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: 8, padding: '12px 0', overflowX: 'auto' }}>
                  {images.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setImgIdx(i)}
                      style={{
                        width: 72, height: 52, flexShrink: 0, borderRadius: 6,
                        overflow: 'hidden', cursor: 'pointer',
                        border: `2px solid ${i === imgIdx ? 'var(--gold)' : 'var(--border)'}`,
                      }}
                    >
                      <img src={img?.url || img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Specs */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ marginBottom: 20 }}>Specifications</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  { label: 'Brand', val: car.brand },
                  { label: 'Model', val: car.model },
                  { label: 'Year', val: car.year },
                  { label: 'Fuel', val: car.fuel },
                  { label: 'Transmission', val: car.transmission },
                  { label: 'Body Type', val: car.bodyType },
                  { label: 'Mileage', val: car.mileage ? `${Number(car.mileage).toLocaleString()} km` : null },
                  { label: 'Location', val: car.location?.city },
                  { label: 'Dealer Phone', val: car.dealerPhone },
                ].filter(s => s.val).map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    <div style={{ fontWeight: 600, marginTop: 4 }}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Insights */}
            {insights && (
              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{ marginBottom: 16 }}>💡 Price Intelligence</h3>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Avg Market Price</div>
                    <div className="price-tag">{formatKES(insights.avgMarketPrice)}</div>
                  </div>
                  {dealInfo && (
                    <div style={{ background: 'var(--surface)', border: `1px solid ${dealInfo.color}30`, borderRadius: 8, padding: '8px 14px' }}>
                      <span style={{ color: dealInfo.color, fontWeight: 600, fontSize: 13 }}>{dealInfo.label}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 20 }}>⭐ Dealer Reviews</h3>
              {reviews.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>No reviews yet. Be the first!</div>
              ) : reviews.slice(0, 4).map(r => (
                <div key={r._id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 14 }}>{r.reviewer?.name || 'Anonymous'}</strong>
                    <span style={{ color: 'var(--gold-light)' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{r.comment}</p>
                </div>
              ))}

              {isAuth && !isOwner && (
                <form onSubmit={handleReview}>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                    <div className="input-group" style={{ marginBottom: 12 }}>
                      <label className="input-label">Rating</label>
                      <select className="input" value={reviewForm.rating} onChange={e => setReviewForm(p => ({ ...p, rating: Number(e.target.value) }))}>
                        {[5,4,3,2,1].map(n => <option key={n} value={n}>{'★'.repeat(n)} {n}/5</option>)}
                      </select>
                    </div>
                    <div className="input-group" style={{ marginBottom: 12 }}>
                      <label className="input-label">Comment</label>
                      <textarea className="input" rows={3} placeholder="Your experience with this dealer..."
                        value={reviewForm.comment} onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))} />
                    </div>
                    <button className="btn btn-gold btn-sm" type="submit" disabled={submittingReview || !reviewForm.comment}>
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* ─── RIGHT PANEL ─── */}
          <div>
            <div style={{ position: 'sticky', top: 88 }}>
              <div className="card" style={{ padding: 24 }}>
                {/* Title & Badges */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    {car.isVerifiedDealer && <span className="badge badge-blue">✓ Verified Dealer</span>}
                    {car.isPromoted && <span className="badge badge-gold">★ Featured</span>}
                    {isLive && <span className="badge badge-green"><span className="live-dot" /> Live Auction</span>}
                  </div>
                  <h2 style={{ lineHeight: 1.2, marginBottom: 6 }}>{car.title}</h2>
                  {car.location?.city && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>📍 {car.location.city}</div>
                  )}
                </div>

                {/* Price */}
                <div style={{
                  background: 'var(--gold-glow)', border: '1px solid rgba(200,150,42,0.15)',
                  borderRadius: 'var(--radius)', padding: '16px', marginBottom: 20,
                }}>
                  {isLive && car.currentBid > 0 ? (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Bid</div>
                      <div className="price-tag" style={{ fontSize: '1.8rem' }}>{formatKES(car.currentBid)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Starting: {formatKES(car.price)}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Asking Price</div>
                      <div className="price-tag" style={{ fontSize: '1.8rem' }}>{formatKES(car.price)}</div>
                    </>
                  )}
                  {car.bidsCount > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {car.bidsCount} bid{car.bidsCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { icon: '👁', val: car.views || 0, label: 'Views' },
                    { icon: '❤️', val: car.favoritesCount || 0, label: 'Saved' },
                    { icon: '🏷', val: car.bidsCount || 0, label: 'Bids' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18 }}>{s.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                {isOwner ? (
                  <Link to={`/dealer/edit/${car._id}`} className="btn btn-outline btn-full" style={{ display: 'flex', justifyContent: 'center' }}>
                    ✏ Edit Listing
                  </Link>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {isLive ? (
                      <Link to={`/auction/${car._id}`} className="btn btn-gold btn-full btn-lg" style={{ justifyContent: 'center' }}>
                        ⚡ Join Live Auction
                      </Link>
                    ) : car.allowBuy && (
                      <button className="btn btn-gold btn-full" onClick={handleBuy}>
                        💳 Buy via M-Pesa
                      </button>
                    )}

                    {car.allowBid && !isLive && (
                      <button className="btn btn-outline btn-full" onClick={() => navigate(`/auction/${car._id}`)}>
                        🏷 Place a Bid
                      </button>
                    )}

                    <button className="btn btn-outline btn-full" onClick={handleChat} disabled={startingChat}>
                      💬 {startingChat ? 'Opening chat...' : 'Message Dealer'}
                    </button>

                    <button
                      className={`btn btn-sm btn-full ${isFav ? 'btn-outline' : 'btn-ghost'}`}
                      onClick={handleFav}
                      style={{ color: isFav ? 'var(--red)' : 'var(--text-muted)' }}
                    >
                      {isFav ? '❤️ Saved' : '🤍 Save'}
                    </button>
                  </div>
                )}

                {/* Dealer Info */}
                {car.dealer && (
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                      Listed by
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#07090C', fontWeight: 700, fontSize: 16,
                      }}>
                        {(car.dealer?.name || 'D')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{car.dealer?.name || 'Dealer'}</div>
                        {car.dealer?.dealerRating && (
                          <div style={{ color: 'var(--gold)', fontSize: 12 }}>
                            {'★'.repeat(Math.round(car.dealer.dealerRating))} {car.dealer.dealerRating}/5
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Escrow Info Card */}
              <div className="card" style={{ padding: 16, marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  🔒 <strong>Escrow Protected.</strong> Final payment is held securely until you confirm receipt of the car. Your money is safe.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPayModal && (
        <PaymentModal
          amount={car.price}
          carId={car._id}
          type="buy"
          title={`Buy: ${car.title}`}
          onClose={() => setShowPayModal(false)}
          onSuccess={() => toast('Purchase initiated! Check your escrow.', 'success')}
        />
      )}
    </div>
  );
}
