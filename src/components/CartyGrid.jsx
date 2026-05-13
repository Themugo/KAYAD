import { Link } from 'react-router-dom';
import AuctionTimer from './AuctionTimer';

export default function CartyGrid({ car }) {
  const coverIdx = car.coverImage ?? 0;
  const img = car.images?.[coverIdx]?.url || car.images?.[coverIdx] || car.image;
  const isElite = car.auctionStatus === 'live' || car.allowBid || car.isAuction;
  const isLive = car.auctionStatus === 'live';
  const linkTo = isLive ? `/auction/${car._id}` : `/cars/${car._id}`;
  const city = car.location?.city || car.location || 'Nairobi';

  return (
    <Link to={linkTo} style={{ display: 'block', textDecoration: 'none' }}>
      <div style={{
        overflow: 'hidden', borderRadius: '2.5rem', background: '#0A0A0A',
        border: isElite ? '1px solid rgba(212,168,67,0.35)' : '1px solid rgba(255,255,255,0.05)',
        boxShadow: isElite ? '0 0 40px rgba(212,168,67,0.08)' : 'none',
        padding: 0, position: 'relative',
        transition: 'all 0.5s var(--ease)',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = isElite ? 'rgba(212,168,67,0.7)' : 'rgba(255,255,255,0.2)';
          e.currentTarget.style.transform = 'translateY(-6px)';
          e.currentTarget.style.boxShadow = isElite ? '0 12px 60px rgba(212,168,67,0.15)' : '0 12px 40px rgba(0,0,0,0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = isElite ? 'rgba(212,168,67,0.35)' : 'rgba(255,255,255,0.05)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = isElite ? '0 0 40px rgba(212,168,67,0.08)' : 'none';
        }}
      >
        {/* ─── Elite Badge ─── */}
        {isElite && (
          <div style={{
            position: 'absolute', top: 20, left: 20, zIndex: 10,
            background: 'var(--gold)', color: '#000',
            padding: '6px 18px', borderRadius: '9999px',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(212,168,67,0.3)',
          }}>
            {isLive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#000' }} />}
            <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isLive ? 'Live Auction' : 'Elite Listing'}
            </span>
          </div>
        )}

        {/* ─── Image ─── */}
        <div style={{ aspectRatio: '16/10', overflow: 'hidden', position: 'relative' }}>
          {img ? (
            <img src={img} alt={car.title} style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transition: 'transform 0.7s var(--ease)',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, background: 'var(--surface)' }}>🚗</div>
          )}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
            background: 'linear-gradient(transparent, rgba(5,5,5,0.9))',
          }} />

          {/* ─── Pricing overlay ─── */}
          <div style={{
            position: 'absolute', bottom: 20, left: 24, right: 24,
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          }}>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
                {isElite ? 'Current Bid' : 'Price'}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: '#fff', fontStyle: 'italic' }}>
                KES {Number(car.price || car.currentBid || 0).toLocaleString()}
              </div>
            </div>
            {isLive && car.auctionEnd && (
              <AuctionTimer auctionId={car._id} initialEndTime={car.auctionEnd} size="sm" />
            )}
          </div>
        </div>

        {/* ─── Content ─── */}
        <div style={{ padding: '28px 28px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 900,
                fontSize: '1.25rem', color: '#fff',
                textTransform: 'uppercase', fontStyle: 'italic', lineHeight: 1.1,
              }}>
                {car.title}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                {[
                  car.year,
                  car.transmission,
                  city,
                ].filter(Boolean).map((s, i) => (
                  <span key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {i > 0 && <span style={{ marginRight: 12 }}>•</span>}{s}
                  </span>
                ))}
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>

          {/* ─── CTA ─── */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20,
          }}>
            <div style={{
              padding: '14px 0', background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.7)', borderRadius: '1.25rem', textAlign: 'center',
              fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
              transition: 'background 0.3s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            >
              View Details
            </div>
            <div style={{
              padding: '14px 0',
              background: isElite ? 'var(--gold)' : '#fff',
              color: '#000', borderRadius: '1.25rem', textAlign: 'center',
              fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
              transition: 'all 0.3s var(--ease)',
              boxShadow: isElite ? '0 4px 20px rgba(212,168,67,0.25)' : 'none',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isElite ? 'Place Bid' : 'Buy Now'}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
