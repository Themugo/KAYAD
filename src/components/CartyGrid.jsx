import { Link } from 'react-router-dom';

export default function CartyGrid({ car }) {
  const coverIdx = car.coverImage ?? 0;
  const img = car.images?.[coverIdx]?.url || car.images?.[coverIdx] || car.image;
  const isAuction = car.auctionStatus === 'live' || car.isAuction;
  const isLive = car.auctionStatus === 'live';
  const linkTo = isLive ? `/auction/${car._id}` : `/cars/${car._id}`;

  return (
    <Link to={linkTo} style={{ display: 'block' }}>
      <div className="card" style={{
        overflow: 'hidden', borderRadius: '2.5rem', background: '#0A0A0A',
        border: '1px solid rgba(255,255,255,0.05)', padding: 0, position: 'relative',
        transition: 'all 0.5s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,67,0.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
      >
        <div style={{ aspectRatio: '16/10', overflow: 'hidden' }}>
          {img ? (
            <img src={img} alt={car.title} style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transition: 'transform 0.7s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1) rotate(1deg)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, color: 'var(--text-dim)' }}>🚗</div>
          )}
        </div>

        <div style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)',
          padding: '6px 16px', borderRadius: '9999px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 900, letterSpacing: '0.1em',
            color: 'var(--gold-light)', textTransform: 'uppercase', fontStyle: 'italic',
          }}>
            {isAuction ? 'Live Auction' : 'Verified Stock'}
          </span>
        </div>

        <div style={{ padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 900,
                fontSize: '1.15rem', color: 'var(--text)',
                textTransform: 'uppercase', fontStyle: 'italic', lineHeight: 1.1,
              }}>
                {car.title}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, marginTop: 4, textTransform: 'uppercase' }}>
                {car.location?.city || 'Nairobi'} • {car.mileage ? `${Number(car.mileage).toLocaleString()} KM` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase' }}>
                {isAuction ? 'Current Bid' : 'Price'}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem', fontWeight: 900, color: 'var(--text)' }}>
                KES {Number(car.price || car.currentBid || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{
            width: '100%', padding: '16px 0', background: 'var(--text)', color: 'var(--bg)',
            fontWeight: 900, borderRadius: '1.25rem', textAlign: 'center', fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontStyle: 'italic',
            transition: 'background 0.3s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--text)'; }}
          >
            View Vehicle Details
          </div>
        </div>
      </div>
    </Link>
  );
}
