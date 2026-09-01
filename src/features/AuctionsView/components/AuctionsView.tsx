import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Vehicle, AuctionSession, BidRecord, UserProfile } from '../../../types';
import { getAuctionIdFromUrl, setAuctionDetailUrl } from '../../../utils/navigation';
import { placeBid, BidApiError } from '../../../services/bidApi';
// CreateAuctionModal import removed - its only usage in this file was
// the dead, unreachable modal instance removed above. The component
// itself still lives on and is used by DealerBusinessView.tsx.
import { AuctionCreationForm } from './AuctionCreationForm';
import { BidderRegistrationModal, VerifiedBidderProfile } from './BidderRegistrationModal';
import { PreAuctionInspectionModal } from './PreAuctionInspectionModal';
import { LiveAuctionRoomModal } from './LiveAuctionRoomModal';
import { PostAuctionCompletionModal } from './PostAuctionCompletionModal';
import { OrganizerManagementConsole } from './OrganizerManagementConsole';
import { AuctionOrganizerDashboard } from './AuctionOrganizerDashboard';
import { Gavel, Clock, Lock, CheckCircle2, ShieldCheck, History, X, Bell, Calendar, FileText, Check, Search, Heart, TrendingUp, Tag, RotateCcw, Sparkles, Zap, DollarSign, UserCheck, Building2, BarChart2, Info, Award, EyeOff, UserPlus, Wrench, Settings, AlertTriangle, ChevronRight } from 'lucide-react';
import { PageHeader, Card, Badge, Button, LazyImage, Input } from '../../../components/ui';
import { isEscrowApplicable } from '../../../utils/escrow';
import { useAuctionPageConfig } from '../hooks/useAuctionPageConfig';
import AuctionPageAdminPanel from './AuctionPageAdminPanel';
import MarketingCard from '../../../components/MarketingCard';

function isValidAdvertLabel(label: string): label is 'Sponsored' | 'Partner' | 'Featured Dealer' {
  return label === 'Sponsored' || label === 'Partner' || label === 'Featured Dealer';
}

interface AuctionsViewProps {
  vehicles: Vehicle[];
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  onStartEscrow: (vehicle: Vehicle) => void;
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
  onUpdateVehicleAuctionStatus?: (vehicleId: string, isAuction: boolean) => void;
  onUpdateVehicleEscrowOverride?: (vehicleId: string, override: 'enforce' | 'revoke' | null) => void;
}

// Time remaining formatter helper
function formatTimeRemaining(endsAt: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isUrgent: boolean;
  isExpired: boolean;
  formatted: string;
} {
  const totalMs = new Date(endsAt).getTime() - Date.now();
  // Guards against NaN specifically, not just totalMs <= 0: an
  // invalid/malformed endsAt string produces NaN from new Date(), and
  // NaN <= 0 evaluates to false (NaN comparisons are always false) -
  // so a totalMs <= 0 check alone would let a bad date slip through
  // and render "NaNd NaNh NaNm NaNs" instead of a clean closed state.
  // Not currently reachable with today's mock data (verified elsewhere
  // this session that every real auctionEndsAt/endsAt is a valid,
  // computed ISO string), but a real robustness gap worth closing
  // regardless, since a future data source (real backend, admin-entered
  // auction) isn't guaranteed to always supply a well-formed date.
  if (Number.isNaN(totalMs) || totalMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isUrgent: false, isExpired: true, formatted: 'Auction Closed' };
  }
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
  const seconds = Math.floor((totalMs / 1000) % 60);

  const isUrgent = totalMs < 24 * 60 * 60 * 1000; // less than 24 hours

  const pad = (n: number) => String(n).padStart(2, '0');
  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  } else {
    formatted = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }

  return { days, hours, minutes, seconds, isUrgent, isExpired: false, formatted };
}

