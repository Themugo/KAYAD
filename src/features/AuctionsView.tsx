import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [error, setError] = useState<string | null>(null);
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
    setLoading(true);
    setError(null);
    const sections = [
      { key: 'live' as const, label: 'Live now', run: () => fetchList({ page: 1, limit: 100, status: 'live' }) },
      { key: 'scheduled' as const, label: 'Starting soon', run: () => fetchList({ page: 1, limit: 100, status: 'draft' }) },
      { key: 'ended' as const, label: 'Completed', run: () => fetchList({ page: 1, limit: 100, status: 'ended' }) },
    ];
    try {
      const results = await Promise.allSettled(sections.map((section) => section.run()));
      const rows = (r: PromiseSettledResult<{ auctions: unknown[] }>) => (r.status === 'fulfilled' ? ((r.value.auctions || []) as DisplayAuction[]) : []);
      setLive(rows(results[0])); setScheduled(rows(results[1])); setEnded(rows(results[2]));
      const next = { live: results[0].status === 'rejected', scheduled: results[1].status === 'rejected', ended: results[2].status === 'rejected' };
      setFailed(next);
      const rejected = results
        .map((r, i) => ({ r, section: sections[i] }))
        .filter((x) => x.r.status === 'rejected') as Array<{ r: PromiseRejectedResult; section: typeof sections[number] }>;
      if (rejected.length) {
        const details = rejected.map(({ r, section }) => {
          const reason = r.reason as any;
          const detail = reason?.response?.data?.message || reason?.message || 'Request failed.';
          return `${section.label}: ${detail}`;
        });
        setError(rejected.length === sections.length
          ? `Auction data is temporarily unavailable. ${details.join(' · ')}`
          : `${details.join(' · ')}. Other sections remain available — use Refresh to try again.`);
      }
    } catch (err: any) {
      setFailed({ live: true, scheduled: true, ended: true });
      setError(err?.response?.data?.message || err?.message || 'Unable to load auctions from KAYAD.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!user) { setFavorites(new Set()); return; }
    getFavorites({ page: 1, limit: 100 })
      .then((result) => setFavorites(new Set((result.favorites || []).map((v: any) => String(v.id || v._id)))))
      .catch(() => setFavorites(new Set()));
  }, [user]);

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
    if (tab !== 'live' || search.trim()) return null;
    if (!live.length) return null;
    return [...live].sort((a, b) => msRemaining(a.endTime) - msRemaining(b.endTime))[0] || null;
  }, [tab, search, live]);
  const spotlightId = spotlight ? String(spotlight.carId || spotlight.id) : null;
  const gridAuctions = spotlightId ? filtered.filter((auction) => String(auction.carId || auction.id) !== spotlightId) : filtered;

  const marketHeadline = useMemo(() => {
    if (failed.live) return 'Live auctions are temporarily unavailable';
    if (live.length > 0) return `${live.length} vehicle${live.length === 1 ? '' : 's'} up for bid right now`;
    if (failed.scheduled) return 'Starting-soon auctions are temporarily unavailable';
    if (scheduled.length > 0) return `No auctions live right now — ${scheduled.length} starting soon`;
    return 'The auction floor is quiet right now';
  }, [live.length, scheduled.length, failed.live, failed.scheduled]);

  const marketSubcopy = useMemo(() => {
    if (failed.live && failed.scheduled && failed.ended) return 'The auction service did not return any of its lists. No auction records have been fabricated — use Refresh to try again.';
    if (failed.live) return 'Live auctions could not be loaded. Other sections may still be available; use Refresh to retry the live list.';
    if (failed.scheduled && live.length === 0) return 'The Starting soon list could not be loaded, but the other auction sections responded. This is not confirmation that there are no scheduled auctions — use Refresh to retry.';
    if (live.length > 0) return 'Follow live bidding, save what you want to return to, and move from registration to fulfilment in one connected room.';
    if (failed.scheduled) return 'The Starting soon list is temporarily unavailable. Live and completed sections remain available; use Refresh to retry.';
    if (scheduled.length > 0) return 'New auctions are queued and will open automatically — save a listing or check back to be first in the room.';
    return 'KAYAD opens auctions as verified vehicles clear registration. Browse the marketplace in the meantime, or save a search to be notified the moment one goes live.';
  }, [live.length, scheduled.length, failed.live, failed.scheduled, failed.ended]);

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
              {image ? <LazyImage src={image} alt={title(auction)} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-slate-400">No image supplied</div>}
              <div className="auction-card-badge absolute top-4 left-4"><Badge variant="live">LIVE NOW</Badge></div>
            </button>
            <div className="auction-spotlight-body">
              <p className="auction-spotlight-eyebrow">Closing soonest</p>
              <h2 className="auction-spotlight-title">{title(auction)}</h2>
              <p className="auction-card-meta text-sm text-slate-500">{[auction.car?.year, auction.car?.brand, auction.car?.model, auction.car?.location || auction.car?.location_city].filter(Boolean).join(' • ')}</p>
              <div className="auction-spotlight-stats">
                <div><p className="text-xs text-slate-500">Current bid</p><p className="auction-spotlight-price">{money(auction.highestBid)}</p></div>
                <div><p className="text-xs text-slate-500">Time left</p><p className="auction-spotlight-time"><Clock3 className="w-4 h-4 inline -mt-1 mr-1" />{remaining(auction.endTime)}</p></div>
                <div><p className="text-xs text-slate-500">Bids placed</p><p className="auction-spotlight-time">{auction.bidCount || 0}</p></div>
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
          <div className="auction-card-media relative h-52 bg-slate-100 overflow-hidden">
            {image ? <LazyImage src={image} alt={title(auction)} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" /> : <div className="h-full flex items-center justify-center text-slate-400">No image supplied</div>}
            <div className="auction-card-badge absolute top-3 left-3"><Badge variant={isLive ? 'live' : 'neutral'}>{isLive ? 'LIVE NOW' : isScheduled ? 'STARTING SOON' : 'COMPLETED'}</Badge></div>
            <div className="auction-card-overlay" aria-hidden="true" />
          </div>
        </button>
        <div className="auction-card-body p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><h3 className="auction-card-title font-bold text-[#176B87] truncate">{title(auction)}</h3><p className="auction-card-meta text-xs text-slate-500 mt-1">{[auction.car?.year, auction.car?.brand, auction.car?.model, auction.car?.location || auction.car?.location_city].filter(Boolean).join(' • ')}</p></div>
            <AuctionSavedPulse active={favorites.has(id)} onToggle={() => void watch(auction)} label="Watch" />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" /> {isLive ? `${remaining(auction.endTime)} remaining` : isScheduled ? `Starts in ${remaining(auction.startTime)}` : 'Auction ended'}</span>
            <span>{auction.bidCount || 0} bids</span>
          </div>
          <div className="flex items-end justify-between">
            <div><p className="text-xs text-slate-500">{isLive ? 'Current bid' : isEnded ? 'Final bid' : 'Starting bid'}</p><p className="auction-card-price text-xl font-black text-slate-900">{money(isLive || isEnded ? auction.highestBid : auction.startingBid)}</p></div>
            <div className="text-right">{verified && <span className="text-xs text-emerald-700 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Verified organizer</span>}<Button onClick={() => openAuction(auction)} className="mt-2">{isLive ? 'Open auction' : 'View auction'}</Button></div>
          </div>
        </div>
      </Card>
    );
  };

  const tabFailed = (tab === 'live' && failed.live) || (tab === 'scheduled' && failed.scheduled) || (tab === 'ended' && failed.ended) || (tab === 'saved' && (failed.live || failed.scheduled || failed.ended));
  const emptyStateCopy = tab === 'saved'
    ? { title: 'Your watchlist is ready for its first favourite.', body: 'Save a vehicle from any room and it will return here with the same live data.' }
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
      <section className="auction-market-header">
        <div className="auction-market-header-top">
          <div className="auction-eyebrow"><span className="auction-live-pulse" /> KAYAD AUCTIONS <span className="auction-eyebrow-divider" /> CURATED VEHICLE MARKET</div>
          <div className="auction-trust-row">
            <span><ShieldCheck size={13} /> Verified listings</span>
            <span><Lock size={13} /> Published settlement rules</span>
          </div>
        </div>
        <h1 className="auction-market-headline" aria-live="polite">{marketHeadline}</h1>
        <p className="auction-market-subcopy">{marketSubcopy}</p>

        <div className="auction-market-controls">
          <div className="auction-segment-grid" role="tablist" aria-label="Auction sections">
            <button role="tab" aria-selected={tab === 'live'} onClick={() => setTab('live')} className={`auction-segment ${tab === 'live' ? 'is-active' : ''}`}>
              <div className="auction-segment-icon"><Radio size={16} /></div><div><div className="auction-segment-label">Live now</div><div className="auction-segment-value">{failed.live ? '—' : live.length}</div></div>
            </button>
            <button role="tab" aria-selected={tab === 'scheduled'} onClick={() => setTab('scheduled')} className={`auction-segment ${tab === 'scheduled' ? 'is-active' : ''}`}>
              <div className="auction-segment-icon"><TimerReset size={16} /></div><div><div className="auction-segment-label">Starting soon</div><div className="auction-segment-value">{failed.scheduled ? '—' : scheduled.length}</div></div>
            </button>
            <button role="tab" aria-selected={tab === 'ended'} onClick={() => setTab('ended')} className={`auction-segment ${tab === 'ended' ? 'is-active' : ''}`}>
              <div className="auction-segment-icon"><CheckCircle2 size={16} /></div><div><div className="auction-segment-label">Completed</div><div className="auction-segment-value">{failed.ended ? '—' : ended.length}</div></div>
            </button>
            <button role="tab" aria-selected={tab === 'saved'} onClick={() => setTab('saved')} className={`auction-segment ${tab === 'saved' ? 'is-active' : ''}`}>
              <div className="auction-segment-icon"><Heart size={16} /></div><div><div className="auction-segment-label">Saved for you</div><div className="auction-segment-value">{favorites.size}</div></div>
            </button>
          </div>

          <div className="auction-searchbar">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vehicle, make, model or location..." className="pl-9" />
            </div>
            <Button variant="secondary" onClick={() => void load()} disabled={loading} className="auction-refresh-btn"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>
          </div>
        </div>
      </section>

      {message && <div className="p-3 rounded-xl bg-slate-100 text-slate-700 text-sm">{message}</div>}
      {error && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">{error}</div>}

      {/* The vehicle stays visually dominant, but the auction — urgency,
          current bid, bid count — is what frames it, not a marketing banner. */}
      {spotlight && renderAuctionCard(spotlight, 'spotlight')}

      {!loading && !tabFailed && filtered.length === 0 && (
        <Card className="p-10 text-center auction-interaction-glow">
          <Gavel className="w-8 h-8 mx-auto text-slate-400 mb-3" />
          <p className="font-bold text-slate-800">{emptyStateCopy.title}</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{emptyStateCopy.body}</p>
          {tab === 'saved' && <div className="mt-5"><AuctionHistoryEmptyAction onExplore={() => setTab('live')} /></div>}
        </Card>
      )}

      <div className="auction-card-grid">
        {gridAuctions.map((auction) => renderAuctionCard(auction, 'grid'))}
      </div>
    </div>
  );
};

export default AuctionsView;
