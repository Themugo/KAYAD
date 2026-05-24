import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function AuctionSneakPeek({ cars = [] }) {
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    const now = Date.now();

    // Only show cars with a future auctionStart — truly upcoming, not static status
    const scheduled = cars
      .filter(c => {
        const start = c.auctionStart ? new Date(c.auctionStart).getTime() : 0;
        return start > now;
      })
      .sort((a, b) => new Date(a.auctionStart) - new Date(b.auctionStart))
      .slice(0, 6)
      .map(c => {
        const start = new Date(c.auctionStart);
        const diff = start - now;
        const days = Math.floor(diff / 86400000);
        const hrs = Math.floor((diff % 86400000) / 3600000);
        return {
          ...c,
          timeUntil: days > 0 ? `${days}d ${hrs}h` : `${hrs}h`,
          image: c.images?.[0]?.url || c.images?.[0] || '',
        };
      });

    setUpcoming(scheduled);
  }, [cars]);

  if (upcoming.length === 0) return null;

  return (
    <div style={{ padding: 32, background: '#050505' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'white', fontStyle: 'italic' }}>
            SNEAK <span style={{ color: 'var(--gold)' }}>PEEK</span>
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>The most anticipated auctions dropping this week.</p>
        </div>
        <Link to="/auctions/calendar" style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', borderBottom: '1px solid var(--gold)', paddingBottom: 4, textDecoration: 'none' }}>
          View Full Calendar →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {upcoming.map(car => (
          <Link key={car._id} to={`/auction/${car._id}`} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#111', borderRadius: '2rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden' }}>
                {car.timeUntil && (
                  <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '4px 12px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>Drops in: {car.timeUntil}</span>
                  </div>
                )}
                <img src={car.image} alt={car.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white' }}>{car.title}</h3>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--gold)' }}>Est. {car.price ? `KES ${Number(car.price).toLocaleString()}` : ''}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{car.dealer?.name || car.dealerName || 'Verified Showroom'}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                  <span style={{ flex: 1, padding: '12px 0', background: 'var(--gold)', color: 'black', borderRadius: 12, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', display: 'inline-block' }}>
                    Set Reminder
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
