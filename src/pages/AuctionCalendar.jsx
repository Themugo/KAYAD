import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bell, RefreshCw, AlertTriangle, Gavel } from 'lucide-react';
import { notifAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { fetchList, getErrorMessage } from '../services/auctionService';
import usePageMeta from '../hooks/usePageMeta';
import EmptyState from '../components/EmptyState';

export default function AuctionCalendar() {
  usePageMeta('Auction House', 'Live and upcoming car auctions in Kenya. Bid live on premium vehicles with Kayad.');
  const { toast } = useToast();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('live');
  const [page, setPage] = useState(1);
  const [reminding, setReminding] = useState({});
  const [hasMore, setHasMore] = useState(false);
  const PER_PAGE = 12;

  const load = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: pageNum, limit: PER_PAGE };
      if (filter !== 'all') params.status = filter === 'live' ? 'active' : undefined;
      const result = await fetchList(params);
      const items = result.auctions;

      if (filter === 'live') {
        const now = Date.now();
        const liveItems = items.filter(a => {
          const end = a.endTime ? new Date(a.endTime).getTime() : 0;
          const start = a.startTime ? new Date(a.startTime).getTime() : 0;
          return start <= now && end > now;
        });
        setAuctions(append ? prev => [...prev, ...liveItems] : liveItems);
        setHasMore(result.pagination.page < result.pagination.pages);
      } else {
        const now = Date.now();
        const upcomingItems = items.filter(a => {
          const start = a.startTime ? new Date(a.startTime).getTime() : 0;
          return start > now;
        });
        setAuctions(append ? prev => [...prev, ...upcomingItems] : upcomingItems);
        setHasMore(result.pagination.page < result.pagination.pages);
      }
    } catch (err) {
      const msg = err.message || 'Could not load auctions';
      setError(msg);
      if (!append) setAuctions([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { setPage(1); load(1); }, [load]);

  const handleRetry = () => { setPage(1); load(1); };

  const handleNotifyMe = async (auctionId) => {
    setReminding(p => ({ ...p, [auctionId]: true }));
    try {
      await notifAPI.createReminder?.({ type: 'auction_start', targetId: auctionId });
      toast('We will notify you when this auction goes live!', 'success');
    } catch {
      toast('Could not set reminder. Try again.', 'error');
    } finally {
      setReminding(p => ({ ...p, [auctionId]: false }));
    }
  };

  const filteredList = useMemo(() => {
    const now = Date.now();
    if (filter === 'live') return auctions.filter(a => {
      const end = a.endTime ? new Date(a.endTime).getTime() : 0;
      const start = a.startTime ? new Date(a.startTime).getTime() : 0;
      return start <= now && end > now;
    });
    if (filter === 'scheduled') return auctions.filter(a => {
      const start = a.startTime ? new Date(a.startTime).getTime() : 0;
      return start > now;
    });
    return auctions;
  }, [auctions, filter]);

  const paged = filteredList.slice(0, page * PER_PAGE);

  const TABS = [
    { key: 'live', label: '🟢 Live Now' },
    { key: 'scheduled', label: '⏳ Upcoming' },
    { key: 'all', label: 'All Auctions' },
  ];

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 100, paddingBottom: 60 }}>
        <div style={{ marginBottom: 32 }}>
          <div className="section-eyebrow">Auction House</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: 'white', fontStyle: 'italic' }}>
            Auction <span style={{ color: 'var(--gold)' }}>House</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Live and upcoming auctions on Kayad.</p>
        </div>

        <div role="tablist" aria-label="Auction filter" style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
          {TABS.map(tab => (
            <button key={tab.key} role="tab" aria-selected={filter === tab.key}
              className={`btn btn-sm ${filter === tab.key ? 'btn-gold' : 'btn-outline'}`}
              onClick={() => { setFilter(tab.key); setPage(1); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {tab.key === 'live' && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: filter === tab.key ? '#000' : '#22c55e',
                  display: 'inline-block',
                  animation: filter === tab.key ? 'none' : 'pulse 1.5s infinite',
                }} />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {loading && auctions.length === 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card" style={{ overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ height: 2 }} />
                <div className="skeleton" style={{ aspectRatio: '16/10', borderRadius: 0 }} />
                <div style={{ padding: 16 }}>
                  <div className="skeleton" style={{ height: 18, width: '70%', marginBottom: 8, borderRadius: 4 }} />
                  <div className="skeleton" style={{ height: 12, width: '45%', marginBottom: 8, borderRadius: 4 }} />
                  <div className="skeleton" style={{ height: 12, width: '30%', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>

        ) : error && auctions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
            <div style={{ opacity: 0.35, marginBottom: 16 }}>
              <AlertTriangle size={48} strokeWidth={1.2} />
            </div>
            <h3 style={{ color: 'var(--text)' }}>{error}</h3>
            <p style={{ marginTop: 8, marginBottom: 20 }}>
              You can try again or browse vehicles instead.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button type="button" onClick={handleRetry} className="btn btn-gold btn-sm">
                <RefreshCw size={14} style={{ marginRight: 6 }} />
                Try Again
              </button>
              <Link to="/showroom" className="btn btn-outline btn-sm">
                Browse Vehicles
              </Link>
            </div>
          </div>

        ) : !loading && filteredList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
            <Gavel size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <h3 style={{ color: 'var(--text)' }}>
              {filter === 'live' ? 'No live auctions right now' :
               filter === 'scheduled' ? 'No upcoming auctions' :
               'No auctions found'}
            </h3>
            <p style={{ marginTop: 8 }}>
              {filter === 'live'
                ? 'Check the Upcoming tab for scheduled auctions, or browse vehicles in the showroom.'
                : filter === 'scheduled'
                ? 'Dealers will schedule new auctions soon. Check back later.'
                : 'No auctions are currently available on the platform.'}
            </p>
            <div style={{ marginTop: 16 }}>
              <Link to="/showroom" className="btn btn-outline btn-sm">Browse Vehicles</Link>
            </div>
          </div>

        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {paged.map(auction => {
                const isLive = auction.isLive;
                const startDate = auction.startTime ? new Date(auction.startTime) : null;
                const endDate = auction.endTime ? new Date(auction.endTime) : null;
                const countdownTarget = isLive ? endDate : startDate;
                const diff = countdownTarget ? countdownTarget.getTime() - Date.now() : 0;
                const days = Math.max(0, Math.floor(diff / 86400000));
                const hrs = Math.max(0, Math.floor((diff % 86400000) / 3600000));
                const mins = Math.max(0, Math.floor((diff % 3600000) / 60000));
                const secs = Math.max(0, Math.floor((diff % 60000) / 1000));
                const image = auction.image;
                return (
                  <Link key={auction._id} to={isLive ? `/auction/${auction.carId}` : `/cars/${auction.carId}`} style={{ textDecoration: 'none' }}>
                    <div className="card" style={{
                      overflow: 'hidden', transition: 'transform 0.25s, box-shadow 0.25s',
                      border: '1px solid var(--border)', position: 'relative',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'; e.currentTarget.style.borderColor = 'rgba(212,196,168,0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                      <div style={{ height: 2, background: isLive ? 'linear-gradient(90deg, #22c55e, var(--gold))' : 'linear-gradient(90deg, var(--gold-dark), var(--gold-muted))' }} />
                      <div style={{ aspectRatio: '16/10', background: 'var(--surface)', overflow: 'hidden' }}>
                        {image ? (
                          <img src={image} alt={auction.title} loading="lazy" decoding="async"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 32 }}>🚗</div>
                        )}
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <h4 style={{ fontWeight: 700, color: 'white', fontSize: 14, lineHeight: 1.2, margin: 0, flex: 1 }}>{auction.title}</h4>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '2px 8px', borderRadius: 9999, flexShrink: 0, marginLeft: 8,
                            fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                            background: isLive ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                            color: isLive ? '#22c55e' : '#f59e0b',
                            border: `1px solid ${isLive ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                          }}>
                            {isLive && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e', display: 'block', animation: 'pulse 1.5s infinite' }} />}
                            {isLive ? 'Live' : 'Upcoming'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {countdownTarget ? (
                            isLive
                              ? `Ends in ${days > 0 ? days + 'd ' : ''}${hrs}h ${mins}m ${secs}s`
                              : `Starts in ${days > 0 ? days + 'd ' : ''}${hrs}h ${mins}m`
                          ) : 'Date to be announced'}
                        </div>
                        {auction.bidsCount > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                            {auction.bidsCount} bid{auction.bidsCount !== 1 ? 's' : ''}
                          </div>
                        )}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          marginTop: 10, paddingTop: 10,
                          borderTop: '1px solid var(--border)',
                        }}>
                          <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(auction.currentBid || auction.price)}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {auction.brand} {auction.model}
                          </span>
                        </div>
                        {!isLive && (
                          <div style={{ marginTop: 10 }}>
                            <button
                              type="button"
                              onClick={e => { e.preventDefault(); e.stopPropagation(); handleNotifyMe(auction._id); }}
                              disabled={reminding[auction._id]}
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: 11, padding: '4px 12px', width: '100%' }}>
                              <Bell size={11} style={{ marginRight: 4 }} />
                              {reminding[auction._id] ? 'Setting reminder...' : 'Notify Me'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {hasMore && !loading && (
              <div style={{ textAlign: 'center', marginTop: 28 }}>
                <button
                  className="btn btn-outline"
                  onClick={() => { const next = page + 1; setPage(next); load(next, true); }}
                >
                  Load More
                </button>
              </div>
            )}

            {loading && auctions.length > 0 && (
              <div className="loading-center" style={{ padding: 20 }}>
                <div className="spinner" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
