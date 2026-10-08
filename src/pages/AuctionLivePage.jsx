import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getIdFromPathPrefix } from '../utils/navigation';
import { auctionRegistrationAPI, formatKES } from '../api/api';
import { fetchAuction, fetchAuctionBids, fetchAuctionOutcome, initiateAuctionWinnerPayment } from '../services/auctionService';
import { placeBid, BidApiError } from '../services/bidApi';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { AuctionCinematicGallery, AuctionActivityPulse, AuctionBidConfirmation, AuctionWinningCelebration, AuctionMobileActionBar } from '../components/auction/AuctionWowExperience';
import { AuctionDisclaimerInline } from '../components/auction';
import { DomainPremiumHeader, DomainPremiumStats, DomainJourneyRail, DomainTrustStrip } from '../components/ui/DomainPremiumSurface';

export default function AuctionLivePage() {
  // STAGE 3 MARKETPLACE/VEHICLE/AUCTION CONVERGENCE FIX: this app has no
  // react-router <Routes>/<Route> tree (confirmed: src/main.tsx only wraps
  // the app in <BrowserRouter>; src/App.tsx::AuthRouteSurface renders this
  // page directly from a manual `path.startsWith('/auction/')` check, not a
  // <Route path="/auction/:id">). useParams() therefore always returned {},
  // so `id` was undefined on every real navigation and this page always
  // rendered "Auction not found" regardless of which auction was clicked.
  // Read the id the same way the rest of AuthRouteSurface's manual routing
  // already does (see its `vehiclePathMatch` convention) instead of relying
  // on router-provided params that this app's routing never populates.
  const location = useLocation();
  const id = useMemo(() => getIdFromPathPrefix(location.pathname, '/auction/'), [location.pathname]);
  const { user, isAuth } = useAuth();
  const { joinAuction, leaveChannel, connected } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [car, setCar]             = useState(null);
  const [bids, setBids]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [settling, setSettling] = useState(false);
  const [outcome, setOutcome] = useState(null);
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

  // Derived from `car` state. Declared here, ahead of every effect below that
  // reads them in a dependency array or callback body — referencing a `const`
  // before its declaration in the same function throws a temporal-dead-zone
  // ReferenceError on every render, which previously made this page crash
  // unconditionally (see AUCTION_360_AUDIT_REPORT).
  const auctionLive = car?.auctionStatus === 'live';
  const ended = !auctionLive && (car?.auctionStatus === 'ended' || car?.auctionStatus === 'sold');

  // Load car + bid history
  useEffect(() => {
    Promise.all([
      fetchAuction(id),
      fetchAuctionBids(id).catch(() => ({ bids: [] })),
    ]).then(([auctionData, bidData]) => {
      const a = auctionData.auction || {};
      const c = a.car || {};
      const normalized = { ...c, _id: c._id || a.carId || a.id, auctionStatus: (a.status === 'active' ? 'live' : (a.status || c.auctionStatus)), auctionEnd: a.endTime || c.auctionEnd, auctionStartTime: a.startTime || c.auctionStartTime, currentBid: Number(a.highestBid ?? c.currentBid ?? c.price ?? a.startingBid ?? 0), bidsCount: Number(a.bidCount ?? c.bidsCount ?? 0), price: Number(c.price ?? a.startingBid ?? 0), bidIncrement: Number(a.bidIncrement || c.bidIncrement || 0) };
      setCar(normalized);
      setCurrentBid(normalized.currentBid || normalized.price || 0);
      setBidCount(normalized.bidsCount || 0);
      const bs = bidData.bids || bidData.data || [];
      setBids(bs.slice(0, 30));
      const configuredIncrement = Number(a.bidIncrement || c.bidIncrement || 0);
      const minNext = (normalized.currentBid || normalized.price || 0) + (configuredIncrement || 1000);
      setBidAmount(String(minNext));
    }).catch(() => setCar(null)).finally(() => setLoading(false));
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
      .catch((err) => {
        setRegistration(null); setRegistrationSetup(null);
        // STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE FIX: this previously
        // discarded the error entirely, treating a 403 "Account suspended"/
        // "Account deactivated" response (backend/middleware/auth.js's
        // protect() middleware) identically to "not yet registered" - a
        // banned/deactivated user saw a normal "Register to bid" CTA with
        // no indication why. The sibling write path just below (register/
        // commitment handlers) already surfaces the backend's specific
        // message via the same err.response?.data?.message shape; this
        // read path is brought into line with it for the one case that
        // actually needs surfacing - an auth-boundary rejection, not an
        // ordinary "no registration yet" 404/empty response.
        const status = err?.response?.status;
        const message = err?.response?.data?.message;
        if (status === 403 && message) toast(message, 'error');
      })
      .finally(() => setRegistrationLoading(false));
  }, [id, isAuth]);

  useEffect(() => {
    if (!id || !isAuth) { setOutcome(null); return; }
    const status = String(car?.auctionStatus || '').toLowerCase();
    if (!['ended', 'sold'].includes(status)) return;
    fetchAuctionOutcome(id).then((data) => setOutcome(data.outcome || null)).catch(() => setOutcome(null));
  }, [id, isAuth, car?.auctionStatus]);

  const handleRegister = async () => {
    if (!isAuth) { navigate('/login'); return; }
    if (roomState?.biddingRoomClosed || roomState?.registrationOpen === false) {
      toast('Bidding room is closed. You can watch the live auction, but new bidders cannot join.', 'info');
      return;
    }
    const termsVersion = registrationSetup?.config?.termsVersion;
    if (!termsVersion || !termsAccepted) { toast('Review and accept the current auction terms before registering.', 'error'); return; }
    try {
      setRegistrationLoading(true);
      const data = await auctionRegistrationAPI.register(id, { termsVersion, acceptTerms: termsAccepted, idempotencyKey: `${id}:${user?.id}:registration` });
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
        setLastBidder(newBid?.bidderTag || newBid?.user?.name || newBid?.bidder?.name || 'Another bidder');
        const minNext = newBid.amount + Number(registrationSetup?.config?.bidIncrement || roomState?.bidIncrement || car?.bidIncrement || 1000);
        setBidAmount(String(minNext));
        bidListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      },
      onCarUpdate: (updated) => {
        const endedEvent = updated?.auction_status === 'ended' || updated?.auctionStatus === 'ended' || updated?.event === 'auctionEnded' || updated?.phase === 'ended';
        const current = Number(updated?.currentBid ?? updated?.highestBid ?? 0);
        if (current > 0) setCurrentBid(current);
        if (updated?.auctionEnd || updated?.newEndTime) setCar((prev) => prev ? { ...prev, auctionEnd: updated.auctionEnd || updated.newEndTime } : prev);
        if (endedEvent) {
          setCar((prev) => prev ? { ...prev, auctionStatus: 'ended', allowBid: false } : prev);
          toast('Auction has ended. The authoritative outcome is now being prepared.', 'info');
        }
      },
    });
    return () => { if (channel) leaveChannel(channel); };
  }, [id, connected, joinAuction, leaveChannel, registrationSetup?.config?.bidIncrement, roomState?.bidIncrement, car?.bidIncrement]);

  // Reconcile periodically with the authoritative auction read model. Socket.IO
  // is the fast path, but the browser must never remain stale indefinitely when
  // a websocket is interrupted, a mobile network changes, or an event is missed.
  useEffect(() => {
    if (!id || !car || ended) return;
    const refreshAuthoritativeState = async () => {
      try {
        const data = await fetchAuction(id);
        const a = data.auction || {};
        const c = a.car || {};
        const nextStatus = a.status === 'active' ? 'live' : (a.status || c.auctionStatus);
        const nextCurrentBid = Number(a.highestBid ?? c.currentBid ?? c.price ?? a.startingBid ?? 0);
        const nextBidCount = Number(a.bidCount ?? c.bidsCount ?? 0);
        setCar((previous) => previous ? {
          ...previous,
          ...c,
          auctionStatus: nextStatus,
          auctionEnd: a.endTime || c.auctionEnd || previous.auctionEnd,
          auctionStartTime: a.startTime || c.auctionStartTime || previous.auctionStartTime,
          currentBid: nextCurrentBid,
          bidsCount: nextBidCount,
          bidIncrement: Number(a.bidIncrement || c.bidIncrement || previous.bidIncrement || 1000),
        } : previous);
        setCurrentBid(nextCurrentBid);
        setBidCount(nextBidCount);
        if (Array.isArray(data.bids) && data.bids.length) setBids(data.bids.slice(0, 30));
      } catch {
        // Preserve the last known authoritative state; socket reconnect and the
        // next reconciliation attempt will recover without flashing an error.
      }
    };
    void refreshAuthoritativeState();
    const intervalMs = connected ? 30000 : 10000;
    const timer = window.setInterval(refreshAuthoritativeState, intervalMs);
    return () => window.clearInterval(timer);
  }, [id, car?.auctionStatus, ended, connected]);

  const handlePlaceBid = async () => {
    if (!isAuth) { navigate('/login'); return; }
    const amount = Number(bidAmount);
    if (amount <= currentBid) {
      toast(`Bid must be above ${formatKES(currentBid)}`, 'error'); return;
    }
    setPlacing(true);
    try {
      const data = await placeBid(id, amount);
      setBidConfirmation(true);
      toast('Bid request sent. Complete the KAYAD M-Pesa confirmation to make the bid market-active.', 'info');
    } catch (err) {
      toast(err instanceof BidApiError ? err.message : err?.response?.data?.message || 'Failed to place bid', 'error');
    } finally {
      setPlacing(false);
    }
  };

  const handleWinnerSettlement = async () => {
    if (!isAuth || !outcome) { navigate('/login'); return; }
    setSettling(true);
    try {
      const mode = String(outcome.settlement_mode || registrationSetup?.config?.settlement?.mode || 'direct');
      if (mode === 'escrow' && outcome.escrow_id) {
        navigate(`/?nav=escrow&escrowId=${encodeURIComponent(outcome.escrow_id)}`);
        return;
      }
      const phone = String(user?.phone || '').trim();
      if (!phone) { toast('A verified phone number is required to initiate winner payment. Update your profile first.', 'error'); navigate('/?nav=profile'); return; }
      await initiateAuctionWinnerPayment(id, phone);
      toast('Winner payment initiated. Complete the M-Pesa prompt to continue.', 'success');
    } catch (err) {
      toast(err?.message || 'Unable to initiate winner settlement', 'error');
    } finally { setSettling(false); }
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const bidIncrement = Number(registrationSetup?.config?.bidIncrement || roomState?.bidIncrement || car?.bidIncrement || 1000);
  const minBid = currentBid + bidIncrement;
  const isOwner = Boolean(user?.id && car?.dealer && (String(user.id) === String(car.dealer.id || car.dealer._id || car.dealer)));
  const scheduled = !auctionLive && !ended && car?.auctionStatus === 'draft';
  const topBid = bids.reduce((best, bid) => Number(bid.amount || 0) > Number(best?.amount || 0) ? bid : best, null);
  const userWon = ended && Boolean(user?.id && outcome?.winner_user_id && String(user.id) === String(outcome.winner_user_id));

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;
  if (!car) return <div className="page loading-center"><h3>Auction not found</h3></div>;

  return (
    <div className="page auction-live-premium" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <DomainPremiumHeader domain="auction" kicker="KAYAD AUCTION ROOM · LIVE MARKET" title={ended ? 'The auction room has closed.' : car.title} description={ended ? 'The vehicle is now in its authoritative post-auction journey.' : 'A focused live room for bidding, market pulse and the next settlement step—without leaving the vehicle context.'} meta={<><span>{auctionLive ? 'Live bidding' : ended ? 'Auction concluded' : 'Registration'}</span><span>{bidCount} bids</span>{currentBid > 0 && <span>{formatKES(currentBid)}</span>}</>} action={<button type="button" className="btn btn-outline btn-sm" onClick={() => navigate('/?nav=discovery')}>← All Auctions</button>} />
        <DomainPremiumStats domain="auction" items={[{ label: scheduled ? 'Starting bid' : 'Current bid', value: currentBid > 0 ? formatKES(currentBid) : '—', detail: scheduled ? 'Published opening value' : 'Authoritative live value' }, { label: 'Bids', value: bidCount, detail: 'Live bid count' }, { label: 'Room', value: auctionLive ? 'Open' : ended ? 'Closed' : 'Registration', detail: 'Canonical auction state' }, { label: 'Connection', value: connected ? 'Live' : 'Reconnecting', detail: 'Auction market stream' }]} />
        <DomainJourneyRail domain="auction" steps={[{ label: 'Register', state: ended ? 'complete' : registration ? 'complete' : 'current' }, { label: 'Bid', state: ended ? 'complete' : auctionLive ? 'current' : 'pending' }, { label: 'Outcome', state: ended ? 'current' : 'pending' }, { label: 'Settlement', state: 'pending' }, { label: 'Fulfilment', state: 'pending' }]} />
        <DomainTrustStrip domain="auction" items={[{ label: scheduled ? 'Published auction data' : 'Authoritative bid stream' }, { label: 'Bidding lock enforced' }, { label: 'Dealer settlement policy' }, { label: 'Escrow only when selected' }]} />
        {ended && userWon && <AuctionWinningCelebration title={car.title} amount={Number(outcome?.winning_amount || topBid?.amount || currentBid || 0)} onSettle={settling ? undefined : handleWinnerSettlement} onHistory={() => navigate('/?nav=discovery')} />}
        {ended && !userWon && <div className="auction-wow-win auction-wow-ended-neutral"><div className="auction-wow-trophy"><span>✓</span></div><div className="auction-wow-win-copy"><span className="auction-wow-overline">AUCTION CONCLUDED</span><h2>The room has closed.</h2><p>{car.title} has moved into its post-auction journey.</p></div></div>}


        <div className="grid-sidebar-right" style={{ gap: 28, gridTemplateColumns: '1fr 380px' }}>

          {/* ─── LEFT: Car + Bid History ─── */}
          <div>
            <AuctionCinematicGallery title={car.title} images={car.images} status={auctionLive ? 'live' : car.auctionStatus} inspected={car.inspectionStatus === 'passed' || car.inspectionStatus === 'completed'} escrow={Boolean(car.escrowEnabled)} />
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
                    {[minBid, minBid + bidIncrement, minBid + (bidIncrement * 2), minBid + (bidIncrement * 3)].map(amt => (
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

                {/* Verified payment identity */}
                <div className="card" style={{ padding: 14, marginBottom: 20, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Bid confirmation</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>M-Pesa confirmation uses your verified profile number.</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{user?.phone ? `Verified number ending ${String(user.phone).slice(-4)}` : 'A verified phone number is required to bid.'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>A nominal KES 1 M-Pesa confirmation payment is requested for each bid; the bid amount itself is not collected at bid placement.</div>
                  {Number(bidAmount) > 5000000 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Platform risk control: bids above KES 5,000,000 require a KES 50,000 pre-authorized escrow deposit before bidding.</div>}
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
                    {registrationSetup?.config?.termsVersion && !registration && (
                      <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 12, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} style={{ marginTop: 2 }} />
                        <span>I have reviewed and accept the auction terms presented for this auction (version <strong>{registrationSetup.config.termsVersion}</strong>).</span>
                      </label>
                    )}
                    {!isAuth ? (
                      <button className="btn btn-gold btn-full" onClick={() => navigate('/login')}>Sign in to register</button>
                    ) : registration?.status === 'active' ? (
                      <div style={{ color: 'var(--green)', fontSize: 12 }}>✓ You are registered and cleared to bid when the auction opens.</div>
                    ) : !roomState?.registrationOpen ? (
                      <div style={{ color: 'var(--red)', fontSize: 12 }}>Registration is closed. You may watch when the auction goes live.</div>
                    ) : !registration ? (
                      <button className="btn btn-gold btn-full" onClick={handleRegister} disabled={registrationLoading}>Register for this auction</button>
                    ) : registration.status === 'pending_commitment' || registration.commitment_status === 'payment_pending' ? (
                      <>
                        <div style={{ padding: 12, marginBottom: 10, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
                          <strong style={{ color: 'var(--text)' }}>Bidder commitment:</strong> {formatKES(Number(registration.commitment_amount || 0))} · {registrationSetup?.config?.commitment?.recipient === 'platform' ? 'KAYAD' : 'auction organizer'} · {registrationSetup?.config?.commitment?.refundable === false ? 'non-refundable' : 'refundable according to the published terms'}
                        </div>
                        <button className="btn btn-gold btn-full" onClick={handleCommitment} disabled={registrationLoading || registration.commitment_status === 'payment_pending'}>
                          {registration.commitment_status === 'payment_pending' ? 'Awaiting M-Pesa confirmation…' : 'Pay bidder commitment'}
                        </button>
                      </>
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
                  <p>1. Register before the room opens and satisfy any required bidder commitment.</p>
                  <p>2. Place bids using your verified profile. Bid confirmation is completed through KAYAD's M-Pesa flow.</p>
                  <p>3. If you win, settlement follows the auction's published <strong>{String(registrationSetup?.config?.settlement?.mode || outcome?.settlement_mode || 'direct') === 'escrow' ? 'escrow' : 'direct settlement'}</strong> rule.</p>
                  <p>4. Collection and ownership transfer are completed through the controlled post-auction fulfilment workflow.</p>
                </div>
              </div>

              {/* Auction Organizer */}
              <AuctionDisclaimerInline className="auction-live-disclaimer" />

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
        canBid={Boolean((!isAuth || (isAuth && !isOwner && registration?.status === 'active' && bidAmount && Number(bidAmount) >= minBid)))}
        label={!isAuth ? 'Sign in to bid' : registration?.status === 'active' ? 'Place bid' : 'Registration required'}
        amount={bidAmount}
        onBid={handlePlaceBid}
        disabled={placing}
      />
    </div>
  );
}
