import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI } from '../api/api';
import { DEMO_CARS } from '../data/demoData';
import usePageMeta from '../hooks/usePageMeta';

export default function AuctionCalendar() {
  usePageMeta('Auction House', 'Live and upcoming car auctions in Kenya. Bid live on premium vehicles with Kayad.');
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('live');

  useEffect(() => {
    const enrichWithTimeStatus = (all) => {
      const now = Date.now();
      return all
        .filter(c => c.auctionStart || c.auctionEnd || c.allowBid)
        .map(c => {
          const start = c.auctionStart ? new Date(c.auctionStart).getTime() : 0;
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
      .catch(() => { setCars(enrichWithTimeStatus(DEMO_CARS)); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? cars : cars.filter(c => c._timeStatus === filter);

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

        <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
          {[
            { key: 'live', label: '🟢 Live Now' },
            { key: 'scheduled', label: '⏳ Upcoming' },
            { key: 'all', label: 'All Auctions' },
          ].map(tab => (
            <button key={tab.key} className={`btn btn-sm ${filter === tab.key ? 'btn-gold' : 'btn-outline'}`}
              onClick={() => setFilter(tab.key)}>{tab.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="loading-center" style={{ padding: 80 }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
            <h3>No auctions scheduled</h3>
            <p style={{ marginTop: 8 }}>Check back soon for upcoming auction events.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filtered.map(car => {
              const now = new Date();
              const isLive = car._timeStatus === 'live';
              const startDate = car.auctionStart ? new Date(car.auctionStart) : null;
              const endDate = car.auctionEnd ? new Date(car.auctionEnd) : null;
              const countdownTarget = isLive ? endDate : startDate;
              const diff = countdownTarget ? countdownTarget - now : 0;
              const days = Math.max(0, Math.floor(diff / 86400000));
              const hrs = Math.max(0, Math.floor((diff % 86400000) / 3600000));
              const mins = Math.max(0, Math.floor((diff % 3600000) / 60000));
              const image = car.images?.[0]?.url || car.images?.[0] || car.coverImage || '';
              return (
                <Link key={car._id} to={isLive ? `/auction/${car._id}` : `/cars/${car._id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ overflow: 'hidden', transition: 'transform 0.25s, box-shadow 0.25s', border: '1px solid var(--border)' }}
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
                          {isLive ? 'Live' : 'Upcoming'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {countdownTarget ? (
                          isLive
                            ? `Ends in ${days > 0 ? days + 'd ' : ''}${hrs}h ${mins}m`
                            : `Starts in ${days > 0 ? days + 'd ' : ''}${hrs}h ${mins}m`
                        ) : 'Date to be announced'}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
                        color: 'var(--gold)', marginTop: 10, paddingTop: 10,
                        borderTop: '1px solid var(--border)',
                      }}>
                        KES {Number(car.price || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
