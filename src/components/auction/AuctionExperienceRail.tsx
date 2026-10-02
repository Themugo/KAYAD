import React from 'react';
import { ArrowRight, Check, CreditCard, Gavel, History, ShieldCheck, Sparkles, UserRound } from 'lucide-react';

export type AuctionJourneyStep = 'detail' | 'registration' | 'wallet' | 'live' | 'win' | 'payment' | 'fulfilment' | 'history' | 'profile';

type Props = { current?: AuctionJourneyStep; compact?: boolean; onNavigate?: (step: AuctionJourneyStep) => void };

const steps: Array<{ id: AuctionJourneyStep; label: string; icon: React.ElementType }> = [
  { id: 'detail', label: 'Explore', icon: Sparkles },
  { id: 'registration', label: 'Register', icon: ShieldCheck },
  { id: 'wallet', label: 'Bidder pass', icon: CreditCard },
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'live', label: 'Live room', icon: Gavel },
  { id: 'win', label: 'Winning moment', icon: Check },
  { id: 'payment', label: 'Settlement', icon: CreditCard },
  { id: 'fulfilment', label: 'Fulfilment', icon: ArrowRight },
  { id: 'history', label: 'History', icon: History },
];

export function AuctionExperienceRail({ current = 'detail', compact = false, onNavigate }: Props) {
  const currentIndex = steps.findIndex((step) => step.id === current);
  return (
    <div className={`auction-xp-rail ${compact ? 'is-compact' : ''}`} aria-label="Auction journey">
      <div className="auction-xp-rail-intro">
        <div className="auction-xp-mark"><Sparkles size={15} /></div>
        {!compact && <div><span className="auction-xp-overline">YOUR AUCTION JOURNEY</span><strong>One room. Every next step.</strong></div>}
      </div>
      <div className="auction-xp-steps">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const active = step.id === current;
          const complete = currentIndex > index;
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                className={`auction-xp-step ${active ? 'is-active' : ''} ${complete ? 'is-complete' : ''}`}
                onClick={() => onNavigate?.(step.id)}
                disabled={!onNavigate}
                aria-current={active ? 'step' : undefined}
              >
                <span className="auction-xp-step-icon"><Icon size={14} /></span>
                {!compact && <span>{step.label}</span>}
              </button>
              {index < steps.length - 1 && <span className={`auction-xp-connector ${complete ? 'is-complete' : ''}`} aria-hidden="true" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export function BidderIdentityCard({ user, registrationStatus, auctionCount, savedCount = 0, onProfile, onPayments }: {
  user?: any; registrationStatus?: string | null; auctionCount?: number; savedCount?: number; onProfile?: () => void; onPayments?: () => void;
}) {
  const name = user?.name || user?.fullName || 'Your bidder profile';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase() || 'K';
  const active = registrationStatus === 'active';
  return (
    <section className="auction-bidder-card">
      <div className="auction-bidder-orb">{initials}</div>
      <div className="auction-bidder-copy">
        <span className="auction-xp-overline">BIDDER PROFILE</span>
        <h3>{name}</h3>
        <p>{active ? 'Your bidder pass is active for this auction.' : 'Keep your profile ready so the next auction is one tap away.'}</p>
        <div className="auction-bidder-stats">
          {typeof auctionCount === 'number' && <span><strong>{auctionCount}</strong> auctions</span>}
          <span><strong>{savedCount}</strong> saved</span>
          <span className={active ? 'is-ready' : ''}><i /> {active ? 'Ready to bid' : 'Profile ready'}</span>
        </div>
      </div>
      <div className="auction-bidder-actions">
        {onPayments && <button type="button" onClick={onPayments}><CreditCard size={15} /> Payment activity</button>}
        {onProfile && <button type="button" onClick={onProfile}><UserRound size={15} /> Profile</button>}
      </div>
    </section>
  );
}

export function AuctionOutcomeBanner({ won = false, title, amount, onPayment, onHistory }: { won?: boolean; title: string; amount?: number; onPayment?: () => void; onHistory?: () => void }) {
  return (
    <section className={`auction-outcome-banner ${won ? 'is-win' : ''}`}>
      <div className="auction-outcome-glow" aria-hidden="true" />
      <div className="auction-outcome-icon"><Check size={23} /></div>
      <div className="auction-outcome-copy">
        <span className="auction-xp-overline">AUCTION CONCLUDED</span>
        <h2>{won ? 'You won the room.' : 'The bidding has closed.'}</h2>
        <p>{won ? `${title}${amount ? ` · winning bid KES ${amount.toLocaleString('en-KE')}` : ''}` : `${title} is now moving into its post-auction journey.`}</p>
      </div>
      <div className="auction-outcome-actions">
        {won && onPayment && <button type="button" onClick={onPayment}>Continue to settlement <ArrowRight size={15} /></button>}
        {onHistory && <button type="button" className="is-secondary" onClick={onHistory}>View auction history</button>}
      </div>
    </section>
  );
}
