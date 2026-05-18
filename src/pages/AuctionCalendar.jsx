import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI, isDemoMode } from '../api/api';
import { filterMockCars } from '../data/mockCars';
import usePageMeta from '../hooks/usePageMeta';

export default function AuctionCalendar() {
  usePageMeta('Auction Calendar', 'View upcoming and ongoing car auctions in Kenya. Bid live on premium vehicles with Kayad.');
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = () => {
      const all = isDemoMode() ? filterMockCars({}) : [];
      const auctionCars = all.filter(c => c.auctionStatus === 'live' || c.auctionStatus === 'scheduled' || c.allowBid);
      setCars(auctionCars);
      setLoading(false);
    };
    if (isDemoMode()) {
      load();
    } else {
      carsAPI.list({ limit: 100 })
        .then(data => {
          const all = data.cars || data.data || [];
          setCars(all.filter(c => c.auctionStatus === 'live' || c.auctionStatus === 'scheduled' || c.allowBid));
        })
        .catch(load)
        .finally(() => setLoading(false));
    }
  }, []);

  const filtered = filter === 'all' ? cars : cars.filter(c => c.auctionStatus === filter);

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 100, paddingBottom: 60 }}>
        <div style={{ marginBottom: 40 }}>
          <div className="section-eyebrow">Auction House</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: 'white', fontStyle: 'italic' }}>
            Auction <span style={{ color: 'var(--gold)' }}>Calendar</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Live and upcoming auctions on Kayad.</p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'live', label: '🟢 Live' },
            { key: 'scheduled', label: '⏳ Upcoming' },
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
              const endDate = car.auctionEnd ? new Date(car.auctionEnd) : null;
              const diff = endDate ? endDate - new Date() : 0;
              const days = Math.floor(diff / 86400000);
              const hrs = Math.floor((diff % 86400000) / 3600000);
              const image = car.images?.[0]?.url || car.images?.[0] || car.coverImage || '';
              return (
                <Link key={car._id} to={`/auction/${car._id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ overflow: 'hidden', transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    <div style={{ aspectRatio: '16/10', background: 'var(--surface)', overflow: 'hidden' }}>
                      {image && <img src={image} alt={car.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <h4 style={{ fontWeight: 700, color: 'white', fontSize: 15 }}>{car.title}</h4>
                        <span className={`badge ${car.auctionStatus === 'live' ? 'badge-green' : 'badge-orange'}`}>
                          {car.auctionStatus === 'live' && <span className="live-dot" />}
                          {car.auctionStatus}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {endDate ? `${days}d ${hrs}h remaining` : 'No end date set'}
                      </p>
                      <p style={{ fontSize: 14, color: 'var(--gold)', fontFamily: 'monospace', marginTop: 8 }}>
                        KES {Number(car.price || 0).toLocaleString()}
                      </p>
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
