import { Link } from 'react-router-dom';
import CartyGrid from '../../../components/CartyGrid';

export default function HomeLiveAuctions({ cars, isMobile }) {
  if (!cars || cars.length === 0) return null;

  return (
    <section style={{ padding: '32px 0 16px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 9999, padding: '2px 8px',
                fontSize: 8, color: '#ef4444', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.5s infinite' }} />
                Live Now
              </span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
              fontSize: 'clamp(1.1rem, 2vw, 1.5rem)', color: '#fff', margin: 0, lineHeight: 1,
            }}>
              Live <span style={{ color: 'var(--gold)' }}>Auctions</span>
            </h2>
          </div>
          <Link to="/auctions/calendar" style={{
            fontSize: 11, color: 'rgba(239,68,68,0.7)', fontWeight: 700,
            textDecoration: 'none', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: 4,
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(239,68,68,0.7)'}
          >View All Auctions →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {cars.map(car => {
            const endTime = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
            const remaining = endTime - Date.now();
            const hrs = Math.max(0, Math.floor(remaining / 3600000));
            const mins = Math.max(0, Math.floor((remaining % 3600000) / 60000));
            const secs = Math.max(0, Math.floor((remaining % 60000) / 1000));
            const timeStr = remaining > 0 ? `${hrs}h ${mins}m ${secs}s` : 'Ending soon';

            return (
              <div key={car._id} style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: 8, left: 8, zIndex: 2,
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(239,68,68,0.9)', borderRadius: 6, padding: '3px 10px',
                }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', display: 'block', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: 8, color: '#fff', fontWeight: 800, letterSpacing: '0.06em' }}>LIVE</span>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginLeft: 2 }}>
                    {timeStr}
                  </span>
                </div>
                <CartyGrid car={car} isMobile={isMobile} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
