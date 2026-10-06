import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clock3, Gavel, Heart, RefreshCw, Search, ShieldCheck, Sparkles, ArrowUpRight, Radio, Shield, TimerReset, CheckCircle2 } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'live' | 'scheduled' | 'ended' | 'saved'>(() => new URLSearchParams(window.location.search).get('auctionTab') === 'saved' ? 'saved' : 'live');
  useEffect(() => { const url = new URL(window.location.href); if (tab === 'saved') url.searchParams.set('auctionTab', 'saved'); else url.searchParams.delete('auctionTab'); url.searchParams.set('nav', 'auctions'); window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`); }, [tab]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [liveResult, scheduledResult, endedResult] = await Promise.all([
        fetchList({ page: 1, limit: 100, status: 'live' }),
        fetchList({ page: 1, limit: 100, status: 'draft' }),
        fetchList({ page: 1, limit: 100, status: 'ended' }),
      ]);
      setLive((liveResult.auctions || []) as DisplayAuction[]);
      setScheduled((scheduledResult.auctions || []) as DisplayAuction[]);
      setEnded((endedResult.auctions || []) as DisplayAuction[]);
    } catch (err: any) {
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

  return (
    <div className="auction-premium-page space-y-8">
      <AuctionExperienceRail current={tab === 'ended' ? 'history' : 'detail'} />
      {user && <AuctionSwipeHint>Swipe the room • save anything you want to return to</AuctionSwipeHint>}
      {user && <BidderIdentityCard user={user} savedCount={favorites.size} onPayments={() => navigate('/?nav=payments')} onProfile={() => navigate('/?nav=profile')} />}

      <section className="auction-hero-shell">
        <div className="auction-hero-glow" aria-hidden="true" />
        <div className="auction-hero-content">
          <div className="auction-eyebrow"><span className="auction-live-pulse" /> KAYAD AUCTIONS <span className="auction-eyebrow-divider" /> CURATED VEHICLE MARKET</div>
          <div className="auction-hero-grid">
            <div>
              <h1 className="auction-hero-title">{user?.name ? `Welcome back, ${String(user.name).split(' ')[0]}.` : 'The room is open.'}<br /><em>{favorites.size ? `${favorites.size} saved ${favorites.size === 1 ? 'auction is' : 'auctions are'} waiting.` : 'Your next car is waiting.'}</em></h1>
              <p className="auction-hero-copy">Discover verified vehicles, follow live bidding and move from registration to fulfilment in one beautifully connected experience.</p>
              <div className="auction-trust-row">
                <span><ShieldCheck size={15} /> Verified listings</span>
                <span><Radio size={15} /> Live bidding</span>
                <span><Shield size={15} /> Protected settlement</span>
              </div>
            </div>
            <div className="auction-hero-stat-card">
              <div className="auction-stat-icon"><Sparkles size={18} /></div>
              <div><span>Market pulse</span><strong>{tab === 'saved' ? current.length : live.length} {tab === 'saved' ? 'saved' : 'auctions live'}</strong><small>{favorites.size ? `${favorites.size} in your watchlist` : `${scheduled.length} more starting soon`}</small></div>
              <ArrowUpRight size={18} className="auction-stat-arrow" />
            </div>
          </div>
        </div>
      </section>

      <div className="auction-segment-grid">
        <button onClick={() => setTab('live')} className={`auction-segment ${tab === 'live' ? 'is-active' : ''}`}>
          <div className="auction-segment-icon"><Radio size={16} /></div><div><div className="auction-segment-label">Live now</div><div className="auction-segment-value">{live.length}</div></div>
        </button>
        <button onClick={() => setTab('scheduled')} className={`auction-segment ${tab === 'scheduled' ? 'is-active' : ''}`}>
          <div className="auction-segment-icon"><TimerReset size={16} /></div><div><div className="auction-segment-label">Starting soon</div><div className="auction-segment-value">{scheduled.length}</div></div>
        </button>
        <button onClick={() => setTab('ended')} className={`auction-segment ${tab === 'ended' ? 'is-active' : ''}`}>
          <div className="auction-segment-icon"><CheckCircle2 size={16} /></div><div><div className="auction-segment-label">Completed</div><div className="auction-segment-value">{ended.length}</div></div>
        </button>
        <button onClick={() => setTab('saved')} className={`auction-segment ${tab === 'saved' ? 'is-active' : ''}`}>
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

      {message && <div className="p-3 rounded-xl bg-slate-100 text-slate-700 text-sm">{message}</div>}
      {error && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <Card className="p-10 text-center auction-interaction-glow"><Gavel className="w-8 h-8 mx-auto text-slate-400 mb-3" /><p className="font-bold text-slate-800">{tab === 'saved' ? 'Your watchlist is ready for its first favourite.' : 'No auctions in this section.'}</p><p className="text-sm text-slate-500 mt-1">{tab === 'saved' ? 'Save a vehicle from any room and it will return here with the same live data.' : 'KAYAD shows only auctions returned by the backend; it never manufactures local auction records.'}</p>{tab === 'saved' && <div className="mt-5"><AuctionHistoryEmptyAction onExplore={() => setTab('live')} /></div>}</Card>
      )}

      <div className="auction-card-grid">
        {filtered.map((auction) => {
          const id = String(auction.carId || auction.id);
          const image = imageUrl(auction.car?.images);
          const isLive = tab === 'live';
          return (
            <Card key={auction.id} className="auction-card overflow-hidden group auction-touch-card auction-interaction-glow">
              <button onClick={() => openAuction(auction)} className="block w-full text-left">
                <div className="auction-card-media relative h-52 bg-slate-100 overflow-hidden">
                  {image ? <LazyImage src={image} alt={title(auction)} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" /> : <div className="h-full flex items-center justify-center text-slate-400">No image supplied</div>}
                  <div className="auction-card-badge absolute top-3 left-3"><Badge variant={isLive ? 'accent' : 'neutral'}>{isLive ? 'LIVE NOW' : tab === 'scheduled' ? 'STARTING SOON' : 'COMPLETED'}</Badge></div>
                  <div className="auction-card-overlay" aria-hidden="true" />
                </div>
              </button>
              <div className="auction-card-body p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="auction-card-title font-bold text-[#176B87] truncate">{title(auction)}</h3><p className="auction-card-meta text-xs text-slate-500 mt-1">{[auction.car?.year, auction.car?.brand, auction.car?.model, auction.car?.location || auction.car?.location_city].filter(Boolean).join(' • ')}</p></div>
                  <AuctionSavedPulse active={favorites.has(id)} onToggle={() => void watch(auction)} label="Watch" />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" /> {isLive ? `${remaining(auction.endTime)} remaining` : tab === 'scheduled' ? `Starts in ${remaining(auction.startTime)}` : 'Auction ended'}</span>
                  <span>{auction.bidCount || 0} bids</span>
                </div>
                <div className="flex items-end justify-between">
                  <div><p className="text-xs text-slate-500">{isLive ? 'Current bid' : 'Starting bid'}</p><p className="auction-card-price text-xl font-black text-slate-900">{money(isLive ? auction.highestBid : auction.startingBid)}</p></div>
                  <div className="text-right">{auction.car?.is_verified_dealer && <span className="text-xs text-emerald-700 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Verified organizer</span>}<Button onClick={() => openAuction(auction)} className="mt-2">{isLive ? 'Open auction' : 'View auction'}</Button></div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AuctionsView;
