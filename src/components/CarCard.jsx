import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPrice, formatCountdown } from '../utils/formatters.js';

function IconCompare() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M8 7h12M8 12h12M8 17h12M4 7h0M4 12h0M4 17h0" />
    </svg>
  );
}
function IconHeart({ filled }) {
  return (
    <svg width="14" height="14" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}
function IconLocation() {
  return (
    <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

export default function CarCard({ car }) {
  const navigate = useNavigate();
  const [wished, setWished] = useState(false);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!car.isAuction || !car.auctionEnd) return;
    const tick = () => setCountdown(formatCountdown(car.auctionEnd));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [car.isAuction, car.auctionEnd]);

  return (
    <div className="car-card" onClick={() => navigate(`/car/${car.id}`)}>
      <div className="car-card-image">
        <img
          src={car.image}
          alt={car.title}
          loading="lazy"
          onError={(e) => { e.target.src = 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800'; }}
        />
        <div className="car-card-image-overlay" />

        <div className="card-top-row">
          <div style={{ display: 'flex', gap: '6px' }}>
            {car.isLive && <span className="badge badge-live">LIVE</span>}
            {car.isAuction && <span className="badge badge-gold">AUCTION</span>}
            {!car.isLive && !car.isAuction && car.year >= 2023 && <span className="badge badge-new">NEW IN</span>}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="card-wishlist-btn"
              onClick={(e) => { e.stopPropagation(); setWished(!wished); }}
              aria-label="Wishlist"
            >
              <IconHeart filled={wished} />
            </button>
            <button
              className="card-action-btn"
              onClick={(e) => e.stopPropagation()}
              aria-label="Compare"
            >
              <IconCompare />
            </button>
          </div>
        </div>

        {car.isAuction && countdown && (
          <div className="auction-timer">
            <div>
              <div className="timer-label">Ends in</div>
              <div className="timer-value">{countdown}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="timer-label">Current Bid</div>
              <div className="timer-value">{formatPrice(car.currentBid)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="car-card-body">
        <div className="car-title">{car.title} {car.year}</div>

        <div className="car-specs">
          <span className="spec-tag">{car.year}</span>
          <span className="spec-tag">{car.fuel}</span>
          <span className="spec-tag">{car.mileage}</span>
          {car.transmission && <span className="spec-tag">{car.transmission}</span>}
        </div>

        <div className="car-location">
          <span style={{ color: 'var(--gold-500)' }}><IconLocation /></span>
          {car.location}
        </div>

        <div className="car-card-footer">
          <div>
            <div className="car-price">{formatPrice(car.price)}</div>
            {car.isAuction && (
              <div className="car-price-sub">{car.totalBids} bids</div>
            )}
          </div>
          <span className="card-view-link">
            View <IconArrow />
          </span>
        </div>
      </div>
    </div>
  );
}
