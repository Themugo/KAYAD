import { Link } from 'react-router-dom';
import { BidStatusBadge, TimeRemaining } from './BuyerWidgets';
import '../../../styles/dashboard.css';

export default function BuyerBidsTab({ myBids, bidLoading }) {
  if (bidLoading) {
    return (
      <div className="dash-loading-center"><div className="spinner" /></div>
    );
  }

  if (myBids.length === 0) {
    return (
      <div className="bids-empty-card">
        <div className="bids-empty-header">
          <div className="bids-empty-title">Your Bids</div>
          <Link to="/showroom?filter=auction" style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>Browse Auctions →</Link>
        </div>
        <div className="bids-empty-body">
          <div className="bids-empty-icon">🔨</div>
          <div className="bids-empty-title">Track your bids here</div>
          <div className="bids-empty-desc">
            Visit a live auction page and place a bid to see it tracked here. Winning bids will show payment and escrow status.
          </div>
          <Link to="/showroom?filter=auction" className="bids-empty-cta">
            View Live Auctions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bids-list">
      {myBids.slice(0, 10).map(bid => {
        const car = bid.car || {};
        const img = car.images?.[0]?.url || car.images?.[0] || car.image;
        return (
          <Link key={bid._id} to={`/cars/${car._id || bid.carId}`}>
            <div className="bid-item">
              {img ? (
                <img src={img} alt={car.title} loading="lazy" decoding="async" className="bid-item-thumb" />
              ) : (
                <div className="bid-item-thumb-placeholder" />
              )}
              <div className="bid-item-info">
                <div className="bid-item-title">{car.title || 'Vehicle'}</div>
                <div className="bid-item-details">
                  <span className="bid-item-amount">
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
