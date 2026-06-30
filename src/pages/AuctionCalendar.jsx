import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { carsAPI, notifAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import usePageMeta from '../hooks/usePageMeta';

export default function AuctionCalendar() {
  usePageMeta('Auction House', 'Live and upcoming car auctions in Kenya. Bid live on premium vehicles with Kayad.');
  const { toast } = useToast();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('live');
  const [nowMs, setNowMs] = useState(Date.now());
  const [page, setPage] = useState(1);
  const [reminding, setReminding] = useState({});
  const PER_PAGE = 12;

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const enrichWithTimeStatus = (all) => {
      const now = Date.now();
      return all
        .filter(c => c.auctionStartTime || c.auctionEnd || c.allowBid)
        .map(c => {
          const start = c.auctionStartTime ? new Date(c.auctionStartTime).getTime() : 0;
          const end = c.auctionEnd ? new Date(c.auctionEnd).getTime() : 0;
          let timeStatus = 'scheduled';
          if (start > 0 && end > 0 && start <= now && end > now) timeStatus = 'live';
          else if (end > 0 && end <= now) timeStatus = 'ended';
          else if (start > now) timeStatus = 'scheduled';
          return { ...c, _timeStatus: timeStatus };
        })
        .filter(c => c._timeStatus !== 'ended');
    };

    carsAPI.list({ limit: 100, category: 'all' })
      .then(data => { setCars(enrichWithTimeStatus(data.cars || data.data || [])); })
      .catch((error) => {
        console.error('Failed to load auction calendar:', error);
        toast('Could not load auctions. Please check your connection.', 'error');
        setCars([]);
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const getTimeStatus = useCallback((car) => {
    const start = car.auctionStartTime ? new Date(car.auctionStartTime).getTime() : 0;
    const end = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
    if (start > 0 && end > 0 && start <= nowMs && end > nowMs) return 'live';
    if (start > nowMs) return 'scheduled';
    return 'ended';
  }, [nowMs]);

  const handleNotifyMe = async (carId) => {
    setReminding(p => ({ ...p, [carId]: true }));
    try {
      await notifAPI.createReminder?.({ type: 'auction_start', targetId: carId });
      toast('🔔 We\'ll notify you when this auction goes live!', 'success');
    } catch {
      toast('Could not set reminder. Try again.', 'error');
    } finally {
      setReminding(p => ({ ...p, [carId]: false }));
    }
  };

  const filteredList = useMemo(() => {
    const f = filter === 'all' ? cars : cars.filter(c => getTimeStatus(c) === filter);
    return f.filter(c => getTimeStatus(c) !== 'ended');
  }, [cars, filter, getTimeStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PER_PAGE));
  const paged = filteredList.slice(0, page * PER_PAGE);

  const TABS = [
    { key: 'live', label: 'Live Now', indicator: 'live' },
    { key: 'scheduled', label: 'Upcoming', indicator: 'scheduled' },
    { key: 'all', label: 'All Auctions', indicator: null },
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
              {tab.indicator === 'live' && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: filter === tab.key ? '#000' : '#22c55e',
                  display: 'inline-block',
                  animation: filter === tab.key ? 'none' : 'pulse 1.5s infinite',
                }} aria-hidden="true" />
              )}
              {tab.indicator === 'scheduled' && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  border: '1px solid currentColor',
                  display: 'inline-block',
                }} aria-hidden="true" />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-center" style={{ padding: 80 }}><div className="spinner" /></div>
        ) : filteredList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
            <h3>{filter === 'live' ? 'No live auctions right now' : filter === 'scheduled' ? 'No upcoming auctions' : 'No auctions found'}</h3>
            <p style={{ marginTop: 8 }}>
              {filter === 'live' ? 'Check the Upcoming tab for scheduled auctions.' : 'Check back soon for upcoming auction events.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {paged.map(car => {
                const isLive = getTimeStatus(car) === 'live';
                const startDate = car.auctionStartTime ? new Date(car.auctionStartTime) : null;
                const endDate = car.auctionEnd ? new Date(car.auctionEnd) : null;
                const countdownTarget = isLive ? endDate : startDate;
                const diff = countdownTarget ? countdownTarget.getTime() - nowMs : 0;
                const days = Math.max(0, Math.floor(diff / 86400000));
                const hrs = Math.max(0, Math.floor((diff % 86400000) / 3600000));
                const mins = Math.max(0, Math.floor((diff % 3600000) / 60000));
                const secs = Math.max(0, Math.floor((diff % 60000) / 1000));
                const image = car.images?.[0]?.url || car.images?.[0] || '';
                const bidCount = car.bidsCount || 0;
                return (
                  <Link key={car._id} to={isLive ? `/auction/${car._id}` : `/cars/${car._id}`} style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ overflow: 'hidden', transition: 'transform 0.25s, box-shadow 0.25s', border: '1px solid var(--border)', position: 'relative' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'; e.currentTarget.style.borderColor = 'rgba(212,196,168,0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                      <div style={{ height: 2, background: isLive ? 'linear-gradient(90deg, #22c55e, var(--gold))' : 'linear-gradient(90deg, var(--gold-dark), var(--gold-muted))' }} />
                      <div style={{ aspectRatio: '16/10', background: 'var(--surface)', overflow: 'hidden' }}>
                        {image && <img src={image} alt={car.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />}
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <h4 style={{ fontWeight: 700, color: 'white', fontSize: 14, lineHeight: 1.2, margin: 0, flex: 1 }}>{car.title}</h4>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '2px 8px', borderRadius: 9999, flexShrink: 0, marginLeft: 8,
                            fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                            background: isLive ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                            color: isLive ? '#22c55e' : '#f59e0b',
                            border: `1px solid ${isLive ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                          }}>
                            {isLive && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e', display: 'block', animation: 'pulse 1.5s infinite' }} />}
                            <span aria-hidden="true" style={{ display: 'none' }}>{isLive ? 'Live' : 'Upcoming'}</span>
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
                        {bidCount > 0 && !isLive && (
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                            {bidCount} bid{bidCount !== 1 ? 's' : ''}
                          </div>
                        )}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          marginTop: 10, paddingTop: 10,
                          borderTop: '1px solid var(--border)',
                        }}>
                          <span style={{
                            fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
                            color: 'var(--gold)',
                          }}>
                            KES {Number(car.price || 0).toLocaleString()}
                          </span>
                          {!isLive && (
                            <span
                              onClick={e => { e.preventDefault(); e.stopPropagation(); handleNotifyMe(car._id); }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleNotifyMe(car._id); } }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px', borderRadius: 6,
                                background: reminding[car._id] ? 'rgba(212,196,168,0.1)' : 'transparent',
                                border: `1px solid ${reminding[car._id] ? 'rgba(212,196,168,0.25)' : 'rgba(255,255,255,0.1)'}`,
                                color: reminding[car._id] ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
                                fontSize: 10, fontWeight: 600, cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => { if (!reminding[car._id]) { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.3)'; e.currentTarget.style.color = 'var(--gold)'; } }}
                              onMouseLeave={e => { if (!reminding[car._id]) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}
                            >
                              <Bell size={11} />
                              {reminding[car._id] ? 'Reminding...' : 'Notify me'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && paged.length < filteredList.length && (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button className="btn btn-outline" onClick={() => setPage(p => p + 1)}>
                  Load More ({filteredList.length - paged.length} remaining)
                </button>
              </div>
            )}

            {paged.length >= filteredList.length && filteredList.length > PER_PAGE && (
              <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
                Showing all {filteredList.length} auctions
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
