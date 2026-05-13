import { Link } from 'react-router-dom';
import { formatKES } from '../api/api';

export default function CartyGrid({ car }) {
  const coverIdx = car.coverImage ?? 0;
  const img = car.images?.[coverIdx]?.url || car.images?.[coverIdx];
  const isLive = car.auctionStatus === 'live';
  const linkTo = isLive ? `/auction/${car._id}` : `/cars/${car._id}`;

  return (
    <Link to={linkTo} style={{ display: 'block' }}>
      <div className="card" style={{
        overflow: 'hidden', borderRadius: '2.5rem', background: '#0A0A0A',
        border: '1px solid rgba(255,255,255,0.05)', padding: 16,
        transition: 'all 0.3s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,67,0.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
      >
        <div style={{ aspectRatio: '16/10', borderRadius: '1.5rem', overflow: 'hidden', background: 'var(--surface)' }}>
          {img ? (
            <img src={img} alt={car.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, color: 'var(--text-dim)' }}>🚗</div>
          )}
        </div>
        <div style={{ padding: '16px 4px 4px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 900, color: 'var(--text)', textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 4 }}>
            {car.title}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--gold)', fontWeight: 600, marginBottom: 16 }}>
            KES {formatKES(car.price)}
          </div>
          <div style={{
            width: '100%', padding: '14px 0', background: 'var(--text)', color: 'var(--bg)',
            fontWeight: 900, borderRadius: '1.25rem', textAlign: 'center', fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontStyle: 'italic',
            transition: 'all 0.3s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--text)'; }}
          >
            {isLive ? 'Join Auction' : 'View Details'}
          </div>
        </div>
      </div>
    </Link>
  );
}
