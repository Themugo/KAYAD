import { Link } from 'react-router-dom';
import { CountdownDisplay } from '../../../components/CountdownDisplay';

function fmtAuctionDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi',
    });
  } catch { return dateStr; }
}

export default function AuctionAnnouncement({ car }) {
  const _now = Date.now();
  const _auctionStartTime = car?.auctionStartTime ? new Date(car.auctionStartTime).getTime() : 0;
  const _auctionEnd = car?.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
  const isLive = _auctionStartTime > 0 && _auctionEnd > 0 && _auctionStartTime <= _now && _auctionEnd > _now;
  const isScheduled = car?.auctionStatus === 'scheduled';
  const showAuctionCard = isLive || isScheduled;

  if (!showAuctionCard) {
    return (
      <div style={{
        background: 'var(--card)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)', padding: 14, marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>🔔</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Auction House</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Live online car auctions — new to Kenya</div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
          Kayad brings live auctions to Kenya. Watch, bid, and win premium vehicles in real time from your phone.
        </p>
        <Link to="/auctions/calendar" style={{
          display: 'block', textAlign: 'center', padding: '9px 0',
          borderRadius: 8, fontWeight: 700, fontSize: 12,
          background: 'var(--surface)', color: 'var(--gold)',
          border: '1px solid rgba(212,196,168,0.2)',
          textDecoration: 'none', transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.2)'; }}>
          🏛️ Browse Auction House →
        </Link>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--card)', borderRadius: 'var(--radius-lg)',
      border: '1px solid rgba(212,196,168,0.3)', overflow: 'hidden',
      marginBottom: 14,
    }}>
      <div style={{
        height: 3,
        background: isLive
          ? 'linear-gradient(90deg, #ef4444, var(--gold))'
          : 'linear-gradient(90deg, var(--gold-dark), var(--gold-muted))',
      }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 18 }}>🔔</span>
          <div>
            <div style={{ fontSize: 10, color: isLive ? '#ef4444' : '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isLive ? '🔴 Live Auction' : '⏳ Upcoming Auction'}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Bid live from anywhere in Kenya</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, fontSize: 12, color: 'var(--text-muted)' }}>
          {car?.dealer?.name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🏛️</span>
              <span>Hosted by <strong style={{ color: 'var(--text)' }}>{car.dealer.name}</strong></span>
            </div>
          )}
          {car?.auctionEnd && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📅</span>
              <span>{isLive ? 'Ends' : 'Auction date'}: <strong style={{ color: 'var(--text)' }}>{fmtAuctionDate(car.auctionEnd)}</strong></span>
            </div>
          )}
          {isLive && car?.auctionEnd && (
            <div style={{ marginTop: 4 }}>
              <CountdownDisplay endTime={car.auctionEnd} size="sm" />
            </div>
          )}
          {car?.bidsCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>👥</span>
              <span><strong style={{ color: 'var(--text)' }}>{car.bidsCount}</strong> bid{car.bidsCount !== 1 ? 's' : ''} placed</span>
            </div>
          )}
        </div>
        <Link to={`/auction/${car._id}`} style={{
          display: 'block', textAlign: 'center', padding: '10px 0',
          borderRadius: 8, fontWeight: 800, fontSize: 13,
          background: isLive
            ? 'linear-gradient(135deg, var(--gold), var(--gold-muted))'
            : 'var(--surface)',
          color: isLive ? '#0A1628' : 'var(--gold)',
          border: isLive ? 'none' : '1px solid rgba(212,196,168,0.2)',
          textDecoration: 'none', transition: 'all 0.2s',
          letterSpacing: '0.03em',
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
          {isLive ? '⚡ Enter Auction Room →' : '📋 View Auction Details →'}
        </Link>
        <Link to="/auctions/calendar" style={{
          display: 'block', textAlign: 'center', fontSize: 10,
          color: 'var(--text-muted)', marginTop: 8, textDecoration: 'none',
        }}>
          See all auctions in Auction House →
        </Link>
      </div>
    </div>
  );
}
