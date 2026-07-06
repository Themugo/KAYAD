import { Link } from 'react-router-dom';
import { BidStatusBadge, TimeRemaining } from './BuyerWidgets';

export default function BuyerBidsTab({ myBids, bidLoading }) {
  if (bidLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><div className="spinner" /></div>
    );
  }

  if (myBids.length === 0) {
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Your Bids</div>
          <Link to="/showroom?filter=auction" style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>Browse Auctions →</Link>
        </div>
        <div style={{ padding: '32px 22px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
          <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 12 }}>🔨</div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Track your bids here</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)', maxWidth: 340, margin: '0 auto', lineHeight: 1.6 }}>
            Visit a live auction page and place a bid to see it tracked here. Winning bids will show payment and escrow status.
          </div>
          <Link to="/showroom?filter=auction" style={{ display: 'inline-block', marginTop: 18, padding: '10px 24px', background: 'var(--gold)', color: '#000', borderRadius: 9999, fontSize: 11, fontWeight: 900, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            View Live Auctions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {myBids.slice(0, 10).map(bid => {
        const car = bid.car || {};
        const img = car.images?.[0]?.url || car.images?.[0] || car.image;
        return (
          <Link key={bid._id} to={`/cars/${car._id || bid.carId}`} style={{ textDecoration: 'none' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-glow-strong)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {img ? (
                <img src={img} alt={car.title} loading="lazy" decoding="async" style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 60, height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{car.title || 'Vehicle'}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700 }}>
                    KES {Number(bid.amount || 0).toLocaleString()}
                  </span>
                  {car.auctionEnd && <TimeRemaining endTime={car.auctionEnd} />}
                </div>
              </div>
              <BidStatusBadge status={bid.status} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
