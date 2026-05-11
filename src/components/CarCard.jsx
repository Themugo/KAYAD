// src/components/CarCard.jsx
import { Link } from 'react-router-dom';
import { formatKES } from '../api/api';

const DEAL_COLORS = {
  great:      { bg: 'rgba(34,197,94,0.1)',  color: '#22C55E', label: '🔥 Great Deal' },
  good:       { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6', label: '👍 Good Price' },
  fair:       { bg: 'rgba(212,168,67,0.1)', color: '#D4A843', label: '✓ Fair Price' },
  overpriced: { bg: 'rgba(239,68,68,0.1)',  color: '#EF4444', label: '↑ High Price'  },
};

export default function CarCard({ car }) {
  const img = car.images?.[0]?.url || car.images?.[0];
  const deal = car.dealRating ? DEAL_COLORS[car.dealRating] : null;
  const isLive = car.auctionStatus === 'live';

  return (
    <Link to={isLive ? `/auction/${car._id}` : `/cars/${car._id}`} style={{ display: 'block' }}>
      <div className="card" style={{ cursor: 'pointer' }}>
        {/* Image */}
        <div className="car-img-wrap">
          {img ? (
            <img src={img} alt={car.title} loading="lazy" />
          ) : (
            <div className="car-img-placeholder">🚗</div>
          )}
          {/* Badges overlay */}
          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {isLive && (
              <span className="badge badge-green" style={{ fontSize: 10 }}>
                <span className="live-dot" /> LIVE AUCTION
              </span>
            )}
            {car.isPromoted && <span className="badge badge-gold">★ FEATURED</span>}
            {car.isVerifiedDealer && <span className="badge badge-blue">✓ VERIFIED</span>}
          </div>
          {/* Deal rating */}
          {deal && (
            <div style={{
              position: 'absolute', top: 10, right: 10,
              background: deal.bg, color: deal.color,
              fontSize: 10, fontWeight: 700, padding: '3px 8px',
              borderRadius: 100, letterSpacing: '0.04em',
              backdropFilter: 'blur(4px)',
            }}>
              {deal.label}
            </div>
          )}
          {/* Bid count badge */}
          {car.bidsCount > 0 && (
            <div style={{
              position: 'absolute', bottom: 10, right: 10,
              background: 'rgba(10,22,40,0.8)', color: 'var(--gold-light)',
              fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600,
            }}>
              {car.bidsCount} bid{car.bidsCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.3, flex: 1 }}>{car.title}</h3>
          </div>

          {/* Specs row */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            {car.year && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📅 {car.year}</span>}
            {car.fuel && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⛽ {car.fuel}</span>}
            {car.transmission && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⚙️ {car.transmission}</span>}
            {car.mileage && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🛣 {Number(car.mileage).toLocaleString()} km</span>}
          </div>

          {car.location?.city && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-dim)' }}>
              📍 {car.location.city}
            </div>
          )}

          <div className="gold-line" style={{ margin: '12px 0' }} />

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              {isLive && car.currentBid > 0 ? (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Bid</div>
                  <div className="price-tag">{formatKES(car.currentBid)}</div>
                </div>
              ) : (
                <div className="price-tag">{formatKES(car.price)}</div>
              )}
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-dim)' }}>
              <div>👁 {car.views || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
