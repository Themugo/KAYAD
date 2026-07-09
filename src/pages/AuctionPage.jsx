import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_CARS } from '../data/mockCars.js';
import { formatPrice, formatPriceFull, formatCountdown } from '../utils/formatters.js';

function AuctionCard({ car }) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState('');
  const [bidAmount, setBidAmount] = useState('');

  useEffect(() => {
    if (!car.auctionEnd) return;
    const tick = () => setCountdown(formatCountdown(car.auctionEnd));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [car.auctionEnd]);

  const minBid = car.currentBid + 50000;

  return (
    <div className="auction-card">
      <div className="auction-card-image">
        <img
          src={car.image}
          alt={car.title}
          loading="lazy"
          onError={(e) => { e.target.src = 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800'; }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(7,9,12,0.7) 0%, transparent 50%)'
        }} />
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
          <span className="badge badge-live">LIVE</span>
        </div>
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(7,9,12,0.85)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(200,150,42,0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Ends in</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--gold-400)', animation: 'countdown-pulse 1s ease-in-out infinite', fontVariantNumeric: 'tabular-nums' }}>{countdown}</div>
        </div>
      </div>

      <div className="auction-card-body">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {car.title} {car.year}
          </h3>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <span className="spec-tag">{car.fuel}</span>
          <span className="spec-tag">{car.mileage}</span>
          <span className="spec-tag">{car.location}</span>
        </div>

        <div className="auction-bids-row">
          <div className="bid-info">
            <div className="label">Current Bid</div>
            <div className="value">{formatPriceFull(car.currentBid)}</div>
            <div className="count">{car.totalBids} bids placed</div>
          </div>
          <div className="bid-info" style={{ textAlign: 'right' }}>
            <div className="label">Reserve Price</div>
            <div className="value">{formatPrice(car.price)}</div>
            <div className="count" style={{ color: 'var(--green-400)' }}>Reserve met ✓</div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <input
            type="number"
            className="form-input"
            placeholder={`Min bid: ${formatPrice(minBid)}`}
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              alert(`Bid of KES ${Number(bidAmount).toLocaleString()} placed! Sign in to confirm.`);
              setBidAmount('');
            }}
            disabled={!bidAmount || Number(bidAmount) < minBid}
          >
            Place Bid
          </button>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', marginTop: 6, color: 'var(--text-secondary)' }}
          onClick={() => navigate(`/car/${car.id}`)}
        >
          View Full Details →
        </button>
      </div>
    </div>
  );
}

export default function AuctionPage() {
  const auctions = MOCK_CARS.filter((c) => c.isAuction);

  return (
    <>
      <div className="auction-hero">
        <div className="container">
          <div className="auction-live-banner">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green-400)', animation: 'pulse-dot 1.4s infinite', display: 'inline-block' }} />
            Live Auctions — Bidding Open Now
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, marginBottom: 12, lineHeight: 1.15 }}>
            Bid on Premium Vehicles
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: 520 }}>
            Real-time competitive bidding with M-Pesa escrow protection. Every vehicle is verified and inspected. Win the auction, pay securely, drive away.
          </p>

          <div style={{ display: 'flex', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Live Auctions', value: auctions.length },
              { label: 'Total Bids Today', value: auctions.reduce((a, c) => a + (c.totalBids || 0), 0) },
              { label: 'Avg. Saving vs. Market', value: '12%' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 20px', minWidth: 140 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold-400)' }}>{s.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        <div style={{ padding: '40px 0' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>
              {auctions.length} Active Auctions
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Bids update in real-time. Sign in to participate.
            </p>
          </div>

          <div className="auction-grid">
            {auctions.map((car) => (
              <AuctionCard key={car.id} car={car} />
            ))}
          </div>

          {auctions.length === 0 && (
            <div className="empty-state">
              <div className="icon">🔨</div>
              <h3>No active auctions</h3>
              <p>Check back soon — new auctions start daily</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
