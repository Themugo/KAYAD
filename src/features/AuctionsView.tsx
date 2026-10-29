import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, Gavel, Heart, RefreshCw, Search, ShieldCheck, Radio, TimerReset, CheckCircle2, Lock } from 'lucide-react';
import { UserProfile } from '../types';
import { fetchList, type Auction } from '../services/auctionService';
import { getFavorites, toggleFavorite, FavoriteApiError } from '../services/favoriteApi';
import { PageHeader, Card, Badge, Button, LazyImage, Input } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { AuctionExperienceRail, BidderIdentityCard } from '../components/auction/AuctionExperienceRail';
import { AuctionSavedPulse, AuctionSwipeHint, AuctionHistoryEmptyAction } from '../components/auction/AuctionInteractionLayer';

interface AuctionsViewProps {
  vehicles?: any[];
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  onStartEscrow?: (vehicle: any) => void;
  onQuickViewVehicle?: (vehicle: any) => void;
}

type DisplayAuction = Auction & {
  car?: Record<string, any>;
};

const imageUrl = (images?: any[]) => {
  const first = images?.[0];
  return typeof first === 'string' ? first : first?.url;
};

const money = (value: number) => `KSh ${Number(value || 0).toLocaleString('en-KE')}`;

const remaining = (date: string | null) => {
  if (!date) return 'Date unavailable';
  const ms = new Date(date).getTime() - Date.now();
  if (!Number.isFinite(ms)) return 'Date unavailable';
  if (ms <= 0) return 'Started';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return days ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
};

const title = (auction: DisplayAuction) => String(auction.car?.title || auction.car?.name || `Auction ${auction.id}`);

/** Validate runtime payloads instead of trusting TypeScript's erased types.
 * A malformed success response is a contract failure, never an empty auction list. */
const readAuctionRows = (payload: unknown): DisplayAuction[] => {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { auctions?: unknown }).auctions)) {
    throw new Error('Auction list response did not contain an auctions array.');
  }
  return (payload as { auctions: unknown[] }).auctions.map((row, index) => {
    if (!row || typeof row !== 'object') throw new Error(`Auction record ${index + 1} is invalid.`);
    const record = row as Record<string, unknown>;
    const id = record.id ?? record.carId;
    if ((typeof id !== 'string' && typeof id !== 'number') || String(id).trim() === '') {
      throw new Error(`Auction record ${index + 1} has no valid identifier.`);
    }
    if (record.status !== 'active' && record.status !== 'draft' && record.status !== 'ended') {
      throw new Error(`Auction record ${index + 1} has an unsupported status.`);
    }
    return row as DisplayAuction;
  });
};