export const AuctionsView: React.FC<AuctionsViewProps> = ({ 
  vehicles, 
  user,
  onOpenAuth,
  onStartEscrow, 
  onQuickViewVehicle,
  onUpdateVehicleAuctionStatus,
  onUpdateVehicleEscrowOverride
}) => {
  // Auction sessions state initialized from mock service
  const [sessions, setSessions] = useState<AuctionSession[]>([]);

  // Computed once per render, not per-second like the live countdowns -
  // this banner only needs to be accurate to the day, not the second.
  // Finds the real next Wednesday from today (today itself if today IS
  // Wednesday, matching "next occurrence including today" - the more
  // useful interpretation for an event announcement banner) so the
  // weekday label and date can never drift out of sync with each other.
  const nextWednesdayLabel = useMemo(() => {
    const WEDNESDAY = 3; // JS Date.getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed
    const today = new Date();
    const daysUntilWednesday = (WEDNESDAY - today.getDay() + 7) % 7;
    const nextWednesday = new Date(today);
    nextWednesday.setDate(today.getDate() + daysUntilWednesday);
    return nextWednesday.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  }, []);

  // Organizer-capable roles - auctions are organized by institutions
  // (banks doing repossessions, dealers doing clearance sales, fleet
  // companies), not individual buyers. Found the 3 hero buttons
  // (Organizer Dashboard/Portal/Organize Auction Event) were shown
  // unconditionally to every visitor regardless of role, including
  // completely logged-out ones - business/seller-side tooling mixed
  // into a page whose whole job is buyer browsing and bidding. Also
  // found a related, more concerning issue: the inline creation form
  // was passed `userRole={user?.role || 'dealer'}`, defaulting to
  // dealer-level auction-creation permissions for a NULL (logged-out)
  // user rather than denying access - fixed by gating the form's own
  // reachability on this same check instead of just hiding its trigger
  // button, so there's no path to it left for a non-organizer even if
  // they knew the button existed.
  const isOrganizerCapable = user?.role === 'dealer' || user?.role === 'bank_officer' || user?.role === 'admin';

  // Auction page admin customization - separate concern from
  // isOrganizerCapable (dealers/bank officers organize auctions, but
  // don't get page-layout/text editing rights - that's admin-only).
  const isPageAdmin = user?.role === 'admin';
  const { config: auctionConfig, updateConfig: updateAuctionConfig, resetConfig: resetAuctionConfig } =
    useAuctionPageConfig(isPageAdmin && user ? { id: user.id, name: user.name } : null);
  const [showAuctionAdminPanel, setShowAuctionAdminPanel] = useState(false);

  // Watched Auctions state
  const [watchedIds, setWatchedIds] = useState<string[]>(['AUC-2026-8801']);
  
  // Dedicated Search & Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [reserveStatusFilter, setReserveStatusFilter] = useState<'All' | 'Reserve Met' | 'Reserve Unmet'>('All');
  const [minBidFilter, setMinBidFilter] = useState<string>('');
  const [maxBidFilter, setMaxBidFilter] = useState<string>('');
  const [filterEndingSoon, setFilterEndingSoon] = useState<boolean>(false);
  const [filterBuyNow, setFilterBuyNow] = useState<boolean>(false);
  const [filterVerified, setFilterVerified] = useState<boolean>(false);
  
  // Detail & Bid Modal State
  const [selectedSession, setSelectedSession] = useState<AuctionSession | null>(null);

  // Deep-linking: opening/closing a lot goes through these wrappers
  // (not raw setSelectedSession calls scattered across the file) so the
  // URL and the state can never drift out of sync with each other -
  // confirmed there were 10 raw setSelectedSession call sites before
  // this, and updating each independently would risk missing one.
  const openLot = useCallback((session: AuctionSession) => {
    setSelectedSession(session);
    setAuctionDetailUrl(session.id);
  }, []);

  const closeLot = useCallback(() => {
    setSelectedSession(null);
    setAuctionDetailUrl(null);
  }, []);

  // Reads the auctionId URL param on mount and on browser back/forward
  // (popstate) - the exact same pattern already used for vehicle-detail
  // deep linking in App.tsx, applied here since AuctionsView manages
  // selectedSession as its own local state rather than lifted state.
  // This is what makes a copied lot URL, a page refresh while a lot is
  // open, and the browser back button all actually work correctly -
  // none of them did before, confirmed via a direct code check (zero
  // references to any URL/history API anywhere in this file).
  useEffect(() => {
    const syncFromUrl = () => {
      const urlAuctionId = getAuctionIdFromUrl();
      if (urlAuctionId) {
        const found = sessions.find((s) => s.id === urlAuctionId);
        setSelectedSession(found ?? null);
      } else {
        setSelectedSession(null);
      }
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
    // sessions is a real dependency, not omitted: syncFromUrl looks up
    // against it, and sessions changes on every bid (see executeBid).
    // The vehicle-detail version of this exact pattern in App.tsx
    // correctly includes its own data dependency ([vehicles]) for the
    // identical reason - an empty array here would capture a stale
    // sessions snapshot in the closure, so a later popstate/refresh
    // could resolve a lot's CURRENT bid state incorrectly. Re-attaching
    // a popstate listener on every bid is a trivial cost next to that.
  }, [sessions]);
  const [modalTab, setModalTab] = useState<'bid' | 'history' | 'inspection' | 'terms'>('bid');

  // Bidder Registration State (Only verified bidders may enter an auction room and place bids)
  const [verifiedBiddersMap, setVerifiedBiddersMap] = useState<Record<string, VerifiedBidderProfile>>({
    'AUC-2026-8801': {
      sessionId: 'AUC-2026-8801',
      bidderNumber: 'Bidder A-104',
      anonymousAlias: 'Bidder A-104',
      idNumber: '34892014',
      fullName: 'James K. Mugo',
      phone: '+254 712 *** 678',
      paymentReference: 'QGH89021X9',
      verifiedAt: '10:15 AM',
      depositAmount: 50000
    }
  });
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState<boolean>(false);
  const [registeringSession, setRegisteringSession] = useState<AuctionSession | null>(null);

  const handleOpenRegistration = (session: AuctionSession, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRegisteringSession(session);
    setIsRegistrationModalOpen(true);
  };

  const handleRegistrationComplete = (profile: VerifiedBidderProfile) => {
    setVerifiedBiddersMap(prev => ({
      ...prev,
      [profile.sessionId]: profile
    }));
    showToast(`Bidder Pass Activated! You are ${profile.bidderNumber} with verified deposit.`);
  };

  // Pre-Auction Inspection State (Physical Viewing, Mechanic Marketplace Booking, Digital Report)
  const [isPreInspectionModalOpen, setIsPreInspectionModalOpen] = useState<boolean>(false);
  const [inspectionTargetSession, setInspectionTargetSession] = useState<AuctionSession | null>(null);

  const handleOpenPreInspection = (session: AuctionSession, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setInspectionTargetSession(session);
    setIsPreInspectionModalOpen(true);
  };

  // Live Auction Room Modal State
  const [isLiveRoomOpen, setIsLiveRoomOpen] = useState<boolean>(false);
  const [liveRoomSession, setLiveRoomSession] = useState<AuctionSession | null>(null);

  const handleOpenLiveRoom = (session: AuctionSession, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLiveRoomSession(session);
    setIsLiveRoomOpen(true);
  };

  // Post-Auction Completion Modal State
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState<boolean>(false);
  const [completionSession, setCompletionSession] = useState<AuctionSession | null>(null);
  const [completionWinnerAlias, setCompletionWinnerAlias] = useState<string | undefined>(undefined);
  const [completionWinningAmount, setCompletionWinningAmount] = useState<number | undefined>(undefined);

  const handleOpenCompletion = (session: AuctionSession, winnerAlias?: string, winningAmount?: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCompletionSession(session);
    setCompletionWinnerAlias(winnerAlias);
    setCompletionWinningAmount(winningAmount);
    setIsCompletionModalOpen(true);
  };

  // Create Auction Modal & Form State
  // Confirmed dead and removed: isCreateModalOpen/setIsCreateModalOpen
  // and the <CreateAuctionModal> instance that used it - grepped every
  // reference before removing and found setIsCreateModalOpen(true) had
  // zero call sites anywhere, meaning that modal could never actually
  // open for a real user. The working "create an auction" path is
  // showInlineCreateForm (toggled by the real "Organize Auction Event"
  // button below), which was clearly built as the newer replacement -
  // the modal was orphaned, not a second, intentional entry point.
  // handleAuctionCreated itself stays (the inline form also calls it),
  // and CreateAuctionModal the component stays too (still legitimately
  // used by DealerBusinessView.tsx) - only this specific, unreachable
  // instance within this file was dead.
  const [showInlineCreateForm, setShowInlineCreateForm] = useState<boolean>(false);
  const [isOrganizerConsoleOpen, setIsOrganizerConsoleOpen] = useState<boolean>(false);
  const [isOrganizerDashboardOpen, setIsOrganizerDashboardOpen] = useState<boolean>(false);

  const handleAuctionCreated = (newSession: AuctionSession) => {
    setSessions(prev => [newSession, ...prev]);
    setShowInlineCreateForm(false);
    showToast(`Successfully published auction event "${newSession.vehicleTitle}"!`);
  };
  
  // Bid Form state inside modal
  const [customBidAmount, setCustomBidAmount] = useState<string>('');
  const [bidderName, setBidderName] = useState<string>('');
  const [bidderLocation, setBidderLocation] = useState<string>('Nairobi');

  // Notify Me Alert state for No Live Auctions
  const [notifyContact, setNotifyContact] = useState<string>('');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);

  // Toast notification feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Ticking 1-second interval timer for accurate countdowns
  const [, setSecondsTick] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-concludes Live auctions once their countdown reaches zero -
  // this was genuinely missing before. Found while checking the
  // advertised "How KAYAD Vehicle Auctions Work" process against the
  // real implementation: step 3, "Win Auction - Highest bidder at timer
  // zero", had no backing logic anywhere. The countdown text would
  // eventually show "Auction Closed" (a pure display computation with
  // no state change behind it), but the session's own status field
  // stayed 'Live' forever - no winner was ever determined, no
  // transition to 'Awaiting Settlement' ever happened, and the
  // Recently Sold section (which filters for status === 'Ended' ||
  // 'Awaiting Settlement') would never pick it up no matter how long
  // past its end time it sat. Confirmed by tracing every path that
  // touches session.status: the only ones that exist are for
  // NEW-auction creation and manual organizer actions - nothing reacts
  // to time passing.
  //
  // Reuses the same 1-second tick above rather than a second interval -
  // on each tick, checks every currently-Live session's real end time
  // (not a cached value, so this stays correct even if endsAt is
  // updated elsewhere) and transitions any that have just passed to
  // 'Awaiting Settlement' (the correct intermediate status per the
  // type's own enum - matching "won, but escrow/settlement hasn't
  // happened yet", not the same as 'Ended' which the mock data already
  // uses for a fully historical, settled record). Guarded on
  // `s.status === 'Live'` specifically, so once a session transitions
  // it naturally stops matching on subsequent ticks - no duplicate
  // transitions, no duplicate toasts.
  useEffect(() => {
    const timer = setInterval(() => {
      setSessions((prev) => {
        let anyChanged = false;
        const next = prev.map((s) => {
          if (s.status !== 'Live') return s;
          const msRemaining = new Date(s.endsAt).getTime() - Date.now();
          if (msRemaining > 0) return s;
          anyChanged = true;
          showToast(`Auction ended: "${s.vehicleTitle}" - winning bid Ksh ${(s.currentBid ?? 0).toLocaleString()}`, 'success');
          return { ...s, status: 'Awaiting Settlement' as const };
        });
        return anyChanged ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Toggle watchlist
  const toggleWatchSession = (sessionId: string, title: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (watchedIds.includes(sessionId)) {
      setWatchedIds(watchedIds.filter(id => id !== sessionId));
      showToast(`Removed "${title}" from your Watchlist`, 'info');
    } else {
      setWatchedIds([...watchedIds, sessionId]);
      showToast(`Added "${title}" to your Watchlist!`);
    }
  };

  // Reset search filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setReserveStatusFilter('All');
    setMinBidFilter('');
    setMaxBidFilter('');
    setFilterEndingSoon(false);
    setFilterBuyNow(false);
    setFilterVerified(false);
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedCategory !== 'All' ||
    reserveStatusFilter !== 'All' ||
    minBidFilter ||
    maxBidFilter ||
    filterEndingSoon ||
    filterBuyNow ||
    filterVerified
  );

  // Filtered Auction Sessions using backend data
  const filteredLiveSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (s.status !== 'Live') return false;

      // Search Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = s.vehicleTitle.toLowerCase().includes(query);
        const matchesCategory = s.category.toLowerCase().includes(query);
        const matchesMake = s.vehicle.make?.toLowerCase().includes(query);
        const matchesModel = s.vehicle.model?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCategory && !matchesMake && !matchesModel) return false;
      }

      // Category filter
      if (selectedCategory !== 'All') {
        if (selectedCategory === 'SUVs & 4x4s') {
          if (s.vehicle.bodyStyle !== 'SUV' && !s.vehicleTitle.toLowerCase().includes('prado') && !s.vehicleTitle.toLowerCase().includes('x-trail')) return false;
        } else if (selectedCategory === 'Luxury & Executive') {
          if (!['Mercedes-Benz', 'BMW', 'Audi', 'Lexus', 'Porsche'].includes(s.vehicle.make)) return false;
        } else if (s.category !== selectedCategory) {
          return false;
        }
      }

      // Reserve status filter
      if (reserveStatusFilter === 'Reserve Met' && !s.reserveMet) return false;
      if (reserveStatusFilter === 'Reserve Unmet' && s.reserveMet) return false;

      // Min/Max bid filter
      if (minBidFilter && s.currentBid < Number(minBidFilter)) return false;
      if (maxBidFilter && s.currentBid > Number(maxBidFilter)) return false;

      // Ending soon filter (< 24h)
      if (filterEndingSoon) {
        const remainingMs = new Date(s.endsAt).getTime() - Date.now();
        if (remainingMs > 24 * 60 * 60 * 1000) return false;
      }

      // Buy now filter
      if (filterBuyNow && !s.buyoutPrice) return false;

      // Verified listings filter
      if (filterVerified && !s.vehicle.verified && !s.vehicle.inspectionPassed) return false;

      return true;
    });
  }, [sessions, searchQuery, selectedCategory, reserveStatusFilter, minBidFilter, maxBidFilter, filterEndingSoon, filterBuyNow, filterVerified]);

  // Ending Soon sessions (< 24h remaining, sorted by remaining time ascending)
  const endingSoonSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        if (s.status !== 'Live') return false;
        const timeObj = formatTimeRemaining(s.endsAt);
        return !timeObj.isExpired && timeObj.isUrgent;
      })
      .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
  }, [sessions]);

  // Upcoming sessions
  const upcomingSessions = useMemo(() => {
    return sessions.filter((s) => s.status === 'Upcoming');
  }, [sessions]);

  // Recently Sold / Settled sessions
  const recentlySoldSessions = useMemo(() => {
    return sessions.filter((s) => s.status === 'Ended' || s.status === 'Awaiting Settlement');
  }, [sessions]);

  // Category summary counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      // 'All' previously counted status === 'Live' only, while every
      // other category counted 'Live' || 'Upcoming' - an inconsistency
      // that produced literally contradictory numbers with the real
      // current data: All showed 2, but the mutually-exclusive channel
      // categories (Bank Repossession + Direct Import + Fleet Clearance
      // + Dealer Clearance, which by definition can't overlap per
      // vehicle) summed to 3. Fixed to use the same Live-or-Upcoming
      // logic as every other category, so "All" is consistently the
      // superset again.
      'All': sessions.filter(s => s.status === 'Live' || s.status === 'Upcoming').length,
      'Bank Repossession': sessions.filter(s => s.category === 'Bank Repossession' && (s.status === 'Live' || s.status === 'Upcoming')).length,
      'Direct Import': sessions.filter(s => s.category === 'Direct Import' && (s.status === 'Live' || s.status === 'Upcoming')).length,
      'Fleet Clearance': sessions.filter(s => s.category === 'Fleet Clearance' && (s.status === 'Live' || s.status === 'Upcoming')).length,
      'Dealer Clearance': sessions.filter(s => s.category === 'Dealer Clearance' && (s.status === 'Live' || s.status === 'Upcoming')).length,
      'SUVs & 4x4s': sessions.filter(s => (s.vehicle.bodyStyle === 'SUV' || s.vehicleTitle.toLowerCase().includes('prado')) && (s.status === 'Live' || s.status === 'Upcoming')).length,
      'Luxury & Executive': sessions.filter(s => ['Mercedes-Benz', 'BMW', 'Audi', 'Lexus'].includes(s.vehicle.make) && (s.status === 'Live' || s.status === 'Upcoming')).length,
    };
    return counts;
  }, [sessions]);

  // Execute a bid function
  // Per-sale escrow override - sets/clears escrowOverride on this
  // specific session's vehicle. Updates BOTH the local sessions state
  // (so this page's own display reflects it immediately - the escrow
  // badges shown on cards and in this detail modal both read from
  // session.vehicle) AND calls onUpdateVehicleEscrowOverride to update
  // the app-level vehicles array (so VehicleCard/VehicleDetailModal
  // elsewhere in the app stay consistent too) - the same dual-update
  // consideration already necessary for price consistency between
  // these two independently-mutable state trees, applied here
  // deliberately rather than only fixing the local display.
  const handleSetEscrowOverride = (session: AuctionSession, override: 'enforce' | 'revoke' | null) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === session.id ? { ...s, vehicle: { ...s.vehicle, escrowOverride: override } } : s
      )
    );
    if (selectedSession?.id === session.id) {
      setSelectedSession({ ...session, vehicle: { ...session.vehicle, escrowOverride: override } });
    }
    onUpdateVehicleEscrowOverride?.(session.vehicle.id, override);
    const label = override === 'enforce' ? 'enforced' : override === 'revoke' ? 'revoked' : 'reset to default';
    showToast(`Escrow ${label} for "${session.vehicleTitle}"`, 'success');
  };

  // Fixed (Final Integration Phase 3 - real auction & bidding
  // integration): previously always showed "Bidding is disabled on
  // preview auctions" unconditionally - correct, honest behavior for
  // this component's own mock sessions (INITIAL_AUCTION_SESSIONS),
  // but it never actually attempted the real backend call even when
  // it could. Now genuinely connects to the real, canonical bid
  // endpoint (POST /api/bids/:id/bid, via services/bidApi.ts) when
  // this session's vehicleId matches a real, fetched vehicle (the
  // `vehicles` prop is real - App.tsx fetches it from the live
  // backend, this project's own earlier hardening work) - this
  // session's own presentation data (organizer info, etc.) may still
  // be from this component's own mock scaffolding, but the bid
  // request itself, its validation, and its persisted result are
  // 100% real and backend-authoritative whenever the target vehicle
  // is real. If the target isn't a real, fetched vehicle, this
  // correctly keeps the same honest "preview" message as before -
  // never simulates a bid client-side either way.
  const executeBid = async (session: AuctionSession, amount: number, bidder: string = 'Verified Bidder', location: string = 'Nairobi') => {
    void bidder;
    void location;

    const realVehicle = vehicles.find((v) => v.id === session.vehicleId);
    if (!realVehicle) {
      showToast('Bidding is disabled on preview auctions. Bid on live listings in the marketplace.', 'info');
      setCustomBidAmount('');
      return;
    }

    if (!user) {
      showToast('Please sign in to place a bid.', 'info');
      onOpenAuth?.();
      return;
    }

    try {
      const result = await placeBid(realVehicle.id, amount, user.phone || '');
      if (result.success) {
        showToast('Bid placed successfully.');
        setCustomBidAmount('');
      } else {
        // Real, unmodified backend rejection message - never replaced
        // with a generic or optimistic string.
        showToast(result.message || 'Bid was not accepted.', 'info');
      }
    } catch (err) {
      showToast(err instanceof BidApiError ? err.message : 'Failed to place bid. Please try again.', 'info');
    }
  };

  // Handle Subscribe Alert
  const handleNotifySubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyContact.trim()) return;
    setIsSubscribed(true);
    showToast(`Subscribed! We will notify ${notifyContact} when new live auctions launch.`);
  };

  return (
    <div className="space-y-10 relative bg-[#F5F2EB]/50 min-h-screen pb-16 font-sans">
      {/* Toast Notification Banner - icon and accent now branch on
          toast.type, which was already being passed in (3 call sites
          use 'info': removing a watchlist item, and 2 bid-validation
          rejections) but was never actually used - every toast
          unconditionally showed a green CheckCircle2, including for
          "Bid must be higher than current bid" and "Minimum bid
          increment is..." messages. A green success checkmark on a
          rejected-bid message is actively misleading, not just
          inconsistent - directly contradicts the spec's own concern
          about ambiguous bid-state messaging. */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 text-white px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 animate-fade-in ${
          toast.type === 'info' ? 'bg-[#1E3063] border-amber-400/30' : 'bg-[#1E3063] border-emerald-400/30'
        }`}>
          {toast.type === 'info' ? (
            <Info className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Clean Buyer-Focused Page Header */}
      <PageHeader
        variant="navy"
        badgeIcon={<Gavel className="w-4 h-4 text-amber-400" />}
        badgeText="Live Automotive Marketplace"
        title={auctionConfig.heroTitle}
        description={auctionConfig.heroDescription}
        rightElement={
          <div className="flex flex-wrap items-center gap-3">
            {isPageAdmin && (
              <button
                onClick={() => setShowAuctionAdminPanel(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold border border-white/20"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Customize Auction Page</span>
              </button>
            )}
            <div className="flex items-center gap-2 bg-[#101935]/60 px-3.5 py-2 rounded-xl border border-white/10 text-white text-xs">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
              </span>
              <span className="font-bold">{filteredLiveSessions.length} Active Auctions</span>
            </div>
            {isOrganizerCapable && (
              <>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsOrganizerDashboardOpen(true)}
                  className="border-amber-400/50 hover:bg-white/10 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-md cursor-pointer flex items-center gap-2 bg-[#101935]/80"
                >
                  <BarChart2 className="w-4 h-4 text-amber-300" />
                  <span>Organizer Dashboard</span>
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsOrganizerConsoleOpen(true)}
                  className="border-white/20 hover:bg-white/10 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Organizer Portal</span>
                </Button>
                <Button
                  variant={showInlineCreateForm ? 'primary' : 'accent'}
                  size="md"
                  onClick={() => setShowInlineCreateForm(prev => !prev)}
                  className="bg-amber-400 hover:bg-amber-500 text-[#17244B] font-extrabold text-xs px-4 py-2 rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Gavel className="w-4 h-4 text-[#17244B]" />
                  <span>{showInlineCreateForm ? 'Hide Creation Form' : 'Organize Auction Event'}</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">

        {/* INLINE AUCTION CREATION FORM COMPONENT - gated on
            isOrganizerCapable, not just its trigger button being hidden.
            showInlineCreateForm could theoretically still be true from a
            prior render (e.g. an admin toggled it, then something
            changed their session), so this is a real guard, not
            decoration - a non-organizer has no path to this form even
            if the state says it should show. */}
        {isOrganizerCapable && showInlineCreateForm && (
          <section id="auction-creation-form-section" className="animate-fade-in">
            <AuctionCreationForm
              availableVehicles={vehicles}
              onAuctionCreated={handleAuctionCreated}
              onCancel={() => setShowInlineCreateForm(false)}
              userRole={user?.role === 'admin' ? 'admin' : 'dealer'}
              isUserVerified={user?.isVerified ?? true}
            />
          </section>
        )}

        {/* ==================================================
            1. DEDICATED AUCTION SEARCH
            ================================================== */}
        {auctionConfig.sectionVisibility.searchFilters && (
        <section id="auction-search" className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/90 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-[#1E3063] uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-600" />
              <span>Auction Vehicle Search & Filters</span>
            </h2>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Primary Search Inputs Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
            {/* Search Keyword */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search by make, model, or keywords (e.g. Prado, Nissan, Repossession)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-[#F5F2EB]/40 font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
              />
            </div>

            {/* Category Select */}
            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-[#F5F2EB]/40 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
              >
                <option value="All">All Auction Channels</option>
                <option value="Bank Repossession">Bank Repossession</option>
                <option value="Direct Import">Direct Port Import</option>
                <option value="Fleet Clearance">Fleet Clearance</option>
                <option value="Dealer Clearance">Dealer Clearance</option>
                <option value="SUVs & 4x4s">SUVs & 4x4s</option>
                <option value="Luxury & Executive">Luxury & Executive</option>
              </select>
            </div>

            {/* Reserve Status Select */}
            <div className="md:col-span-2">
              <select
                value={reserveStatusFilter}
                onChange={(e) => setReserveStatusFilter(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-[#F5F2EB]/40 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
              >
                <option value="All">All Reserve Status</option>
                <option value="Reserve Met">Reserve Met</option>
                <option value="Reserve Unmet">Reserve Unmet</option>
              </select>
            </div>

            {/* Price Filter range */}
            <div className="md:col-span-2 flex items-center gap-1.5">
              <input
                type="number"
                placeholder="Min Ksh"
                value={minBidFilter}
                onChange={(e) => setMinBidFilter(e.target.value)}
                className="w-1/2 p-2.5 rounded-xl border border-slate-200 bg-[#F5F2EB]/40 font-medium text-slate-800 text-[11px] focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="number"
                placeholder="Max Ksh"
                value={maxBidFilter}
                onChange={(e) => setMaxBidFilter(e.target.value)}
                className="w-1/2 p-2.5 rounded-xl border border-slate-200 bg-[#F5F2EB]/40 font-medium text-slate-800 text-[11px] focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
              />
            </div>
          </div>

          {/* Quick Filter Toggle Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-[10px] font-bold text-[#1E3063] uppercase tracking-wider">Quick Filters:</span>
            
            <button
              onClick={() => setFilterEndingSoon(!filterEndingSoon)}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                filterEndingSoon
                  ? 'bg-amber-400 text-[#17244B] shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Ending Soon (&lt; 24h)</span>
            </button>

            <button
              onClick={() => setFilterBuyNow(!filterBuyNow)}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                filterBuyNow
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Buy Now Available</span>
            </button>

            <button
              onClick={() => setFilterVerified(!filterVerified)}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                filterVerified
                  ? 'bg-[#1E3063] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>150-Point Verified</span>
            </button>
          </div>
        </section>
        )}


        {/* ==================================================
            2. AUCTION CATEGORIES
            ================================================== */}
        {auctionConfig.sectionVisibility.categories && (
        <section id="auction-categories" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-600" />
              <span>Auction Categories</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">Select a category to filter listings</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
            {[
              { id: 'All', label: 'All Listings', icon: Gavel, count: categoryCounts['All'] },
              { id: 'Bank Repossession', label: 'Bank Repossessions', icon: LandmarkIcon, count: categoryCounts['Bank Repossession'] },
              { id: 'Direct Import', label: 'Direct Imports', icon: DirectImportIcon, count: categoryCounts['Direct Import'] },
              { id: 'Fleet Clearance', label: 'Fleet Clearance', icon: FleetIcon, count: categoryCounts['Fleet Clearance'] },
              { id: 'Dealer Clearance', label: 'Dealer Clearance', icon: DealerIcon, count: categoryCounts['Dealer Clearance'] },
              { id: 'SUVs & 4x4s', label: 'SUVs & 4x4s', icon: SUVIcon, count: categoryCounts['SUVs & 4x4s'] },
              { id: 'Luxury & Executive', label: 'Luxury Cars', icon: LuxuryIcon, count: categoryCounts['Luxury & Executive'] },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#1E3063] text-white border-[#1E3063] shadow-md'
                      : 'bg-white text-slate-800 border-slate-200/80 hover:border-[#1E3063]/40 hover:bg-[#F5F2EB]/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-300' : 'text-[#1E3063]'}`} />
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {cat.count}
                    </span>
                  </div>
                  <span className="text-xs font-bold mt-2 line-clamp-1">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </section>
        )}


        {/* ==================================================
            3. LIVE AUCTIONS (only when active)
            ================================================== */}
        {auctionConfig.sectionVisibility.liveBidding && (
        <section id="live-auctions" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
              </span>
              <h2 className="text-lg font-black text-[#1E3063] font-display flex items-center gap-2">
                Live Bidding Events
              </h2>
            </div>
            <span className="text-xs text-slate-600 font-semibold">
              Showing {filteredLiveSessions.length} active live auctions
            </span>
          </div>

          {filteredLiveSessions.length > 0 ? (
            /* ACTIVE LIVE AUCTION CARDS GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredLiveSessions.map((session) => {
                const vehicle = session.vehicle;
                const timeObj = formatTimeRemaining(session.endsAt);
                const isWatched = watchedIds.includes(session.id);

                return (
                  <Card 
                    key={session.id} 
                    className="flex flex-col justify-between overflow-hidden hover:border-[#1E3063]/40 transition-all shadow-2xs hover:shadow-md bg-white rounded-2xl border border-slate-200"
                  >
                    <div>
                      {/* Vehicle Image Container */}
                      <div 
                        className="relative h-60 cursor-pointer overflow-hidden bg-slate-100 group"
                        onClick={() => openLot(session)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openLot(session);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`View full details for ${session.vehicleTitle}`}
                      >
                        <LazyImage 
                          src={vehicle.image} 
                          alt={session.vehicleTitle} 
                          wrapperClassName="w-full h-full" 
                          className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500" 
                        />

                        {/* Top Overlay Badges - MAX THREE STATUS BADGES */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Badge 1: Live Status in Coral Red */}
                            <Badge variant="live" size="sm" className="bg-amber-400 text-[#17244B] border-none font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                              <span>LIVE</span>
                            </Badge>

                            {/* Badge 2: Channel Category */}
                            <Badge variant="neutral" size="sm" className="bg-white/95 text-[#1E3063] font-bold shadow-2xs">
                              {session.category}
                            </Badge>

                            {/* Badge 3: Reserve Status */}
                            {session.reserveMet ? (
                              <Badge variant="success" size="sm" className="bg-emerald-600 text-white font-bold border-none shadow-2xs">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Reserve Met</span>
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm" className="bg-slate-900/80 text-white font-medium backdrop-blur-xs">
                                <span>Reserve Unmet</span>
                              </Badge>
                            )}
                          </div>

                          {/* Watch Auction Toggle Button */}
                          <button
                            onClick={(e) => toggleWatchSession(session.id, session.vehicleTitle, e)}
                            className={`p-2 rounded-full backdrop-blur-md transition-all pointer-events-auto cursor-pointer shadow-sm ${
                              isWatched
                                ? 'bg-amber-400 text-[#17244B]'
                                : 'bg-white/90 text-slate-700 hover:text-amber-600 hover:bg-white'
                            }`}
                            title={isWatched ? 'Remove from Watchlist' : 'Watch Auction'}
                          >
                            <Heart className={`w-4 h-4 ${isWatched ? 'fill-current' : ''}`} />
                          </button>
                        </div>

                        {/* Dynamic Time Remaining Bar */}
                        <div className="absolute bottom-3 left-3 right-3 bg-[#101935]/85 backdrop-blur-md px-3.5 py-2 rounded-xl text-white flex items-center justify-between text-xs pointer-events-none z-10">
                          <span className="text-slate-300 text-[11px] font-medium flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 ${timeObj.isUrgent ? 'text-rose-400' : 'text-slate-300'}`} />
                            Time Remaining:
                          </span>
                          <span className={`font-mono font-bold text-xs ${timeObj.isUrgent ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                            {timeObj.formatted}
                          </span>
                        </div>
                      </div>

                      {/* Card Content Details */}
                      <div className="p-5 space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                            <span>{session.sellerType} • {vehicle.county}</span>
                            <span className="text-slate-700 font-extrabold">{session.totalBidsCount} Bids</span>
                          </div>
                          {/* Escrow eligibility - added per the same rule
                              already established for VehicleCard: not
                              time-sensitive, so it belongs in the card
                              body, not competing for space on the image
                              (which already caps at 3 status badges).
                              Uses the same isEscrowApplicable check as
                              the rest of the app (mandatory for private
                              sellers, only when explicitly enabled for
                              dealers) rather than a blanket claim - the
                              hero copy above now says "look for the
                              badge on each auction", so this needed to
                              actually exist, not just be implied. */}
                          {isEscrowApplicable(vehicle) && (
                            <div className="flex items-center gap-1 mt-1">
                              <Lock className="w-3 h-3 text-emerald-600" />
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Escrow Protected</span>
                            </div>
                          )}
                          <h3 
                            className="text-lg font-black text-[#1E3063] font-display mt-1 hover:text-amber-600 cursor-pointer transition-colors line-clamp-1"
                            onClick={() => openLot(session)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openLot(session);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            {session.vehicleTitle}
                          </h3>
                        </div>

                        {/* Primary Focal Point: Current Bid Block */}
                        <div className="p-4 bg-[#F5F2EB]/70 rounded-xl border border-slate-200/80 flex items-baseline justify-between">
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Bid</p>
                            <p className="text-2xl font-black text-[#1E3063] font-display mt-0.5">
                              Ksh {(session.currentBid ?? 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Reserve Status</p>
                            <p className={`text-xs font-extrabold mt-1 flex items-center justify-end gap-1 ${session.reserveMet ? 'text-emerald-700' : 'text-slate-600'}`}>
                              {session.reserveMet ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>Reserve Met</span>
                                </>
                              ) : (
                                <span>Reserve: Ksh {(session.reservePrice ?? 0).toLocaleString()}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="p-5 pt-0 space-y-2">
                      {/* Bidder Pass Status Indicator */}
                      {verifiedBiddersMap[session.id] ? (
                        <div className="flex items-center justify-between text-[11px] p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-bold">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Verified Bidder
                          </span>
                          <span className="text-[10px] text-emerald-700">Ready to Bid</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 font-medium">
                          <span className="flex items-center gap-1 text-slate-700 font-bold">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            Bidder Pass Required
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleOpenRegistration(session, e)}
                            className="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-0.5"
                          >
                            <span>Register Deposit</span>
                            <ChevronRight className="w-3 h-3 shrink-0" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleOpenPreInspection(session, e)}
                          className="text-xs font-bold border-slate-300 text-[#1E3063] hover:bg-[#F5F2EB]"
                          title="View physical inspection details or book mechanic"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          <span>Inspect</span>
                        </Button>

                        {session.buyoutPrice && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onStartEscrow(vehicle)}
                            className="text-xs font-bold border-slate-300 text-[#1E3063] hover:bg-[#F5F2EB]"
                          >
                            <Lock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Buy: {(session.buyoutPrice / 1000000).toFixed(2)}M</span>
                          </Button>
                        )}

                        <Button
                          variant="primary"
                          size="md"
                          onClick={(e) => handleOpenLiveRoom(session, e)}
                          className="bg-[#1E3063] hover:bg-[#17244B] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex-1 justify-center shadow-xs hover:shadow-md transition-all"
                        >
                          <Gavel className="w-4 h-4 text-amber-300 animate-pulse" />
                          <span>{verifiedBiddersMap[session.id] ? 'Enter Live Auction Room' : 'Live Auction Room'}</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* ==================================================
               NO LIVE AUCTIONS FALLBACK BLOCK
               ================================================== */
            <div className="space-y-6">
              <Card className="p-8 text-center bg-white space-y-4 border border-slate-200/90 shadow-xs rounded-2xl">
                <div className="w-14 h-14 rounded-full bg-[#F5F2EB] text-[#1E3063] flex items-center justify-center mx-auto">
                  <Gavel className="w-7 h-7 stroke-[1.75] text-amber-600" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-xl font-black text-[#1E3063]">No Live Auctions Active Right Now</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    No bidding sessions match your filter criteria or the live auction window is currently closed. Subscribe below for instant alerts when the next auction launches.
                  </p>
                </div>

                {/* Next Auction Date Banner - previously a hardcoded
                    "Wednesday, Aug 5, 2026", already in the past by the
                    time this was actually tested (the same stale-date
                    bug class found and fixed several times elsewhere in
                    this auction ecosystem this session). Computed as
                    the real next Wednesday from today instead, so the
                    weekday label and the date always genuinely match
                    each other (not just a fixed day-offset, which could
                    drift the two out of sync) and this can't go stale
                    regardless of when the app is loaded. */}
                <div className="inline-flex items-center gap-2 bg-[#F5F2EB] px-4 py-2 rounded-xl text-xs font-bold text-[#1E3063] border border-slate-200">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>Next Live Event: {nextWednesdayLabel} at 09:00 EAT</span>
                </div>

                {/* Notify Me Subscription Form */}
                <form onSubmit={handleNotifySubscribe} className="max-w-md mx-auto pt-2 flex items-center gap-2">
                  <Input
                    placeholder="Enter email or phone number"
                    value={notifyContact}
                    onChange={(e) => setNotifyContact(e.target.value)}
                    required
                    className="text-xs"
                  />
                  <Button
                    type="submit"
                    variant="accent"
                    size="md"
                    className="bg-amber-400 hover:bg-amber-500 text-[#17244B] font-bold text-xs shrink-0"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Notify Me</span>
                  </Button>
                </form>
                {isSubscribed && (
                  <p className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1 pt-1">
                    <Check className="w-4 h-4" /> You're subscribed for live auction alerts!
                  </p>
                )}
              </Card>
            </div>
          )}
        </section>
        )}

        {/* Admin-configured advert/sponsor card - reuses the same
            MarketingCard component built for the home page grid, for
            visual consistency between the 2 places sponsor content
            appears. Its label/icon/accentColor aren't part of the
            admin-editable config (kept simple: name/tagline/CTA only) -
            fixed here to a Gavel icon and the established navy accent,
            matching this page's own auction theme. */}
        {auctionConfig.sectionVisibility.advertCard && (
          <div className="max-w-sm">
            <MarketingCard
              data={{
                id: 'auction-page-advert',
                label: isValidAdvertLabel(auctionConfig.advertCard.label) ? auctionConfig.advertCard.label : 'Sponsored',
                category: 'Auction Partner',
                name: auctionConfig.advertCard.name,
                tagline: auctionConfig.advertCard.tagline,
                ctaLabel: auctionConfig.advertCard.ctaLabel,
                icon: Gavel,
                accentColor: '#1E3063',
              }}
            />
          </div>
        )}

        {/* ==================================================
            4. ENDING SOON (< 24 Hours)
            ================================================== */}
        {auctionConfig.sectionVisibility.endingSoon && (
        <section id="ending-soon" className="space-y-4 pt-4 border-t border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                <Zap className="w-4 h-4 text-rose-500" />
                <span>Ending Soon</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Auctions ending within the next 24 hours — sorted automatically by remaining time</p>
            </div>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
              {endingSoonSessions.length} Closing Soon
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {endingSoonSessions.map((session) => {
              const timeObj = formatTimeRemaining(session.endsAt);
              return (
                <Card key={session.id} className="p-4 flex flex-col sm:flex-row gap-4 bg-white border border-slate-200/90 hover:border-[#1E3063]/40 transition-all rounded-2xl">
                  <LazyImage
                    src={session.vehicle.image}
                    alt={session.vehicleTitle}
                    wrapperClassName="w-full sm:w-36 h-32 rounded-xl overflow-hidden shrink-0"
                    className="w-full h-full object-cover"
                  />
                  <div className="flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-[11px]">
                        <Badge variant="neutral" size="sm" className="bg-[#F5F2EB] text-[#1E3063] font-bold">
                          {session.category}
                        </Badge>
                        <span className="font-mono font-extrabold text-rose-500 animate-pulse flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeObj.formatted}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-[#1E3063] mt-1.5 line-clamp-1">{session.vehicleTitle}</h3>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">
                        Current Bid: <span className="text-[#1E3063] font-black text-sm">Ksh {(session.currentBid ?? 0).toLocaleString()}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500">{session.totalBidsCount} Bids</span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          openLot(session);
                          setModalTab('bid');
                        }}
                        className="bg-[#1E3063] hover:bg-[#17244B] text-white font-bold text-xs py-1.5 px-3"
                      >
                        Bid Now
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
        )}


        {/* ==================================================
            5. UPCOMING AUCTIONS
            ================================================== */}
        {auctionConfig.sectionVisibility.upcoming && (
        <section id="upcoming-auctions" className="space-y-4 pt-4 border-t border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1E3063]" />
                <span>Upcoming Auction Catalogue</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Scheduled bidding sessions opening soon</p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              {upcomingSessions.length} Scheduled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingSessions.map((session) => (
              <Card key={session.id} className="p-4 flex gap-4 bg-white border border-slate-200/90 rounded-2xl hover:border-slate-300 transition-all">
                <LazyImage
                  src={session.vehicle.image}
                  alt={session.vehicleTitle}
                  wrapperClassName="w-32 h-28 rounded-xl overflow-hidden shrink-0"
                  className="w-full h-full object-cover"
                />
                <div className="flex-1 flex flex-col justify-between space-y-1">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#1E3063] uppercase tracking-wider bg-[#F5F2EB] px-2 py-0.5 rounded">
                      Starts: {new Date(session.startsAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <h3 className="text-sm font-bold text-[#1E3063] line-clamp-1 mt-1">{session.vehicleTitle}</h3>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">Starting Bid: Ksh {(session.startingPrice ?? (session as any).startingBid ?? 0).toLocaleString()}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      openLot(session);
                      setModalTab('bid');
                    }}
                    className="text-xs font-bold text-[#1E3063] border-slate-200 self-start py-1 px-3 h-auto"
                  >
                    View Schedule & Terms
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
        )}


        {/* ==================================================
            6. RECENTLY SOLD
            ================================================== */}
        {auctionConfig.sectionVisibility.recentlySold && (
        <section id="recently-sold" className="space-y-4 pt-4 border-t border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                <span>Recently Sold</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Verified winning bids and completed logbook transfers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentlySoldSessions.map((session) => (
              <Card key={session.id} className="p-4 flex gap-4 bg-white border border-slate-200/80 rounded-2xl opacity-95">
                <LazyImage
                  src={session.vehicle.image}
                  alt={session.vehicleTitle}
                  wrapperClassName="w-28 h-24 rounded-xl overflow-hidden shrink-0 grayscale opacity-90"
                  className="w-full h-full object-cover"
                />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      {/* Branches on the real status now that
                          'Awaiting Settlement' sessions are actually
                          reachable at runtime (the new auto-conclude
                          effect above produces them) - this badge
                          previously hardcoded "SOLD & SETTLED" for
                          every session in this list regardless of
                          status, which would have been directly wrong
                          the moment a live auction's timer expired and
                          landed here still awaiting escrow/settlement,
                          not yet actually settled. */}
                      {session.status === 'Ended' ? (
                        <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-0.5 w-fit">
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                          <span>SOLD & SETTLED</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-0.5 w-fit">
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          <span>Awaiting Settlement</span>
                        </span>
                      )}
                      {/* Was a single, blanket "100% Escrow Protected"
                          badge for the whole section - found it was
                          actually wrong for this specific vehicle
                          (Coastline Auto Ltd's Subaru, escrowEligible:
                          false in the underlying data). A section-level
                          claim can't be accurate once the list has more
                          than one vehicle with different eligibility,
                          so moved to a real per-card check instead. */}
                      {isEscrowApplicable(session.vehicle) && (
                        <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Escrow
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-[#1E3063] line-clamp-1 mt-1">{session.vehicleTitle}</h3>
                    <p className="text-xs font-black text-emerald-700 mt-0.5">Winning Bid: Ksh {(session.currentBid ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 mt-1">
                    <span>{session.totalBidsCount} Total Bids</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleOpenCompletion(session, undefined, session.currentBid, e)}
                      className="text-[10px] font-extrabold text-[#1E3063] border-[#1E3063]/30 hover:bg-[#1E3063] hover:text-white px-2 py-1 h-auto"
                    >
                      <Award className="w-3 h-3 mr-1 text-amber-500" />
                      <span>Winning Certificate</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
        )}


        {/* ==================================================
            7. AUCTION PROCESS (SIMPLE VISUAL TIMELINE)
            ================================================== */}
        {auctionConfig.sectionVisibility.howItWorks && (
        <section id="auction-process" className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/90 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h2 className="text-lg font-black text-[#1E3063] font-display">
              How KAYAD Vehicle Auctions Work
            </h2>
            <p className="text-xs text-slate-500">
              Simple 6-step transparent process from discovery to driving away safely
            </p>
          </div>

          {/* Visual Timeline Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 relative">
            {[
              { step: '1', title: 'Register', desc: 'Verify identity & setup profile', icon: UserCheck },
              { step: '2', title: 'Place Bid', desc: 'Real-time competitive bidding', icon: Gavel },
              { step: '3', title: 'Win Auction', desc: 'Highest bidder at timer zero', icon: Sparkles },
              { step: '4', title: 'Escrow Payment', desc: 'Funds secured in Escrow Vault', icon: Lock },
              { step: '5', title: 'Ownership Transfer', desc: 'NTSA logbook title verification', icon: FileText },
              { step: '6', title: 'Vehicle Collection', desc: 'Inspected handover & keys', icon: CheckCircle2 },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="p-3.5 bg-[#F5F2EB]/60 rounded-xl border border-slate-200/80 text-center space-y-2 flex flex-col justify-between relative group hover:bg-[#1E3063] hover:text-white transition-all">
                  <div className="w-8 h-8 rounded-full bg-[#1E3063] text-white flex items-center justify-center font-bold text-xs mx-auto group-hover:bg-amber-400 group-hover:text-[#1E3063] transition-colors">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#1E3063] group-hover:text-white transition-colors">{item.title}</h3>
                    <p className="text-[10px] text-slate-500 group-hover:text-slate-200 mt-1 leading-tight">{item.desc}</p>
                  </div>
                  <Icon className="w-4 h-4 mx-auto text-slate-400 group-hover:text-amber-300 transition-colors" />
                </div>
              );
            })}
          </div>
        </section>
        )}


        {/* ==================================================
            8. FOOTER ANCHOR
            ================================================== */}
        <footer className="pt-6 border-t border-slate-200/80 text-center text-xs text-slate-500 space-y-1">
          <p className="font-bold text-[#1E3063]">KAYAD Vehicle Auction Marketplace</p>
          <p className="text-[11px] text-slate-400">All vehicle auctions are subject to verified technical inspection and logbook title clearance.</p>
        </footer>

      </div>


      {/* ==================================================
          COMPREHENSIVE AUCTION DETAILS & BID MODAL
          ================================================== */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-[#101935]/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <Card className="max-w-3xl w-full p-6 space-y-5 bg-white relative max-h-[92vh] overflow-y-auto rounded-2xl border-none shadow-2xl">
            <button
              onClick={() => closeLot()}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="live" size="sm" className="bg-amber-400 text-[#17244B] border-none font-bold">
                  {selectedSession.status === 'Live' ? 'LIVE AUCTION' : selectedSession.status.toUpperCase()}
                </Badge>
                <Badge variant="neutral" size="sm" className="bg-[#F5F2EB] text-[#1E3063] font-semibold">
                  {selectedSession.category}
                </Badge>
              </div>
              <h3 className="text-2xl font-black text-[#1E3063] font-display mt-1">
                {selectedSession.vehicleTitle}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Session ID: {selectedSession.id} • {selectedSession.sellerType}</p>
            </div>

            {/* Modal Tabs: Bid, History, Inspection, Terms */}
            <div className="flex border-b border-slate-200 text-xs font-bold text-slate-600 gap-1 overflow-x-auto">
              {[
                { id: 'bid', label: 'Bidding & Buyout', icon: Gavel },
                { id: 'history', label: `Bid Log (${selectedSession.totalBidsCount})`, icon: History },
                { id: 'inspection', label: '150-Point Inspection', icon: ShieldCheck },
                { id: 'terms', label: 'Escrow & Legal Terms', icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = modalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id as any)}
                    className={`px-4 py-2.5 border-b-2 font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      isActive 
                        ? 'border-[#1E3063] text-[#1E3063] bg-[#F5F2EB]/50' 
                        : 'border-transparent hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: BIDDING & BUYOUT CONTROLS */}
            {modalTab === 'bid' && (() => {
              const verifiedPass = verifiedBiddersMap[selectedSession.id];
              const depositAmount = selectedSession.bidSecurityAmount || 50000;

              return (
                <div className="space-y-5 text-xs">
                  {/* Per-sale escrow override - admin only. Escrow
                      shouldn't be unconditionally mandatory for every
                      private-seller sale by blanket rule alone; this
                      lets an admin enforce or revoke it for this
                      specific vehicle/sale, independent of (and taking
                      precedence over) the global seller-type rule in
                      Escrow Rules Config. Shows the vehicle's actual
                      current seller type and its resulting DEFAULT
                      requirement (from the global config) alongside the
                      override controls, so an admin isn't guessing what
                      they're overriding away from. */}
                  {isPageAdmin && (
                    <div className="p-3 bg-[#F5F2EB] rounded-xl border border-slate-300 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#1E3063]" />
                          Admin: Per-Sale Escrow Override
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {selectedSession.vehicle.escrowOverride === 'enforce' ? 'Enforced for this sale' :
                           selectedSession.vehicle.escrowOverride === 'revoke' ? 'Revoked for this sale' :
                           'Using default rule'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetEscrowOverride(selectedSession, 'enforce')}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition-all ${
                            selectedSession.vehicle.escrowOverride === 'enforce'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          Enforce Escrow
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetEscrowOverride(selectedSession, 'revoke')}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition-all ${
                            selectedSession.vehicle.escrowOverride === 'revoke'
                              ? 'bg-rose-600 text-white'
                              : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50'
                          }`}
                        >
                          Revoke Escrow
                        </button>
                        {selectedSession.vehicle.escrowOverride && (
                          <button
                            type="button"
                            onClick={() => handleSetEscrowOverride(selectedSession, null)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-extrabold bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* VERIFICATION PASS BANNER OR REGISTRATION GATE */}
                  {verifiedPass ? (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300 flex items-start justify-between gap-3 shadow-2xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="success" size="sm" className="bg-emerald-600 text-white font-extrabold text-[10px]">
                            VERIFIED BIDDER PASS ACTIVE
                          </Badge>
                          <span className="font-mono font-black text-[#1E3063] text-sm">{verifiedPass.bidderNumber}</span>
                        </div>
                        <p className="text-[#1E3063] text-xs font-semibold">
                          Organizer Deposit Verified (Ksh {verifiedPass.depositAmount.toLocaleString()} • Ref: {verifiedPass.paymentReference}).
                        </p>
                        <p className="text-slate-500 text-[11px] flex items-center gap-1">
                          <EyeOff className="w-3.5 h-3.5 text-emerald-700" />
                          Your real identity remains hidden from other participants in the bidding room.
                        </p>
                      </div>
                      <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
                    </div>
                  ) : (
                    <div className="p-5 bg-[#101935] text-white rounded-2xl border border-amber-400/40 shadow-md space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Accreditation Required</span>
                            <Badge variant="neutral" size="sm" className="bg-white/10 text-slate-200 text-[10px]">
                              Deposit: Ksh {depositAmount.toLocaleString()}
                            </Badge>
                          </div>
                          <h4 className="text-base font-black text-white font-display">Only Verified & Qualified Bidders May Enter</h4>
                        </div>
                        <Lock className="w-6 h-6 text-amber-400 shrink-0" />
                      </div>

                      <p className="text-slate-300 text-xs leading-relaxed">
                        To maintain auction integrity and prevent speculative bidding, this room requires a verified bidder registration and security deposit paid directly to <strong>{selectedSession.sellerName}</strong>.
                      </p>

                      {/* 6-step flow overview */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-1 text-[11px]">
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">1. Read Rules</div>
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">2. Identity KYC</div>
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">3. Accept Terms</div>
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">4. Pay Deposit</div>
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">5. Verify Receipt</div>
                        <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30 font-bold">6. Alias Pass</div>
                      </div>

                      <Button
                        type="button"
                        variant="accent"
                        size="md"
                        fullWidth
                        onClick={(e) => handleOpenRegistration(selectedSession, e)}
                        className="bg-amber-400 hover:bg-amber-500 text-[#17244B] font-black text-xs py-3 rounded-xl cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4 mr-2 text-amber-200" />
                        <span>Start Bidder Registration & Access Pass</span>
                      </Button>
                    </div>
                  )}

                  {/* Price Highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#F5F2EB]/70 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Highest Bid</p>
                      <p className="text-3xl font-black text-[#1E3063] font-display mt-0.5">
                        Ksh {(selectedSession.currentBid ?? 0).toLocaleString()}
                      </p>
                      <p className={`text-xs font-extrabold mt-1 flex items-center gap-1 ${selectedSession.reserveMet ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {selectedSession.reserveMet ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Reserve Met (Highest Bid Wins)</span>
                          </>
                        ) : (
                          <span>Reserve Price: Ksh {(selectedSession.reservePrice ?? 0).toLocaleString()}</span>
                        )}
                      </p>
                    </div>

                    {selectedSession.buyoutPrice && (
                      <div className="border-t sm:border-t-0 sm:border-l border-slate-300 pt-3 sm:pt-0 sm:pl-4">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Instant Buyout Price</p>
                        <p className="text-2xl font-bold text-slate-800 font-display mt-0.5">
                          Ksh {(selectedSession.buyoutPrice ?? 0).toLocaleString()}
                        </p>
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => {
                            closeLot();
                            onStartEscrow(selectedSession.vehicle);
                          }}
                          className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-3 w-full"
                        >
                          <Lock className="w-3.5 h-3.5" /> Buy Instantly via Escrow
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Quick Bid Increments - Available ONLY for Verified Bidders */}
                  {selectedSession.status === 'Live' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-700">Quick Bid Increments:</p>
                        {!verifiedPass && (
                          <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Requires Bidder Registration</span>
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          selectedSession.minimumIncrement,
                          selectedSession.minimumIncrement * 2,
                          selectedSession.minimumIncrement * 4
                        ].map((inc) => {
                          const targetVal = selectedSession.currentBid + inc;
                          return (
                            <button
                              key={inc}
                              disabled={!verifiedPass}
                              onClick={() => {
                                if (!verifiedPass) {
                                  handleOpenRegistration(selectedSession);
                                  return;
                                }
                                executeBid(
                                  selectedSession, 
                                  targetVal, 
                                  verifiedPass.anonymousAlias, 
                                  bidderLocation
                                );
                              }}
                              className={`p-3 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs ${
                                verifiedPass
                                  ? 'bg-white hover:bg-[#1E3063] hover:text-white border border-slate-200 text-[#1E3063]'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-75'
                              }`}
                            >
                              +Ksh {(inc / 1000).toFixed(0)}k
                              <span className="block text-[10px] opacity-75 font-normal">Ksh {(targetVal ?? 0).toLocaleString()}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Custom Bid Input Form */}
                  {selectedSession.status === 'Live' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!verifiedPass) {
                          handleOpenRegistration(selectedSession);
                          return;
                        }
                        executeBid(
                          selectedSession, 
                          Number(customBidAmount), 
                          verifiedPass.anonymousAlias, 
                          bidderLocation
                        );
                      }}
                      className="p-4 bg-white rounded-xl border border-slate-200 space-y-3"
                    >
                      <p className="font-bold text-[#1E3063]">Place Custom Bid Amount:</p>
                      <div className="space-y-1">
                        <Input
                          type="number"
                          value={customBidAmount}
                          disabled={!verifiedPass}
                          onChange={(e) => setCustomBidAmount(e.target.value)}
                          placeholder={verifiedPass ? `Minimum bid Ksh ${((selectedSession.currentBid ?? 0) + (selectedSession.minimumIncrement ?? 10000)).toLocaleString()}` : "Register to unlock custom bid entry"}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          placeholder="Public Bidding Identity"
                          value={verifiedPass ? verifiedPass.anonymousAlias : 'Registration Required'}
                          disabled
                          className="bg-slate-50 font-mono font-bold text-[#1E3063]"
                        />
                        <Input
                          placeholder="Location (e.g. Nairobi)"
                          value={bidderLocation}
                          disabled={!verifiedPass}
                          onChange={(e) => setBidderLocation(e.target.value)}
                          required
                        />
                      </div>

                      {verifiedPass ? (
                        <Button
                          type="submit"
                          variant="primary"
                          size="md"
                          fullWidth
                          className="bg-[#1E3063] hover:bg-[#17244B] text-white font-bold"
                        >
                          <TrendingUp className="w-4 h-4" />
                          <span>Confirm & Place Bid as {verifiedPass.bidderNumber}</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="accent"
                          size="md"
                          fullWidth
                          onClick={() => handleOpenRegistration(selectedSession)}
                          className="bg-amber-400 hover:bg-amber-500 text-[#17244B] font-bold"
                        >
                          <UserPlus className="w-4 h-4 mr-1.5" />
                          <span>Complete Registration to Bid</span>
                        </Button>
                      )}
                    </form>
                  )}
                </div>
              );
            })()}

            {/* TAB 2: CHRONOLOGICAL BID HISTORY LOG */}
            {modalTab === 'history' && (
              <div className="space-y-3 text-xs">
                <p className="font-bold text-slate-700 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-500" />
                  Chronological Bid Audit Trail:
                </p>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedSession.bidHistory.length === 0 ? (
                    <p className="p-4 text-slate-400 text-center">No bids recorded yet for this session.</p>
                  ) : (
                    selectedSession.bidHistory.map((bid, idx) => (
                      <div key={bid.id || idx} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-bold text-[#1E3063]">{bid.bidderName} <span className="text-slate-400 font-normal">({bid.bidderLocation})</span></p>
                          <p className="text-[10px] text-slate-400">{bid.timestamp}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-slate-900">Ksh {(bid.amount ?? 0).toLocaleString()}</p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            idx === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {idx === 0 ? 'Highest Bidder' : 'Outbid'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: PRE-AUCTION VEHICLE INSPECTION PORTAL */}
            {modalTab === 'inspection' && (
              <div className="space-y-4 text-xs">
                {/* KAYAD Mechanic Disclaimer Header */}
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-amber-900">Pre-Auction Verification & Mechanic Marketplace</p>
                    <p className="text-amber-800 text-[11px] leading-relaxed">
                      Every bidder has the right to inspect before placing bids. KAYAD does not perform inspections directly — independent certified mechanics on the Mechanic Marketplace provide on-site inspections.
                    </p>
                  </div>
                </div>

                {/* Core Inspection Options Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenPreInspection(selectedSession)}
                    className="p-3.5 bg-[#1E3063]/5 hover:bg-[#1E3063]/10 border border-[#1E3063]/20 rounded-xl text-left space-y-1 transition-all cursor-pointer"
                  >
                    <span className="font-black text-[#1E3063] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      1. Physical Viewing
                    </span>
                    <p className="text-[11px] text-slate-600">
                      {selectedSession.viewingDates || 'Mon-Sat 8:30 AM - 4:30 PM'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenPreInspection(selectedSession)}
                    className="p-3.5 bg-[#1E3063]/5 hover:bg-[#1E3063]/10 border border-[#1E3063]/20 rounded-xl text-left space-y-1 transition-all cursor-pointer"
                  >
                    <span className="font-black text-[#1E3063] flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-amber-600" />
                      2. Book Mechanic
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Vetted Marketplace Inspectors (Ksh 3,500+)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenPreInspection(selectedSession)}
                    className="p-3.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl text-left space-y-1 transition-all cursor-pointer"
                  >
                    <span className="font-black text-emerald-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-700" />
                      3. Digital Report
                    </span>
                    <p className="text-[11px] text-emerald-800">
                      View/Download 150-Point Certified Diagnostic PDF
                    </p>
                  </button>
                </div>

                {/* Highlight Summary Card */}
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-emerald-900">150-Point Certified Pre-Auction Diagnostic Completed</p>
                    <p className="text-emerald-800 text-[11px]">
                      This vehicle underwent a complete physical diagnostic evaluation covering engine compression, transmission fluid analysis, chassis integrity, and digital OBD-II scanning.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Engine Health</p>
                    <p className="font-bold text-[#1E3063] text-sm mt-0.5">Grade A (96%)</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Chassis & Frame</p>
                    <p className="font-bold text-[#1E3063] text-sm mt-0.5">Zero Accident Structural</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">OBD-II Scan</p>
                    <p className="font-bold text-emerald-700 text-sm mt-0.5">No Error Codes</p>
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handleOpenPreInspection(selectedSession)}
                    className="w-full bg-[#1E3063] hover:bg-[#17244B] text-white font-extrabold text-xs py-2.5"
                  >
                    <Wrench className="w-4 h-4 mr-2 text-amber-300" />
                    <span>Open Pre-Auction Inspection & Booking Hub</span>
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 4: ESCROW WORKFLOW & TERMS & BID SECURITY */}
            {modalTab === 'terms' && (
              <div className="space-y-4 text-xs">
                {/* KAYAD Technology Provider Disclaimer Notice */}
                <div className="p-3.5 bg-[#F5F2EB] rounded-xl border border-slate-200/90 flex items-start gap-3">
                  <Info className="w-4 h-4 text-[#1E3063] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-[#1E3063]">KAYAD Marketplace Platform Architecture</p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      KAYAD is a marketplace technology provider and does not conduct or hold auctions directly. Bidding sessions are configured and executed by verified dealers, licensed auctioneers, banks, and fleet custodians.
                    </p>
                  </div>
                </div>

                {/* Organizer Accreditation */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#1E3063] flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-600" /> Event Organizer & Custodian
                    </span>
                    <Badge variant="neutral" size="sm" className="bg-[#1E3063] text-white font-bold">
                      {selectedSession.organizerType || selectedSession.sellerType}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700 pt-1">
                    <div><span className="font-bold">Organizer:</span> {selectedSession.sellerName}</div>
                    <div><span className="font-bold">Category:</span> {selectedSession.category}</div>
                    <div><span className="font-bold">Viewing Dates:</span> {selectedSession.viewingDates || 'Mon-Fri 9:00 AM - 4:00 PM'}</div>
                    <div><span className="font-bold">Viewing Location:</span> {selectedSession.viewingLocation || selectedSession.vehicle.location}</div>
                  </div>
                </div>

                {/* Bid Security Deposit Section */}
                <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" /> Mandatory Bid Security Deposit
                    </span>
                    <span className="font-mono font-black text-emerald-800 text-sm">
                      Ksh {(selectedSession.bidSecurityAmount || 50000).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] leading-relaxed font-medium">
                    <strong>NOTICE:</strong> Bid Security deposit is collected and held directly by the verified organizer ({selectedSession.sellerName}), NOT by KAYAD corporate.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-800">
                    <div><span className="font-bold">Receiving Institution:</span> {selectedSession.bidSecurityBank || 'NCBA Bank Kenya PLC'}</div>
                    <div><span className="font-bold">Account Name:</span> {selectedSession.bidSecurityAccountName || `${selectedSession.sellerName} Bidding Escrow`}</div>
                    <div><span className="font-bold">Paybill / Account:</span> {selectedSession.bidSecurityPaybillOrAccount || 'Paybill 888100 | Acc: AUC-DEP'}</div>
                    <div><span className="font-bold">Verification:</span> {selectedSession.bidSecurityVerificationMethod || 'Automated M-Pesa Ref / Bank Slip'}</div>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/80 text-[11px] text-emerald-900">
                    <span className="font-bold">Refund Policy:</span> {selectedSession.bidSecurityRefundPolicy || '100% deposit refunded to non-winning bidders within 24 hours after auction conclusion.'}
                  </div>
                </div>

                {/* Terms & Handover Instructions */}
                <div className="p-4 bg-[#F5F2EB] rounded-xl border border-slate-200 space-y-2">
                  <p className="font-bold text-[#1E3063] flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-600" /> Auction Terms & Winning Settlement:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    {selectedSession.termsAndConditions.map((term, i) => (
                      <li key={i}>{term}</li>
                    ))}
                  </ul>
                  {selectedSession.handoverInstructions && (
                    <div className="pt-2 border-t border-slate-300 text-[11px] text-slate-700">
                      <span className="font-bold text-[#1E3063]">Winning Handover & Settlement:</span> {selectedSession.handoverInstructions}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Close Button */}
            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <Button
                variant="outline"
                size="md"
                onClick={() => closeLot()}
                className="text-xs font-bold"
              >
                Close Details
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* BIDDER REGISTRATION & ACCREDITATION MODAL */}
      {registeringSession && (
        <BidderRegistrationModal
          isOpen={isRegistrationModalOpen}
          onClose={() => {
            setIsRegistrationModalOpen(false);
            setRegisteringSession(null);
          }}
          session={registeringSession}
          onRegistrationComplete={handleRegistrationComplete}
        />
      )}

      {/* PRE-AUCTION VEHICLE INSPECTION PORTAL MODAL */}
      {inspectionTargetSession && (
        <PreAuctionInspectionModal
          isOpen={isPreInspectionModalOpen}
          onClose={() => {
            setIsPreInspectionModalOpen(false);
            setInspectionTargetSession(null);
          }}
          session={inspectionTargetSession}
          showToast={showToast}
        />
      )}

      {/* LIVE AUCTION ROOM MODAL */}
      {liveRoomSession && (
        <LiveAuctionRoomModal
          isOpen={isLiveRoomOpen}
          onClose={() => {
            setIsLiveRoomOpen(false);
            setLiveRoomSession(null);
          }}
          session={liveRoomSession}
          verifiedPass={verifiedBiddersMap[liveRoomSession.id]}
          onOpenRegistration={() => {
            setIsLiveRoomOpen(false);
            handleOpenRegistration(liveRoomSession);
          }}
          onPlaceBid={(sess, amount, bidderName, loc) => {
            executeBid(sess, amount, bidderName, loc);
            // Update local state copy of current bid in room
            setLiveRoomSession(prev => prev ? {
              ...prev,
              currentBid: amount,
              totalBidsCount: prev.totalBidsCount + 1,
              reserveMet: amount >= prev.reservePrice ? true : prev.reserveMet,
              bidHistory: [
                {
                  id: `bid-${Date.now()}`,
                  amount: amount,
                  bidderName: bidderName,
                  timestamp: new Date().toISOString(),
                  status: 'Highest Bid',
                  verifiedDeposit: true
                },
                ...prev.bidHistory
              ]
            } : null);
          }}
          onStartEscrow={onStartEscrow}
          onOpenCompletion={(sess, winnerAlias, amount) => {
            setIsLiveRoomOpen(false);
            handleOpenCompletion(sess, winnerAlias, amount);
          }}
          showToast={showToast}
        />
      )}

      {/* POST-AUCTION COMPLETION & WINNING CERTIFICATE MODAL */}
      {completionSession && (
        <PostAuctionCompletionModal
          isOpen={isCompletionModalOpen}
          onClose={() => {
            setIsCompletionModalOpen(false);
            setCompletionSession(null);
          }}
          session={completionSession}
          winnerAlias={completionWinnerAlias}
          winningAmount={completionWinningAmount}
          verifiedPass={verifiedBiddersMap[completionSession.id]}
          showToast={showToast}
          onStartEscrow={onStartEscrow}
        />
      )}

      {/* ORGANIZER MANAGEMENT CONSOLE & KAYAD REVENUE PORTAL - isOpen
          combines the state with isOrganizerCapable directly (not just
          relying on the trigger button being hidden and the state
          therefore never becoming true), same defense-in-depth
          reasoning as the inline creation form above: this component is
          always mounted (controlled via its own isOpen prop, not
          conditional rendering), so its actual open/closed state should
          never trust a single gated entry point alone. */}
      <OrganizerManagementConsole
        isOpen={isOrganizerCapable && isOrganizerConsoleOpen}
        onClose={() => setIsOrganizerConsoleOpen(false)}
        sessions={sessions}
        verifiedBiddersMap={verifiedBiddersMap}
        onApproveBidder={(_sessionId, profile) => handleRegistrationComplete(profile)}
        onCreateNewAuction={() => setShowInlineCreateForm(true)}
        onOpenLiveRoom={(sess) => handleOpenLiveRoom(sess)}
        onPublishResults={(sess) => handleOpenCompletion(sess, undefined, sess.currentBid)}
        onUpdateSession={(updatedSess) => {
          setSessions(prev => prev.map(s => s.id === updatedSess.id ? updatedSess : s));
        }}
        showToast={showToast}
      />

      {/* DEDICATED AUCTION ORGANIZER DASHBOARD - same defense-in-depth
          isOpen combination as the console above. */}
      <AuctionOrganizerDashboard
        isOpen={isOrganizerCapable && isOrganizerDashboardOpen}
        onClose={() => setIsOrganizerDashboardOpen(false)}
        sessions={sessions}
        onOpenLiveRoom={(sess) => handleOpenLiveRoom(sess)}
        onUpdateSession={(updatedSess) => {
          setSessions(prev => prev.map(s => s.id === updatedSess.id ? updatedSess : s));
        }}
        showToast={showToast}
      />

      {isPageAdmin && showAuctionAdminPanel && (
        <AuctionPageAdminPanel
          config={auctionConfig}
          onUpdate={updateAuctionConfig}
          onReset={resetAuctionConfig}
          onClose={() => setShowAuctionAdminPanel(false)}
        />
      )}
    </div>
  );
};

// SVG Icon Helpers for Categories
function LandmarkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="3" y1="22" x2="21" y2="22"></line>
      <line x1="6" y1="18" x2="6" y2="11"></line>
      <line x1="10" y1="18" x2="10" y2="11"></line>
      <line x1="14" y1="18" x2="14" y2="11"></line>
      <line x1="18" y1="18" x2="18" y2="11"></line>
      <polygon points="12 2 20 7 4 7 12 2"></polygon>
    </svg>
  );
}

function DirectImportIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 20a2 2 0 0 0 2 2 h16a2 2 0 0 0 2-2V8l-7-5H9L2 8v12z"></path>
      <polyline points="12 12 12 17 15 14"></polyline>
      <line x1="12" y1="17" x2="9" y2="14"></line>
    </svg>
  );
}

function FleetIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="1" y="3" width="15" height="13" rx="2"></rect>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
      <circle cx="5.5" cy="18.5" r="2.5"></circle>
      <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </svg>
  );
}

function DealerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 21h18"></path>
      <path d="M3 7v14"></path>
      <path d="M13 7v14"></path>
      <path d="M21 7v14"></path>
      <path d="M3 7l9-4 9 4"></path>
    </svg>
  );
}

function SUVIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A2 2 0 0 0 2 11.7V16c0 .6.4 1 1 1h2"></path>
      <circle cx="7" cy="17" r="2"></circle>
      <circle cx="17" cy="17" r="2"></circle>
    </svg>
  );
}

function LuxuryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  );
}

export default AuctionsView;
