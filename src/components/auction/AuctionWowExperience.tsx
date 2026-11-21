import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { ArrowUpRight, ChevronLeft, ChevronRight, ShieldCheck, Gauge, Image as ImageIcon, Lock, MapPin, Sparkles, Timer, Trophy, Zap } from 'lucide-react';

type GalleryProps = {
  title: string;
  images?: Array<{ url?: string } | string>;
  status?: string;
  inspected?: boolean;
  /** STAGE 8 MARKETPLACE TRUST SIGNAL FIX: authoritative escrow
   * capability for this vehicle (car.escrowEnabled from the backend),
   * so the auction detail page agrees with the marketplace card. */
  escrow?: boolean;
};

const imageUrl = (image: { url?: string } | string | undefined) => typeof image === 'string' ? image : image?.url || '';

export function AuctionCinematicGallery({ title, images = [], status, inspected, escrow }: GalleryProps) {
  const usable = images.map(imageUrl).filter(Boolean);
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const current = usable[active] || '';

  useEffect(() => { setActive(0); }, [images.length, title]);

  if (!current) {
    return <div className="auction-wow-gallery auction-wow-gallery-empty"><ImageIcon size={28} /><span>Vehicle imagery unavailable</span></div>;
  }

  const move = (direction: number) => setActive((value) => (value + direction + usable.length) % usable.length);
  return (
    <section className="auction-wow-gallery" aria-label="Vehicle gallery" onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; }} onTouchEnd={(event) => { const start = touchStartX.current; const end = event.changedTouches[0]?.clientX; touchStartX.current = null; if (start == null || end == null || Math.abs(end - start) < 44 || usable.length < 2) return; move(end < start ? 1 : -1); }}>
      <div className="auction-wow-gallery-stage">
        {/* STAGE 11 REDUCED-MOTION CONVERGENCE: MotionConfig reducedMotion="user"
            tells Framer Motion to automatically honor the OS prefers-reduced-motion
            setting for every motion component inside it (collapsing transform
            animations to simple opacity/instant changes) without any change to
            which image is shown or when — purely presentational. */}
        <MotionConfig reducedMotion="user">
          <AnimatePresence mode="wait">
            <motion.img
              key={`${current}-${active}`}
              src={current}
              alt={`${title} — image ${active + 1}`}
              className="auction-wow-gallery-image"
              initial={{ opacity: 0, scale: 1.025 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: .99 }}
              transition={{ duration: .32, ease: 'easeOut' }}
            />
          </AnimatePresence>
        </MotionConfig>
        <div className="auction-wow-gallery-shade" />
        <div className="auction-wow-gallery-topline">
          <span className={status === 'live' ? 'auction-wow-live-chip' : 'auction-wow-soft-chip'}>
            {status === 'live' && <i />}{status === 'live' ? 'LIVE ROOM' : 'AUCTION'}
          </span>
          {/* STAGE 11 ICON CONVERGENCE: converged from CircleCheck to the
              canonical ShieldCheck icon VehicleCard.tsx and the main
              inventory grid card already use for the identical "Inspected"
              trust chip, so one concept now maps to one icon across the
              live auction room and both marketplace cards. */}
          {inspected && <span className="auction-wow-soft-chip"><ShieldCheck size={12} /> Inspected</span>}
          {escrow && <span className="auction-wow-soft-chip"><Lock size={12} /> Escrow</span>}
        </div>
        <div className="auction-wow-gallery-caption">
          <span className="auction-wow-overline">VEHICLE STORY</span>
          <h2>{title}</h2>
          <span>{active + 1} / {usable.length} views</span>
        </div>
        {usable.length > 1 && (
          <>
            <button type="button" className="auction-wow-gallery-nav prev" onClick={() => move(-1)} aria-label="Previous vehicle image"><ChevronLeft size={18} /></button>
            <button type="button" className="auction-wow-gallery-nav next" onClick={() => move(1)} aria-label="Next vehicle image"><ChevronRight size={18} /></button>
          </>
        )}
      </div>
      {usable.length > 1 && (
        <div className="auction-wow-gallery-thumbs" role="tablist" aria-label="Vehicle images">
          {usable.slice(0, 8).map((src, index) => (
            <button key={`${src}-${index}`} type="button" className={index === active ? 'is-active' : ''} onClick={() => setActive(index)} aria-label={`View image ${index + 1}`}>
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function AuctionActivityPulse({ currentBid, bidCount, endsAt, connected, recentBidder }: {
  currentBid: number; bidCount: number; endsAt?: string | null; connected?: boolean; recentBidder?: string;
}) {
  const [remaining, setRemaining] = useState(() => endsAt ? Math.max(0, new Date(endsAt).getTime() - Date.now()) : 0);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setRemaining(Math.max(0, new Date(endsAt).getTime() - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  const urgency = remaining > 0 && remaining < 120000;
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const countdown = remaining > 0 ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : 'CLOSED';
  return (
    <div className={`auction-wow-pulse ${urgency ? 'is-urgent' : ''} ${remaining === 0 && endsAt ? 'is-closed' : ''}`}>
      <div className="auction-wow-pulse-head">
        <div><span className="auction-wow-overline">LIVE MARKET PULSE</span><strong>{recentBidder ? `${recentBidder} just moved the room` : 'The room is moving'}</strong></div>
        <span className="auction-wow-connection"><i className={connected ? 'is-on' : ''} /> {connected ? 'Live feed' : 'Reconnecting'}</span>
      </div>
      <div className="auction-wow-pulse-grid">
        <div><span>Leading bid</span><strong>KES {Number(currentBid || 0).toLocaleString('en-KE')}</strong></div>
        <div><span>Activity</span><strong>{bidCount} <small>bids</small></strong></div>
        <div className="auction-wow-countdown-cell"><span>Time remaining</span><strong>{countdown}</strong></div>
      </div>
      <div className="auction-wow-pulse-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
    </div>
  );
}

export function AuctionBidConfirmation({ amount, open, onClose }: { amount: number; open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.([12, 30, 18]);
    const timer = window.setTimeout(onClose, 2800);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);
  // STAGE 12 PHASE C: traced before changing anything. Despite the
  // "confirmation" name, this is NOT a decision-blocking dialog — it has
  // no confirm/cancel choice, auto-dismisses itself after 2.8s regardless
  // of user action (see the timer above), and its only button is a
  // supplementary early-dismiss, not a required interaction. Giving it
  // role="dialog"/aria-modal="true" and a focus trap (the Stage 11 gap
  // note's literal wording) would be the wrong fix here: it would trap
  // keyboard focus on a panel that vanishes on its own a moment later,
  // which is worse than not trapping it at all. The correct semantics for
  // a transient, self-dismissing status message is a polite live region,
  // the same pattern already used for the toast system elsewhere in the
  // app -- so that's what this adds, with no change to timing, bid
  // authority, or when the panel appears/disappears. A live region is
  // announced by assistive tech without moving keyboard focus to it,
  // which is the correct behavior for a non-blocking transient message
  // (unlike a real dialog, nothing here should steal focus from the page
  // the bidder is still interacting with).
  return (
    // STAGE 11 REDUCED-MOTION CONVERGENCE: see AuctionCinematicGallery above —
    // same MotionConfig gating, no change to when the confirmation appears or
    // disappears (that remains driven by `open` and the existing 2.8s timer).
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && <motion.div className="auction-wow-bid-confirm" role="status" aria-live="polite" aria-atomic="true" initial={{ opacity: 0, y: 20, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }}>
          <div className="auction-wow-confirm-icon" aria-hidden="true"><Zap size={19} fill="currentColor" /></div>
          <div><span className="auction-wow-overline">BID REQUEST SENT</span><strong>KES {Number(amount).toLocaleString('en-KE')}</strong><p>Complete the M-Pesa confirmation to make this bid market-active.</p></div>
          <button type="button" onClick={onClose} aria-label="Dismiss confirmation">×</button>
        </motion.div>}
      </AnimatePresence>
    </MotionConfig>
  );
}

export function AuctionWinningCelebration({ title, amount, onSettle, onHistory }: { title: string; amount: number; onSettle?: () => void; onHistory?: () => void }) {
  return (
    // STAGE 11 REDUCED-MOTION CONVERGENCE: see AuctionCinematicGallery above —
    // same MotionConfig gating; the winning-moment content, amount and
    // settlement/history actions are unchanged either way.
    //
    // STAGE 12 PHASE B: this component only ever mounts conditionally, once,
    // the moment a user's win is confirmed (see AuctionLivePage.jsx:
    // `{ended && userWon && <AuctionWinningCelebration ... />}`) -- a single,
    // genuinely meaningful lifecycle transition, not a repeating or
    // decorative change, so role="status"/aria-live="polite" here announces
    // it exactly once without any risk of the "every timer tick" noise the
    // master prompt warns against.
    <MotionConfig reducedMotion="user">
      <motion.section className="auction-wow-win" role="status" aria-live="polite" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="auction-wow-win-glow" aria-hidden="true" />
        <div className="auction-wow-trophy" aria-hidden="true"><Trophy size={27} /></div>
        <div className="auction-wow-win-copy"><span className="auction-wow-overline">WINNING MOMENT</span><h2>You won {title}.</h2><p>Your winning bid is <strong>KES {Number(amount).toLocaleString('en-KE')}</strong>. The next step is settlement.</p></div>
        <div className="auction-wow-win-actions">
          {onSettle && <button type="button" onClick={onSettle}>Continue to settlement <ArrowUpRight size={15} /></button>}
          {onHistory && <button type="button" className="is-quiet" onClick={onHistory}>Keep exploring</button>}
        </div>
      </motion.section>
    </MotionConfig>
  );
}

export function AuctionMobileActionBar({ live, canBid, amount, onBid, disabled, label = 'Place bid' }: { live: boolean; canBid: boolean; amount: string; onBid: () => void; disabled?: boolean; label?: string }) {
  if (!live) return null;
  const submit = () => {
    if (!canBid || disabled) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(10);
    onBid();
  };
  return <div className="auction-wow-mobile-bar">
    <div><span>YOUR BID</span><strong>{amount ? `KES ${Number(amount).toLocaleString('en-KE')}` : 'Choose amount'}</strong></div>
    <button type="button" onClick={submit} disabled={!canBid || disabled}>{disabled ? 'Placing…' : label}<Zap size={16} fill="currentColor" /></button>
  </div>;
}

export function AuctionRecommendationStrip({ auctions, currentId, title = 'Picked for your next auction' }: { auctions: Array<{ id: string; title: string; image?: string; currentBid?: number; location?: string }>; currentId?: string; title?: string }) {
  const items = useMemo(() => auctions.filter((auction) => auction.id !== currentId).slice(0, 4), [auctions, currentId]);
  if (!items.length) return null;
  return <section className="auction-wow-recommendations">
    <div className="auction-wow-section-head"><div><span className="auction-wow-overline">NEXT FOR YOU</span><h3>{title}</h3></div><Sparkles size={18} /></div>
    <div className="auction-wow-recommendation-grid">
      {items.map((auction) => <Link key={auction.id} to={`/auction/${auction.id}`} className="auction-wow-recommendation-card">
        {auction.image ? <img src={auction.image} alt={auction.title} /> : <div className="auction-wow-recommendation-placeholder"><Gauge size={20} /></div>}
        <div><strong>{auction.title}</strong><span>{auction.location ? <><MapPin size={11} /> {auction.location}</> : 'Auction vehicle'}</span><b>{auction.currentBid ? `KES ${Number(auction.currentBid).toLocaleString('en-KE')}` : 'View auction'}</b></div>
      </Link>)}
    </div>
  </section>;
}