const readFavoriteIds = (payload: unknown): Set<string> => {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { favorites?: unknown }).favorites)) {
    throw new Error('Saved-auction response did not contain a favorites array.');
  }
  return new Set((payload as { favorites: unknown[] }).favorites.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Saved-auction record ${index + 1} is invalid.`);
    const record = item as Record<string, unknown>;
    const id = record.id ?? record._id;
    if ((typeof id !== 'string' && typeof id !== 'number') || String(id).trim() === '') {
      throw new Error(`Saved-auction record ${index + 1} has no valid identifier.`);
    }
    return String(id);
  }));
};

const msRemaining = (date: string | null) => {
  if (!date) return Number.POSITIVE_INFINITY;
  const ms = new Date(date).getTime() - Date.now();
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
};

const isVerifiedOrganizer = (auction: DisplayAuction) =>
  Boolean(auction.car?.is_verified_dealer || auction.car?.isVerifiedDealer || auction.car?.dealer?.verified);

/**
 * Canonical customer auction surface.
 * Phase 6 deliberately makes this the only discovery UI. The older
 * AuctionDiscoveryNetwork remains in the tree for compatibility but is no
 * longer a second customer-facing auction product; App routes discovery to
 * this component.
 */
export const AuctionsView: React.FC<AuctionsViewProps> = ({ user, onOpenAuth }) => {
  const navigate = useNavigate();
  const [live, setLive] = useState<DisplayAuction[]>([]);
  const [scheduled, setScheduled] = useState<DisplayAuction[]>([]);
  const [ended, setEnded] = useState<DisplayAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const requestSequence = useRef(0);
  const favoritesRequestSequence = useRef(0);
  const [lastSuccessfulRefresh, setLastSuccessfulRefresh] = useState<Date | null>(null);
  const [favoritesStatus, setFavoritesStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  // Each list loads independently: one failing request must not blank the others, and a failed list is
  // reported as unavailable — never as zero auctions.
  const [failed, setFailed] = useState<{ live: boolean; scheduled: boolean; ended: boolean }>({ live: false, scheduled: false, ended: false });
  const [search, setSearch] = useState('');
  // The tab is readable from `?auctionTab=` so the global navigation (and any
  // copied link) can open an existing tab directly. Unknown values fall back to live.
  const readTab = (): 'live' | 'scheduled' | 'ended' | 'saved' => {
    const requested = new URLSearchParams(window.location.search).get('auctionTab');
    return requested === 'saved' || requested === 'scheduled' || requested === 'ended' ? requested : 'live';
  };
  const [tab, setTab] = useState<'live' | 'scheduled' | 'ended' | 'saved'>(readTab);
  useEffect(() => { const sync = () => setTab(readTab()); window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync); }, []);
  useEffect(() => { const url = new URL(window.location.href); if (tab !== 'live') url.searchParams.set('auctionTab', tab); else url.searchParams.delete('auctionTab'); const query = url.searchParams.toString(); window.history.replaceState(window.history.state, '', `${url.pathname}${query ? `?${query}` : ''}${url.hash}`); }, [tab]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    const sections = [
      { key: 'live' as const, run: () => fetchList({ page: 1, limit: 100, status: 'live' }) },
      { key: 'scheduled' as const, run: () => fetchList({ page: 1, limit: 100, status: 'draft' }) },
      { key: 'ended' as const, run: () => fetchList({ page: 1, limit: 100, status: 'ended' }) },
    ];
    try {
      const results = await Promise.allSettled(sections.map((section) => section.run()));
      if (sequence !== requestSequence.current) return;
      const normalized = results.map((result) => {
        if (result.status === 'rejected') return { ok: false as const, rows: [] as DisplayAuction[] };
        try { return { ok: true as const, rows: readAuctionRows(result.value) }; }
        catch { return { ok: false as const, rows: [] as DisplayAuction[] }; }
      });
      // Only valid responses replace their section. A failed or malformed refresh
      // preserves the last successful snapshot and never implies a zero count.
      if (normalized[0].ok) setLive(normalized[0].rows);
      if (normalized[1].ok) setScheduled(normalized[1].rows);
      if (normalized[2].ok) setEnded(normalized[2].rows);
      setFailed({ live: !normalized[0].ok, scheduled: !normalized[1].ok, ended: !normalized[2].ok });
      if (normalized.some((section) => section.ok)) setLastSuccessfulRefresh(new Date());
    } catch {
      if (sequence === requestSequence.current) setFailed({ live: true, scheduled: true, ended: true });
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const loadFavorites = useCallback(async () => {
    const sequence = ++favoritesRequestSequence.current;
    setFavoritesError(null);
    if (!user) {
      setFavorites(new Set());
      setFavoritesStatus('idle');
      return;
    }
    setFavoritesStatus('loading');
    try {
      const result = await getFavorites({ page: 1, limit: 100 });
      if (sequence !== favoritesRequestSequence.current) return;
      setFavorites(readFavoriteIds(result));
      setFavoritesStatus('success');
    } catch {
      if (sequence !== favoritesRequestSequence.current) return;
      // Do not turn an unavailable watchlist into a verified empty watchlist.
      setFavoritesStatus('error');
      setFavoritesError('Saved auctions could not be loaded. Your watchlist may be unavailable; retry to check again.');
    }
  }, [user]);

  useEffect(() => {
    void loadFavorites();
    return () => { favoritesRequestSequence.current += 1; };
  }, [loadFavorites]);

  const all = useMemo(() => [...live, ...scheduled, ...ended], [live, scheduled, ended]);
  const current = tab === 'live' ? live : tab === 'scheduled' ? scheduled : tab === 'ended' ? ended : all.filter((auction) => favorites.has(String(auction.carId || auction.id)));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return current;
    return current.filter((auction) => [title(auction), auction.car?.brand, auction.car?.model, auction.car?.location, auction.car?.location_city]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(q)));
  }, [current, search]);

  // The single most time-urgent live auction becomes the spotlight — a real,
  // backend-returned record (soonest `endTime` among `live`), never a
  // fabricated or hand-picked "featured" slot. Only shown on the live tab,
  // with no active search, so it never disappears from (or duplicates
  // within) a filtered/other-tab result set.
  const spotlight = useMemo(() => {
    if (tab !== 'live' || search.trim() || failed.live) return null;
    if (!live.length) return null;
    return [...live].sort((a, b) => msRemaining(a.endTime) - msRemaining(b.endTime))[0] || null;
  }, [tab, search, live, failed.live]);
  const spotlightId = spotlight ? String(spotlight.carId || spotlight.id) : null;
  const gridAuctions = spotlightId ? filtered.filter((auction) => String(auction.carId || auction.id) !== spotlightId) : filtered;

  const marketHeadline = useMemo(() => {
    if (loading && live.length === 0 && scheduled.length === 0 && ended.length === 0) return 'Loading auction activity…';
    // The headline describes the selected tab only. Failures in other tabs are
    // disclosed in the supporting copy and must not mislabel a healthy empty
    // live list as a failed Starting soon list.
    if (tab === 'live' && failed.live) return 'Live auctions are temporarily unavailable';
    if (tab === 'scheduled' && failed.scheduled) return 'Starting-soon auctions are temporarily unavailable';
    if (tab === 'ended' && failed.ended) return 'Completed auctions are temporarily unavailable';
    if (tab === 'saved' && failed.live && failed.scheduled && failed.ended) return 'Saved auction data is temporarily unavailable';
    if (tab === 'live' && live.length > 0) return `${live.length} vehicle${live.length === 1 ? '' : 's'} up for bid right now`;
    if (tab === 'scheduled' && scheduled.length > 0) return `${scheduled.length} auction${scheduled.length === 1 ? '' : 's'} starting soon`;
    if (tab === 'ended' && ended.length > 0) return `${ended.length} completed auction${ended.length === 1 ? '' : 's'}`;
    if (tab === 'saved') return 'Your saved auctions';
    if (tab === 'scheduled') return 'No auctions are scheduled yet';
    if (tab === 'ended') return 'No completed auctions yet';
    return 'The auction floor is quiet right now';
  }, [loading, tab, live.length, scheduled.length, ended.length, failed.live, failed.scheduled, failed.ended]);

  const marketSubcopy = useMemo(() => {
    if (loading && live.length === 0 && scheduled.length === 0 && ended.length === 0) return 'Checking the latest live, upcoming and completed auction lists from KAYAD.';
    const unavailable = [
      failed.live ? 'Live now' : null,
      failed.scheduled ? 'Starting soon' : null,
      failed.ended ? 'Completed' : null,
    ].filter(Boolean) as string[];
    const selectedFailed = (tab === 'live' && failed.live)
      || (tab === 'scheduled' && failed.scheduled)
      || (tab === 'ended' && failed.ended);

    if (failed.live && failed.scheduled && failed.ended) return 'We could not retrieve the auction lists. This does not mean there are no auctions. Please try Refresh.';
    if (selectedFailed && tab === 'scheduled') return scheduled.length ? 'Scheduled data could not be refreshed. Showing last-known records; current publication and timing should be rechecked. Please Refresh.' : 'Scheduled auctions could not be loaded. This is not confirmation that there are no upcoming auctions. Please try Refresh.';
    if (selectedFailed && tab === 'live') return live.length ? 'Live data could not be refreshed. Last-known records remain visible, but current status and bid activity are unverified. Please Refresh.' : 'Live auction data could not be loaded. Please try Refresh; no auction records are being invented.';
    if (selectedFailed && tab === 'ended') return ended.length ? 'Completed results could not be refreshed. Showing last-known records; refresh to verify the latest results.' : 'Completed auction results could not be loaded. Please try Refresh.';
    if (tab === 'saved' && favoritesStatus === 'error') return favoritesError || 'Saved auctions could not be loaded. Please try again.';
    if (tab === 'saved' && favoritesStatus === 'loading') return 'Loading your saved auctions securely from your account.';
    if (tab === 'saved' && unavailable.length) return `Your saved view may be incomplete because ${unavailable.join(', ')} could not be refreshed. Please try Refresh.`;
    if (unavailable.length) {
      const selectedLabel = tab === 'live' ? 'Live now' : tab === 'scheduled' ? 'Starting soon' : 'Completed';
      return `${selectedLabel} responded, but ${unavailable.join(' and ')} ${unavailable.length === 1 ? 'could not' : 'could not'} be loaded. A failed section is not an empty result; use Refresh to retry.`;
    }
    if (tab === 'live' && live.length > 0) return 'Follow live bidding, save auctions to revisit, and continue from registration to fulfilment in the connected auction journey.';
    if (tab === 'scheduled' && scheduled.length > 0) return 'Published upcoming auctions appear here with their scheduled start times and opening bids.';
    if (tab === 'ended' && ended.length > 0) return 'Review completed auction listings and the results returned by KAYAD.';
    if (scheduled.length > 0) return 'No auctions are live right now. Published upcoming auctions are available in Starting soon.';
    return 'KAYAD lists only auctions returned by the backend. Browse the marketplace and check back as verified vehicles become eligible for auction.';
  }, [loading, tab, live.length, scheduled.length, ended.length, failed.live, failed.scheduled, failed.ended, favoritesStatus, favoritesError]);

  const openAuction = (auction: DisplayAuction) => {
    navigate(`/auction/${encodeURIComponent(String(auction.carId || auction.id))}`);
  };

  const watch = async (auction: DisplayAuction) => {
    const id = String(auction.carId || auction.id);
    if (!user) { onOpenAuth?.(); return; }
    try {
      const result = await toggleFavorite(id);
      setFavorites((previous) => {
        const next = new Set(previous);
        if (result.favorited) next.add(id); else next.delete(id);
        return next;
      });
    } catch (err) {
      setMessage(err instanceof FavoriteApiError ? err.message : 'Could not update your watchlist.');
    }
  };

  const renderAuctionCard = (auction: DisplayAuction, variant: 'grid' | 'spotlight' = 'grid') => {
    const id = String(auction.carId || auction.id);
    const image = imageUrl(auction.car?.images);
    const isLive = auction.status === 'active';
    const isScheduled = auction.status === 'draft';
    const isEnded = auction.status === 'ended';
    const verified = isVerifiedOrganizer(auction);
    if (variant === 'spotlight') {
      return (
        <Card className="auction-spotlight overflow-hidden auction-interaction-glow">
          <div className="auction-spotlight-grid">
            <button onClick={() => openAuction(auction)} className="auction-spotlight-media relative block text-left overflow-hidden" aria-label={`Open ${title(auction)}`}>
              {image ? <LazyImage src={image} alt={title(auction)} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-[#94A3B8]">No image supplied</div>}
              <div className="auction-card-badge absolute top-4 left-4"><Badge variant="live">LIVE NOW</Badge></div>
            </button>
            <div className="auction-spotlight-body">
              <p className="auction-spotlight-eyebrow">Closing soonest</p>
              <h2 className="auction-spotlight-title">{title(auction)}</h2>
              <p className="auction-card-meta text-sm text-[#64748B]">{[auction.car?.year, auction.car?.brand, auction.car?.model, auction.car?.location || auction.car?.location_city].filter(Boolean).join(' • ')}</p>
              <div className="auction-spotlight-stats">
                <div><p className="text-xs text-[#64748B]">Current bid</p><p className="auction-spotlight-price">{money(auction.highestBid)}</p></div>
                <div><p className="text-xs text-[#64748B]">Time left</p><p className="auction-spotlight-time"><Clock3 className="w-4 h-4 inline -mt-1 mr-1" />{remaining(auction.endTime)}</p></div>
                <div><p className="text-xs text-[#64748B]">Bids placed</p><p className="auction-spotlight-time">{auction.bidCount || 0}</p></div>
              </div>
              <div className="flex items-center gap-4 mt-5">
                <Button onClick={() => openAuction(auction)}>Enter the live room</Button>
                <AuctionSavedPulse active={favorites.has(id)} onToggle={() => void watch(auction)} label="Watch this auction" />
                {verified && <span className="text-xs text-emerald-700 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Verified organizer</span>}
              </div>
            </div>
          </div>
        </Card>
      );
    }
    return (
      <Card key={auction.id} className="auction-card overflow-hidden group auction-touch-card auction-interaction-glow">
        <button onClick={() => openAuction(auction)} className="block w-full text-left">
          <div className="auction-card-media relative h-52 bg-[#EEF7F5] overflow-hidden">
            {image ? <LazyImage src={image} alt={title(auction)} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" /> : <div className="h-full flex items-center justify-center text-[#94A3B8]">No image supplied</div>}
            <div className="auction-card-badge absolute top-3 left-3"><Badge variant={isLive && !failed.live ? 'live' : 'neutral'}>{isLive && failed.live ? 'STATUS UNVERIFIED' : isLive ? 'LIVE NOW' : isScheduled ? 'STARTING SOON' : 'COMPLETED'}</Badge></div>
            <div className="auction-card-overlay" aria-hidden="true" />
          </div>
        </button>
        <div className="auction-card-body p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><h3 className="auction-card-title font-bold text-[#176B87] truncate">{title(auction)}</h3><p className="auction-card-meta text-xs text-[#64748B] mt-1">{[auction.car?.year, auction.car?.brand, auction.car?.model, auction.car?.location || auction.car?.location_city].filter(Boolean).join(' • ')}</p></div>
            <AuctionSavedPulse active={favorites.has(id)} onToggle={() => void watch(auction)} label="Watch" />
          </div>
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" /> {isLive && failed.live ? 'Current status unverified' : isLive ? `${remaining(auction.endTime)} remaining` : isScheduled ? `Starts in ${remaining(auction.startTime)}` : 'Auction ended'}</span>
            <span>{auction.bidCount || 0} bids</span>
          </div>
          <div className="flex items-end justify-between">
            <div><p className="text-xs text-[#64748B]">{isLive && failed.live ? 'Last known bid' : isLive ? 'Current bid' : isEnded ? 'Final bid' : 'Starting bid'}</p><p className="auction-card-price text-xl font-black text-[#0A3340]">{money(isLive || isEnded ? auction.highestBid : auction.startingBid)}</p></div>
            <div className="text-right">{verified && <span className="text-xs text-emerald-700 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Verified organizer</span>}<Button onClick={() => openAuction(auction)} className="mt-2">{isLive ? 'Open auction' : 'View auction'}</Button></div>
          </div>
        </div>
      </Card>
    );
  };

  const tabFailed = (tab === 'live' && failed.live) || (tab === 'scheduled' && failed.scheduled) || (tab === 'ended' && failed.ended) || (tab === 'saved' && (favoritesStatus === 'loading' || favoritesStatus === 'error' || (failed.live && failed.scheduled && failed.ended)));
  const emptyStateCopy = tab === 'saved'
    ? !user
      ? { title: 'Sign in to view your saved auctions.', body: 'Save auctions to build a watchlist you can return to whenever you come back to KAYAD.' }
      : favoritesStatus === 'error'
        ? { title: 'Your saved auctions could not be verified.', body: favoritesError || 'Please retry to load your account watchlist.' }
        : favoritesStatus === 'loading'
          ? { title: 'Loading your saved auctions…', body: 'Your watchlist is being retrieved from your account.' }
          : (failed.live || failed.scheduled || failed.ended)
            ? { title: 'Your saved-auction view may be incomplete.', body: 'One or more auction lists could not be checked. Refresh before concluding that no saved auctions are available.' }
            : { title: 'Your watchlist is ready for its first favourite.', body: 'Save an auction to return to it here.' }
    : tab === 'live'
      ? { title: scheduled.length > 0 ? 'Nothing live this moment.' : 'The auction floor is quiet right now.', body: scheduled.length > 0 ? `${scheduled.length} auction${scheduled.length === 1 ? ' is' : 's are'} scheduled to open soon — check Starting soon or save a search to be notified.` : 'KAYAD shows only auctions returned by the backend; it never manufactures local auction records. New auctions open as verified vehicles clear registration.' }
      : tab === 'scheduled'
        ? { title: 'No auctions are scheduled yet.', body: 'Scheduled auctions will appear here as soon as a dealer publishes one.' }
        : { title: 'No auctions have completed yet.', body: 'Completed auctions and their results will appear here once the first one closes.' };

  return (
    <div className="auction-premium-page space-y-7">
      <AuctionExperienceRail current={tab === 'ended' ? 'history' : 'detail'} />
      {user && <AuctionSwipeHint>Swipe the room • save anything you want to return to</AuctionSwipeHint>}
      {user && <BidderIdentityCard user={user} savedCount={favorites.size} onPayments={() => navigate('/?nav=payments')} onProfile={() => navigate('/?nav=profile')} />}

      {/* Compact, data-led market header — real counts drive the headline;
          there is no marketing copy independent of what the backend returns. */}
      <section className={`auction-market-header ${failed.live && failed.scheduled && failed.ended ? 'has-auction-error' : ''}`}>
        <div className="auction-market-header-top">
          <div className="auction-eyebrow"><span className={`auction-status-indicator ${loading ? 'is-loading' : failed.live ? 'is-unavailable' : live.length ? 'is-live' : 'is-idle'}`} aria-label={loading ? 'Auction data loading' : failed.live ? 'Live auction data unavailable' : live.length ? 'Live auction records available' : 'No live auction records returned'} /> KAYAD AUCTIONS <span className="auction-eyebrow-divider" /> CURATED VEHICLE MARKET</div>
          <div className="auction-trust-row">
            <span><ShieldCheck size={13} /> Verified listings</span>
            <span><Lock size={13} /> Published settlement rules</span>
          </div>
        </div>
        <h1 className="auction-market-headline" aria-live="polite">{marketHeadline}</h1>
        <p className="auction-market-subcopy">{marketSubcopy}</p>

        <div className="auction-market-controls">
          <div className="auction-segment-grid" role="tablist" aria-label="Auction sections">
            <button id="auction-tab-live" role="tab" aria-selected={tab === 'live'} aria-controls="auction-results-panel" onClick={() => setTab('live')} className={`auction-segment ${tab === 'live' ? 'is-active' : ''}`}>
              <div className="auction-segment-icon"><Radio size={16} /></div><div><div className="auction-segment-label">Live now</div><div className="auction-segment-value">{failed.live ? '—' : live.length}</div></div>
            </button>
            <button id="auction-tab-scheduled" role="tab" aria-selected={tab === 'scheduled'} aria-controls="auction-results-panel" onClick={() => setTab('scheduled')} className={`auction-segment ${tab === 'scheduled' ? 'is-active' : ''}`}>
              <div className="auction-segment-icon"><TimerReset size={16} /></div><div><div className="auction-segment-label">Starting soon</div><div className="auction-segment-value">{failed.scheduled ? '—' : scheduled.length}</div></div>
            </button>
            <button id="auction-tab-ended" role="tab" aria-selected={tab === 'ended'} aria-controls="auction-results-panel" onClick={() => setTab('ended')} className={`auction-segment ${tab === 'ended' ? 'is-active' : ''}`}>
              <div className="auction-segment-icon"><CheckCircle2 size={16} /></div><div><div className="auction-segment-label">Completed</div><div className="auction-segment-value">{failed.ended ? '—' : ended.length}</div></div>
            </button>
            <button id="auction-tab-saved" role="tab" aria-selected={tab === 'saved'} aria-controls="auction-results-panel" onClick={() => setTab('saved')} className={`auction-segment ${tab === 'saved' ? 'is-active' : ''}`}>
              <div className="auction-segment-icon"><Heart size={16} /></div><div><div className="auction-segment-label">Saved for you</div><div className="auction-segment-value">{!user || favoritesStatus === 'loading' || favoritesStatus === 'error' ? '—' : favorites.size}</div></div>
            </button>
          </div>

          <div className="auction-searchbar">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-[#94A3B8]" />
              <Input aria-label="Search auctions by vehicle, make, model or location" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search make, model or location…" className="pl-9" />
            </div>
            <Button variant="secondary" onClick={() => void load()} disabled={loading} className="auction-refresh-btn"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>
          </div>
        </div>
        <div className="auction-refresh-meta" aria-live="polite">
          {loading ? 'Refreshing auction data…' : lastSuccessfulRefresh ? `Last refresh with available data: ${lastSuccessfulRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Auction data has not refreshed successfully in this session.'}
          {tab === 'saved' && favoritesStatus === 'error' && <Button variant="secondary" onClick={() => void loadFavorites()}>Retry saved auctions</Button>}
        </div>
      </section>

      {message && <div className="p-3 rounded-xl bg-[#EEF7F5] text-[#12576D] text-sm">{message}</div>}

      {/* The vehicle stays visually dominant, but the auction — urgency,
          current bid, bid count — is what frames it, not a marketing banner. */}
      <section id="auction-results-panel" role="tabpanel" aria-labelledby={`auction-tab-${tab}`} tabIndex={0} aria-busy={loading}>
        {spotlight && renderAuctionCard(spotlight, 'spotlight')}

        {!loading && !tabFailed && filtered.length === 0 && (
          <Card className="p-10 text-center auction-interaction-glow">
            <Gavel className="w-8 h-8 mx-auto text-[#94A3B8] mb-3" />
            <p className="font-bold text-[#0A3340]">{emptyStateCopy.title}</p>
            <p className="text-sm text-[#64748B] mt-1 max-w-md mx-auto">{emptyStateCopy.body}</p>
            {tab === 'saved' && (!user
              ? <div className="mt-5 flex flex-wrap justify-center gap-3"><Button onClick={() => onOpenAuth?.()}>Sign in to continue</Button><Button variant="secondary" onClick={() => setTab('live')}>Explore live auctions</Button></div>
              : <div className="mt-5"><AuctionHistoryEmptyAction onExplore={() => setTab('live')} /></div>)}
          </Card>
        )}

        <div className="auction-card-grid">
          {gridAuctions.map((auction) => renderAuctionCard(auction, 'grid'))}
        </div>
      </section>
    </div>
  );
};

export default AuctionsView;
