// src/components/CarCard.jsx
import { Link } from 'react-router-dom';
import { formatKES } from '../api/api';

export default function CarCard({ car, isComparing, onToggleCompare, compareCount }) {
  const img = car.images?.[0]?.url || car.images?.[0] || car.image;
  const carId = car._id || car.id;
  const isLive = car.auctionStatus === 'live' || car.isAuction || car.isLive;
  const linkTo = isLive ? `/auction/${carId}` : `/cars/${carId}`;
  const mileage = typeof car.mileage === 'string' ? car.mileage : car.mileage ? `${Number(car.mileage).toLocaleString()} km` : '';
  const location = car.location?.city || car.location;

  return (
    <Link to={linkTo} style={{ display: 'block' }}>
      <div className="card" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
        <div className="car-img-wrap">
          {img ? (
            <img src={img} alt={car.title} loading="lazy" />
          ) : (
            <div className="car-img-placeholder">🚗</div>
          )}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '40%',
            background: 'linear-gradient(transparent, rgba(10,22,40,0.85))',
            pointerEvents: 'none',
          }} />
          {isLive && (
            <div style={{ position: 'absolute', top: 10, left: 10 }}>
              <span className="badge badge-green" style={{ fontSize: 10 }}>
                <span className="live-dot" /> LIVE
              </span>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.3, marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{car.title}</h3>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {car.year && <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 4, padding: '2px 8px' }}>{car.year}</span>}
            {car.fuel && <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 4, padding: '2px 8px' }}>{car.fuel}</span>}
            {mileage && <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 4, padding: '2px 8px' }}>{mileage}</span>}
          </div>

          {location && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>📍 {location}</div>
          )}

          <div className="gold-line" style={{ margin: '8px 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="price-tag" style={{ fontSize: '1.1rem' }}>
              {isLive && car.currentBid > 0 ? formatKES(car.currentBid) : formatKES(car.price)}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>View →</span>
          </div>
        </div>

        {onToggleCompare && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleCompare(); }}
            title={isComparing ? 'Remove from compare' : compareCount >= 4 ? 'Max 4 for comparison' : 'Add to compare'}
            style={{
              position: 'absolute', top: 10, right: 10,
              background: isComparing ? 'var(--gold)' : 'rgba(10,22,40,0.8)',
              border: `1px solid ${isComparing ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: 6, padding: '2px 7px', fontSize: 10,
              color: isComparing ? '#0A1628' : 'var(--text)',
              cursor: compareCount >= 4 && !isComparing ? 'not-allowed' : 'pointer',
              fontWeight: 600, opacity: compareCount >= 4 && !isComparing ? 0.5 : 1,
              backdropFilter: 'blur(4px)', zIndex: 5,
            }}
          >
            {isComparing ? '✓' : '⇄'}
          </button>
        )}
      </div>
    </Link>
  );
}
