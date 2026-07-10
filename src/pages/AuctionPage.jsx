// src/pages/AuctionPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_CARS, formatKES } from '../api/api';
import { CountdownDisplay } from '../hooks/useCountdown';

export default function AuctionPage() {
  const auctions = MOCK_CARS.filter((c) => c.isAuction);

  return (
    <div className="page">
      {/* Hero */}
      <div style={{ background: 'var(--surface)', padding: '48px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span className="live-dot" />
            <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live Auctions — Bidding Open Now</span>
          </div>
          <h1 style={{ marginBottom: 12 }}>Bid on Premium Vehicles</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 520, marginBottom: 24 }}>
            Real-time competitive bidding with M-Pesa escrow protection. Every vehicle is verified. Win the auction, pay securely, drive away.
          </p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Live Auctions', value: auctions.length },
              { label: 'Total Bids', value: auctions.reduce((a, c) => a + (c.totalBids || 0), 0) },
              { label: 'Avg. Saving', value: '12%' },
            ].map((s, i) => (
              <div key={i} className="stat-box" style={{ minWidth: 140 }}>
                <div className="stat-value" style={{ fontSize: '1.5rem' }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 4 }}>{auctions.length} Active Auctions</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Bids update in real-time. Sign in to participate.</p>
        </div>

        {auctions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔨</div>
            <h3>No active auctions</h3>
            <p>Check back soon — new auctions start daily</p>
          </div>
        ) : (
          <div className="car-grid">
            {auctions.map((car) => (
              <Link key={car.id} to={`/auction/${car.id}`} style={{ display: 'block' }}>
                <div className="card" style={{ overflow: 'hidden', cursor: 'pointer' }}>
                  <div className="car-img-wrap" style={{ position: 'relative' }}>
                    <img src={car.image} alt={car.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: 10, left: 10 }}>
                      <span className="badge badge-green"><span className="live-dot" /> LIVE</span>
                    </div>
                    <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(10,22,40,0.85)', backdropFilter: 'blur(4px)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: 'white' }}>
                      <CountdownDisplay endTime={car.auctionEnd} />
                    </div>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }}>{car.title} {car.year}</h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 4, padding: '2px 8px' }}>{car.fuel}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 4, padding: '2px 8px' }}>{car.mileage}</span>
                    </div>
                    <div className="gold-line" style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Current Bid</div>
                        <div className="price-tag" style={{ fontSize: '1.1rem' }}>{formatKES(car.currentBid)}</div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{car.totalBids} bids →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
