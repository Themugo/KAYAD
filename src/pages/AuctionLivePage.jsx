import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { carsAPI, bidsAPI, auctionRegistrationAPI, formatKES } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { CountdownDisplay } from '../hooks/useCountdown';
import { AuctionExperienceRail } from '../components/auction/AuctionExperienceRail';
import { AuctionCinematicGallery, AuctionActivityPulse, AuctionBidConfirmation, AuctionWinningCelebration, AuctionMobileActionBar } from '../components/auction/AuctionWowExperience';

export default function AuctionLivePage() {
  const { id } = useParams();
  const { user, isAuth } = useAuth();
  const { joinAuction, leaveChannel, connected } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [car, setCar]             = useState(null);
  const [bids, setBids]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [phone, setPhone]         = useState('');
  const [placing, setPlacing]     = useState(false);
  const [registration, setRegistration] = useState(null);
  const [registrationSetup, setRegistrationSetup] = useState(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [bidCount, setBidCount]   = useState(0);
  const [bidConfirmation, setBidConfirmation] = useState(false);
  const [lastBidder, setLastBidder] = useState('');
  const bidListRef = useRef(null);

  // Load car + bid history
  useEffect(() => {
    Promise.all([
      carsAPI.get(id),
      bidsAPI.getForCar(id).catch(() => ({ bids: [] })),
    ]).then(([carData, bidData]) => {
      const c = carData.car || carData.data || carData;
      setCar(c);
      setCurrentBid(c.currentBid || c.price || 0);
      setBidCount(c.bidsCount || 0);
      const bs = bidData.bids || bidData.data || [];
      setBids(bs.slice(0, 30));
      // Pre-fill min bid
      const minNext = (c.currentBid || c.price || 0) + 5000;
      setBidAmount(String(minNext));
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    auctionRegistrationAPI.room(id)
      .then((data) => setRoomState(data.room || null))
      .catch(() => setRoomState(null));
  }, [id, car?.auctionStatus]);

  useEffect(() => {
    if (!id || !isAuth) return;
    setRegistrationLoading(true);
    auctionRegistrationAPI.get(id)
      .then((data) => { setRegistration(data.registration || null); setRegistrationSetup(data.setup || null); })
      .catch(() => { setRegistration(null); setRegistrationSetup(null); })
      .finally(() => setRegistrationLoading(false));
  }, [id, isAuth]);

  const handleRegister = async () => {
    if (!isAuth) { navigate('/login'); return; }
    if (roomState?.biddingRoomClosed || roomState?.registrationOpen === false) {
      toast('Bidding room is closed. You can watch the live auction, but new bidders cannot join.', 'info');
      return;
    }
    const termsVersion = registrationSetup?.config?.termsVersion;
    try {
      setRegistrationLoading(true);
      const data = await auctionRegistrationAPI.register(id, { termsVersion, acceptTerms: true, idempotencyKey: `${id}:${user?.id}:registration` });
      setRegistration(data.registration);
      toast(data.registration?.status === 'active' ? 'Registration complete. You are cleared to bid.' : 'Registration started. Complete the required commitment to activate bidding.', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Unable to register for this auction', 'error');
    } finally { setRegistrationLoading(false); }
  };

  const handleCommitment = async () => {
    if (roomState?.biddingRoomClosed) {
      toast('Bidding room is closed. An incomplete registration cannot be activated after bidding starts.', 'info');
      return;
    }
    try {
      setRegistrationLoading(true);
      const data = await auctionRegistrationAPI.initiateCommitment(id);
      setRegistration(data.registration);
      toast('M-Pesa commitment initiated. Complete the payment on your phone; your bidder pass activates after provider confirmation.', 'info');
    } catch (err) {
      toast(err.response?.data?.message || 'Unable to initiate auction commitment', 'error');
    } finally { setRegistrationLoading(false); }
  };

  // Join auction room via Socket.IO
  useEffect(() => {
    if (!id) return;
    const channel = joinAuction(id, {
      onBid: (newBid) => {
        setCurrentBid(newBid.amount);
        setBidCount(prev => prev + 1);
        setBids(prev => [newBid, ...prev].slice(0, 30));
        setLastBidder(newBid?.user?.name || newBid?.bidder?.name || 'Another bidder');
        const minNext = newBid.amount + Number(roomState?.bidIncrement || 5000);
        setBidAmount(String(minNext));
        bidListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      },
      onCarUpdate: (updated) => {
        if (updated.auction_status === 'ended' || updated.auction_status === 'sold') {
          toast('Auction has ended!', 'info');
          setTimeout(() => navigate(`/cars/${id}`), 3000);
        }
      },
    });
    return () => { if (channel) leaveChannel(channel); };
  }, [id, connected, joinAuction, leaveChannel]);

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
      const data = await bidsAPI.place(id, { amount, phone: phone.replace(/\D/g, '') });
      setBidConfirmation(true);
      toast('Bid submitted. Complete the M-Pesa confirmation requested by KAYAD.', 'info');
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

  const bidIncrement = Number(registrationSetup?.config?.bidIncrement || roomState?.bidIncrement || 5000);
  const minBid = currentBid + bidIncrement;
  const isOwner = user?.id === car?.dealer?._id?.toString() || user?.id === car?.dealer?.toString();
  const auctionLive = car?.auctionStatus === 'live';
  const ended = !auctionLive && (car?.auctionStatus === 'ended' || car?.auctionStatus === 'sold');
  const topBid = bids[0] || null;
  const topBidderId = topBid?.userId || topBid?.bidderId || topBid?.user?.id || topBid?.bidder?._id;
  const userWon = ended && Boolean(user?.id && topBidderId && String(user.id) === String(topBidderId));

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;
  if (!car) return <div className="page loading-center"><h3>Auction not found</h3></div>;

  return (
    <div className="page auction-live-premium" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <AuctionExperienceRail current={ended ? 'win' : auctionLive ? 'live' : 'registration'} />
        {ended && userWon && <AuctionWinningCelebration title={car.title} amount={Number(topBid?.amount || currentBid || 0)} onSettle={() => navigate('/payments')} onHistory={() => navigate('/')} />}
        {ended && !userWon && <div className="auction-wow-win auction-wow-ended-neutral"><div className="auction-wow-trophy"><span>✓</span></div><div className="auction-wow-win-copy"><span className="auction-wow-overline">AUCTION CONCLUDED</span><h2>The room has closed.</h2><p>{car.title} has moved into its post-auction journey.</p></div></div>}

        {/* ─── Header ─── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 13 }}>← All Cars</Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {auctionLive ? (
              <span className="badge badge-green"><span className="live-dot" /> LIVE AUCTION</span>
            ) : (
              <span className="badge badge-muted">Auction Ended</span>
            )}
            <span className="auction-room-title" style={{ fontSize: 14, color: 'var(--text-muted)' }}>{car.title}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? 'var(--green)' : 'var(--red)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{connected ? 'Live' : 'Reconnecting...'}</span>
          </div>
        </div>

        <div className="grid-sidebar-right" style={{ gap: 28, gridTemplateColumns: '1fr 380px' }}>

          {/* ─── LEFT: Car + Bid History ─── */}
          <div>
            <AuctionCinematicGallery title={car.title} images={car.images} status={auctionLive ? 'live' : car.auctionStatus} inspected={car.inspectionStatus === 'passed' || car.inspectionStatus === 'completed'} />
            {auctionLive && <AuctionActivityPulse currentBid={currentBid} bidCount={bidCount} endsAt={car.auctionEnd} connected={connected} recentBidder={lastBidder} />}

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

            {/* Bid History */}
            <div className="card">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem' }}>Bid History</h3>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{bidCount} bids</span>
              </div>
              <div ref={bidListRef} style={{ maxHeight: 340, overflowY: 'auto', padding: '8px 0' }}>
                {bids.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                    No bids yet — be the first!
                  </div>
                ) : bids.map((bid, i) => (
                  <div key={bid._id || i} className="bid-row" style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: i === 0 ? 'var(--gold)' : 'var(--surface)',
                        border: `1px solid ${i === 0 ? 'var(--gold)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                        color: i === 0 ? '#0A3340' : 'var(--text-muted)',
                      }}>
                        {i === 0 ? '👑' : `#${bidCount - i}`}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {bid.user?.name || bid.phone?.slice(-4).replace(/./g, '*').slice(0, -3) + bid.phone?.slice(-3) || 'Bidder'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatTime(bid.createdAt)}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem', color: i === 0 ? 'var(--gold-light)' : 'var(--text)' }}>
                        {formatKES(bid.amount)}
                      </div>
                      {bid.mpesaPaid && (
                        <span style={{ fontSize: 10, color: 'var(--green)' }}>✓ M-Pesa confirmed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Bid Panel ─── */}
          <div>
            <div style={{ position: 'sticky', top: 88 }}>

              {/* Current Bid Display */}
              <div className="card" style={{ padding: 24, marginBottom: 16, border: '1px solid rgba(37, 99, 235,0.3)' }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    {bidCount > 0 ? 'Current Leading Bid' : 'Starting Price'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 700, color: 'var(--gold-light)', lineHeight: 1 }}>
                    {formatKES(currentBid || car.price)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                    {bidCount} bid{bidCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Countdown */}
                {car.auctionEnd && (
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Time Remaining</div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div className="auction-wow-countdown-frame"><CountdownDisplay endTime={car.auctionEnd} /></div>
                    </div>
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
                          color: bidAmount === String(amt) ? '#0A3340' : 'var(--text-muted)',
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
                    disabled={!auctionLive || registration?.status !== 'active'}
                    placeholder={`Min: ${minBid.toLocaleString()}`}
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                    min={minBid}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Minimum: {formatKES(minBid)}
                  </div>
                </div>

                {/* M-Pesa Phone */}
                <div className="input-group" style={{ marginBottom: 20 }}>
                  <label className="input-label">M-Pesa Number</label>
                  <div className="mpesa-wrap">
                    <span className="mpesa-prefix">🇰🇪</span>
                    <input
                      className="input"
                      disabled={!auctionLive || registration?.status !== 'active'}
                      placeholder="0712 345 678"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Used for the auction payment confirmation flow
                  </div>
                </div>

                {!registrationLoading && !registration?.id && !isOwner && !auctionLive ? null : null}
                {auctionLive && !isOwner && registration?.status !== 'active' ? (
                  <div className="card" style={{ padding: 16, background: 'var(--surface)', border: '1px solid rgba(234,179,8,0.35)' }}>
                    <strong style={{ display: 'block', marginBottom: 8 }}>👀 Bidding room closed — watching only</strong>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      This auction is already live. New bidders cannot join after bidding starts. You can watch the live bids, countdown and auction activity here.
                    </div>
                    {registration?.status === 'pending_commitment' && (
                      <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 11 }}>
                        Your registration was not activated before bidding started, so no new commitment can be initiated now.
                      </div>
                    )}
                  </div>
                ) : auctionLive && !isOwner && registration?.status === 'active' ? (
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
                ) : !auctionLive && car.auctionStatus !== 'ended' && car.auctionStatus !== 'sold' ? (
                  <div className="card" style={{ padding: 16, background: 'var(--surface)' }}>
                    <strong style={{ display: 'block', marginBottom: 8 }}>Registration before bidding</strong>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
                      Register before the auction starts. Once bidding begins, the room closes to new bidders and becomes watch-only for everyone who is not already active.
                    </div>
                    {!isAuth ? (
                      <button className="btn btn-gold btn-full" onClick={() => navigate('/login')}>Sign in to register</button>
                    ) : registration?.status === 'active' ? (
                      <div style={{ color: 'var(--green)', fontSize: 12 }}>✓ You are registered and cleared to bid when the auction opens.</div>
                    ) : !roomState?.registrationOpen ? (
                      <div style={{ color: 'var(--red)', fontSize: 12 }}>Registration is closed. You may watch when the auction goes live.</div>
                    ) : !registration ? (
                      <button className="btn btn-gold btn-full" onClick={handleRegister} disabled={registrationLoading}>Register for this auction</button>
                    ) : registration.status === 'pending_commitment' || registration.commitment_status === 'payment_pending' ? (
                      <button className="btn btn-gold btn-full" onClick={handleCommitment} disabled={registrationLoading || registration.commitment_status === 'payment_pending'}>
                        {registration.commitment_status === 'payment_pending' ? 'Awaiting M-Pesa confirmation…' : 'Pay bidder commitment'}
                      </button>
                    ) : (
                      <div style={{ color: 'var(--red)', fontSize: 12 }}>Registration is not currently eligible for bidding. Complete the required verification first.</div>
                    )}
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
                  <p>1. Register for the auction and satisfy any required bidder commitment. Then place your bid.</p>
                  <p>2. If you win, full payment goes into <strong>escrow</strong>.</p>
                  <p>3. Escrow releases when car is received & confirmed.</p>
                </div>
              </div>

              {/* Auction Organizer */}
              {car.dealer && (
                <div className="card" style={{ padding: 16, marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Auction Organizer</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A3340', fontWeight: 700 }}>
                      {(car.dealer?.name || 'A')[0].toUpperCase()}
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
            </div>
          </div>
        </div>
      </div>
      <AuctionBidConfirmation amount={Number(bidAmount || 0)} open={bidConfirmation} onClose={() => setBidConfirmation(false)} />
      <AuctionMobileActionBar
        live={auctionLive}
        canBid={Boolean(isAuth && !isOwner && registration?.status === 'active' && bidAmount && Number(bidAmount) >= minBid)}
        amount={bidAmount}
        onBid={handlePlaceBid}
        disabled={placing}
      />
    </div>
  );
}
