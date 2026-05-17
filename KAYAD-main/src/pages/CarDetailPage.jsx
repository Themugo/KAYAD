import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { carsAPI, reviewsAPI, chatAPI, formatKES } from '../api/api';
import { getMockCar } from '../data/mockCars';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PaymentModal from '../components/PaymentModal';

export default function CarDetailPage() {
  const { id } = useParams();
  const { user, isAuth } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [car, setCar] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    carsAPI.get(id)
      .then(data => {
        let c = data?.car || data?.data || data;
        if (!c || !c._id) c = getMockCar(id);
        setCar(c);
        if (c) { setImgIdx(c.coverImage ?? 0); carsAPI.trackClick(id).catch(() => {}); }
        if (c?.dealer?._id) {
          reviewsAPI.forDealer(c.dealer._id).then(d => setReviews(d.reviews || [])).catch(() => {});
        }
      })
      .catch(() => { const m = getMockCar(id); setCar(m); if (m) setImgIdx(m.coverImage ?? 0); })
      .finally(() => setLoading(false));
  }, [id]);

  const redirectToRegister = () => navigate(`/register?redirect=/cars/${id}`);

  const handleEscrowBuy = () => {
    if (!isAuth) { redirectToRegister(); return; }
    setShowEscrowModal(true);
  };

  const handleFav = async () => {
    if (!isAuth) { redirectToRegister(); return; }
    try {
      await carsAPI.toggleFav(id);
      setIsFav(!isFav);
      toast(isFav ? 'Removed from favourites' : 'Added to favourites', 'success');
    } catch { toast('Failed', 'error'); }
  };

  const handleChat = async () => {
    if (!isAuth) { redirectToRegister(); return; }
    if (car.chatDisabled) { toast('Chat is disabled by this dealer', 'error'); return; }
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

  const prevImg = () => setImgIdx(i => (i > 0 ? i - 1 : (car?.images?.length || 1) - 1));
  const nextImg = () => setImgIdx(i => (i < (car?.images?.length || 1) - 1 ? i + 1 : 0));

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(212,175,55,0.3)]" />
    </div>
  );
  if (!car) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10 text-center">
      <h1 className="text-gold text-6xl font-black italic uppercase tracking-tighter">Unit Offline</h1>
      <p className="text-zinc-500 mt-4 font-bold uppercase text-[10px] tracking-[0.4em]">This asset has been finalized or removed from the vault.</p>
      <Link to="/showroom" className="mt-10 bg-white text-black px-10 py-4 rounded-full font-black uppercase text-xs hover:bg-gold hover:text-black transition-colors">
        Return to Gallery
      </Link>
    </div>
  );

  const images = car.images || [];
  const isOwner = user?.id === car.dealer?._id?.toString() || user?.id === car.dealer?.toString();
  const isLive  = car.auctionStatus === 'live';
  const dealer  = car.dealer;
  const dealerVisibility = dealer?.visibility || { showPhone: true, showEmail: true, showLocation: true, chatEnabled: true };

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 20, paddingBottom: 24 }}>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
          <Link to="/">Home</Link> · <Link to="/">Cars</Link> · {car.title}
        </div>

        <div className="grid-sidebar-right" style={{ gap: 24 }}>

          <div>
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

                {images.length > 1 && (
                  <>
                    <button onClick={prevImg} style={{
                      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '50%', width: 40, height: 40, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      color: 'white', fontSize: 18, backdropFilter: 'blur(4px)',
                    }}>‹</button>
                    <button onClick={nextImg} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '50%', width: 40, height: 40, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      color: 'white', fontSize: 18, backdropFilter: 'blur(4px)',
                    }}>›</button>
                  </>
                )}

                {isLive && (
                  <div style={{ position: 'absolute', top: 16, left: 16 }}>
                    <span className="badge badge-green" style={{ fontSize: 12 }}>
                      <span className="live-dot" /> LIVE AUCTION
                    </span>
                  </div>
                )}

                <div style={{
                  position: 'absolute', bottom: 12, right: 12,
                  background: 'rgba(10,22,40,0.8)', backdropFilter: 'blur(4px)',
                  borderRadius: 6, padding: '4px 10px', fontSize: 11, color: 'white',
                }}>
                  {imgIdx + 1} / {images.length}
                </div>
              </div>

              {images.length > 1 && (
                <div style={{ display: 'flex', gap: 8, padding: '12px 0', overflowX: 'auto' }}>
                  {images.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setImgIdx(i)}
                      style={{
                        width: 80, height: 56, flexShrink: 0, borderRadius: 6,
                        overflow: 'hidden', cursor: 'pointer', opacity: i === imgIdx ? 1 : 0.5,
                        border: `2px solid ${i === imgIdx ? 'var(--gold)' : 'transparent'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <img src={img?.url || img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 18, marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, marginBottom: 14 }}>Full Specifications</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Brand', val: car.brand },
                  { label: 'Model', val: car.model },
                  { label: 'Year', val: car.year },
                  { label: 'Fuel Type', val: car.fuel },
                  { label: 'Transmission', val: car.transmission },
                  { label: 'Body Type', val: car.bodyType },
                  { label: 'Mileage', val: car.mileage ? `${Number(car.mileage).toLocaleString()} km` : null },
                  { label: 'Color', val: car.color },
                  { label: 'Engine', val: car.engine },
                  { label: 'Drivetrain', val: car.drivetrain },
                  { label: 'Location', val: car.location?.city },
                  { label: 'Condition', val: car.condition },
                ].filter(s => s.val).map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>{s.label}</div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {car.description && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Description</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{car.description}</p>
                </div>
              )}
            </div>

            {car.features?.length > 0 && (
              <div className="card" style={{ padding: 18, marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, marginBottom: 12 }}>Features & Options</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {car.features.map((f, i) => (
                    <span key={i} style={{
                      background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.12)',
                      borderRadius: 100, padding: '4px 12px', fontSize: 11, color: 'var(--gold-light)',
                    }}>✓ {f}</span>
                  ))}
                </div>
              </div>
            )}

            {dealer && (
              <div className="card" style={{ padding: 18, marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, marginBottom: 12 }}>About the Seller</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: dealer.tier === 'enterprise' ? 'linear-gradient(135deg, var(--gold), #fff)' : 'var(--gold)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#0A1628', fontWeight: 700, fontSize: 16, flexShrink: 0,
                  }}>
                    {(dealer.name || 'D')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{dealer.name || 'Seller'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {dealer.dealerRating && (
                        <div style={{ color: 'var(--gold)', fontSize: 12 }}>
                          {'★'.repeat(Math.round(dealer.dealerRating))} {dealer.dealerRating}/5
                        </div>
                      )}
                      {dealer.trustScore && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: dealer.trustScore >= 80 ? '#22c55e' : dealer.trustScore >= 60 ? '#eab308' : '#ef4444' }}>
                          {dealer.trustScore}% Trust
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification badges */}
                {dealer.verifications?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                    {dealer.verifications.map(v => ({
                      email: { icon: '✉️', label: 'Email Verified' },
                      phone: { icon: '📱', label: 'Phone Verified' },
                      id: { icon: '🆔', label: 'ID Verified' },
                      business: { icon: '🏢', label: 'Business Verified' },
                      ntsa: { icon: '📋', label: 'NTSA Verified' },
                      physical: { icon: '📍', label: 'Physical Address' },
                    })[v] && (
                      <span key={v} style={{
                        background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)',
                        borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 600, color: '#60a5fa',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        {({ email: '✉️', phone: '📱', id: '🆔', business: '🏢', ntsa: '📋', physical: '📍' })[v]} Verified
                      </span>
                    ))}
                  </div>
                )}

                {/* Enterprise badge */}
                {dealer.tier === 'enterprise' && (
                  <div style={{ background: 'rgba(212,168,55,0.08)', border: '1px solid rgba(212,168,55,0.2)', borderRadius: 6, padding: '8px 12px', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)' }}>◆ Enterprise Seller</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>Institution-grade verified dealer</div>
                  </div>
                )}

                {/* Mandatory escrow notice for brokers */}
                {dealer.escrowMandatory && (
                  <div style={{ background: 'rgba(212,168,55,0.06)', border: '1px solid rgba(212,168,55,0.12)', borderRadius: 6, padding: '8px 12px', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)' }}>🔒 Escrow Protected</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>This seller uses mandatory escrow — your payment is 100% protected</div>
                  </div>
                )}

                {/* Trust score bar */}
                {dealer.trustScore && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>
                      <span>Trust Score</span>
                      <span style={{ fontWeight: 700, color: dealer.trustScore >= 80 ? '#22c55e' : dealer.trustScore >= 60 ? '#eab308' : '#ef4444' }}>{dealer.trustScore}/100</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${dealer.trustScore}%`, height: '100%', borderRadius: 2, background: dealer.trustScore >= 80 ? '#22c55e' : dealer.trustScore >= 60 ? '#eab308' : '#ef4444' }} />
                    </div>
                  </div>
                )}

                {dealer.businessName && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>🏪 {dealer.businessName}</div>
                )}
                {dealer.location && dealerVisibility.showLocation && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>📍 {dealer.location}</div>
                )}
                {dealer.phone && dealerVisibility.showPhone && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>📞 {dealer.phone}</div>
                )}
                {dealer.email && dealerVisibility.showEmail && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>✉️ {dealer.email}</div>
                )}
                {!dealerVisibility.showLocation && !dealerVisibility.showPhone && !dealerVisibility.showEmail && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>Contact info hidden — use chat to reach them.</div>
                )}

                {dealer.memberSince && (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    Member since {dealer.memberSince} · {dealer.totalTransactions || 0} transactions
                  </div>
                )}
              </div>
            )}

            <div className="card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: 14, marginBottom: 14 }}>Dealer Reviews</h3>
              {reviews.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 14 }}>No reviews yet. Be the first!</div>
              ) : reviews.slice(0, 4).map(r => (
                <div key={r._id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 12 }}>{r.reviewer?.name || 'Anonymous'}</strong>
                    <span style={{ color: 'var(--gold-light)', fontSize: 12 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>{r.comment}</p>
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

          <div>
            <div style={{ position: 'sticky', top: 88 }}>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {car.isVerifiedDealer && <span className="badge badge-blue">✓ Verified Dealer</span>}
                    {car.isPromoted && <span className="badge badge-gold">★ Featured</span>}
                    {isLive && <span className="badge badge-green"><span className="live-dot" /> Live Auction</span>}
                  </div>
                  <h2 style={{ fontSize: 16, lineHeight: 1.2, marginBottom: 4 }}>{car.title}</h2>
                  {car.location?.city && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>📍 {car.location.city}</div>
                  )}
                </div>

                <div style={{
                  background: 'var(--gold-glow)', border: '1px solid rgba(212,168,67,0.15)',
                  borderRadius: 'var(--radius)', padding: '12px', marginBottom: 14,
                }}>
                  {isLive && car.currentBid > 0 ? (
                    <>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Bid</div>
                      <div className="price-tag" style={{ fontSize: '1.4rem' }}>{formatKES(car.currentBid)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Starting: {formatKES(car.price)}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Asking Price</div>
                      <div className="price-tag" style={{ fontSize: '1.4rem' }}>{formatKES(car.price)}</div>
                    </>
                  )}
                  {car.bidsCount > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {car.bidsCount} bid{car.bidsCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                <div className="grid-3" style={{ marginBottom: 14 }}>
                  {[
                    { icon: '👁', val: car.views || 0, label: 'Views' },
                    { icon: '❤️', val: car.favoritesCount || 0, label: 'Saved' },
                    { icon: '🏷', val: car.bidsCount || 0, label: 'Bids' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 15 }}>{s.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{s.val}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

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
                    ) : (
                      <>
                        {car.allowBuy && (
                          <button className="btn btn-gold btn-full" onClick={handleEscrowBuy}>
                            🔒 Buy via Escrow
                          </button>
                        )}
                        {car.allowBid && (
                          <button className="btn btn-outline btn-full" onClick={() => navigate(`/auction/${car._id}`)}>
                            🏷 Place a Bid
                          </button>
                        )}
                      </>
                    )}

                    {!car.chatDisabled && dealerVisibility.chatEnabled && (
                      <button className="btn btn-outline btn-full" onClick={handleChat} disabled={startingChat}>
                        💬 {startingChat ? 'Opening chat...' : 'Message Dealer'}
                      </button>
                    )}

                    <button
                      className={`btn btn-sm btn-full ${isFav ? 'btn-outline' : 'btn-ghost'}`}
                      onClick={handleFav}
                      style={{ color: isFav ? 'var(--red)' : 'var(--text-muted)' }}
                    >
                      {isFav ? '❤️ Saved' : '🤍 Save'}
                    </button>
                  </div>
                )}

                {dealer && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Listed by
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#0A1628', fontWeight: 700, fontSize: 14,
                      }}>
                        {(dealer.name || 'D')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{dealer.name || 'Dealer'}</div>
                        {dealer.dealerRating && (
                          <div style={{ color: 'var(--gold)', fontSize: 11 }}>
                            {'★'.repeat(Math.round(dealer.dealerRating))} {dealer.dealerRating}/5
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: 12, marginTop: 10, border: '1px solid rgba(212,168,55,0.2)', background: 'rgba(212,168,55,0.04)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  🔒 <strong>Escrow Protected.</strong> Your full payment is held securely in escrow until you confirm receipt of the car. No money goes directly to the seller until you approve.
                  {dealer?.escrowMandatory && (
                    <div style={{ marginTop: 6, padding: '6px 8px', background: 'rgba(212,168,55,0.06)', borderRadius: 4, fontSize: 10, color: 'var(--gold)' }}>
                      ⚠️ <strong>Mandatory escrow.</strong> This seller is an individual — all payments must go through escrow for your protection.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEscrowModal && (
        <PaymentModal
          amount={car.price}
          carId={car._id}
          type="escrow"
          title={`Buy: ${car.title}`}
          onClose={() => setShowEscrowModal(false)}
          onSuccess={() => toast('Escrow funded! The seller will be notified.', 'success')}
        />
      )}
    </div>
  );
}
