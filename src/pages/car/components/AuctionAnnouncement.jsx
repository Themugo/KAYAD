import { Link } from 'react-router-dom';
import { CountdownDisplay } from '../../../components/CountdownDisplay';
import { Gavel, Clock, Users, TrendingUp, Shield, Eye, Calendar } from 'lucide-react';

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
        background: 'var(--card)', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)', padding: 16, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'rgba(212,196,168,0.15)', border: '1px solid rgba(212,196,168,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Gavel size={18} style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.05em' }}>Auction House</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Live online car auctions — new to Kenya</div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 12 }}>
          Kayad brings live auctions to Kenya. Watch, bid, and win premium vehicles in real time from your phone.
        </p>
        <Link to="/auctions/calendar" style={{
          display: 'block', textAlign: 'center', padding: '10px 0',
          borderRadius: 8, fontWeight: 700, fontSize: 12,
          background: 'rgba(212,196,168,0.1)', color: 'var(--gold)',
          border: '1px solid rgba(212,196,168,0.3)',
          textDecoration: 'none', transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,196,168,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,196,168,0.1)'; }}>
          Browse Auction House →
        </Link>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--card)', borderRadius: 12,
      border: `1px solid ${isLive ? 'rgba(239,68,68,0.3)' : 'rgba(212,196,168,0.3)'}`, overflow: 'hidden',
      marginBottom: 16,
    }}>
      {/* Top banner */}
      <div style={{
        height: 4,
        background: isLive
          ? 'linear-gradient(90deg, #ef4444, #f97316)'
          : 'linear-gradient(90deg, var(--gold), #e6c288)',
      }} />

      <div style={{ padding: 18 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: isLive ? 'rgba(239,68,68,0.15)' : 'rgba(212,196,168,0.15)',
              border: `1px solid ${isLive ? 'rgba(239,68,68,0.3)' : 'rgba(212,196,168,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Gavel size={20} style={{ color: isLive ? '#ef4444' : 'var(--gold)' }} />
            </div>
            <div>
              <div style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: isLive ? '#ef4444' : '#f59e0b',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {isLive && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />}
                {isLive ? 'Live Auction' : 'Upcoming Auction'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                Bid live from anywhere in Kenya
              </div>
            </div>
          </div>
          {isLive && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 9999, padding: '4px 10px',
            }}>
              <Eye size={12} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444' }}>
                {car?.viewCount || 0} watching
              </span>
            </div>
          )}
        </div>

        {/* Auction details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {/* Host */}
          {car?.dealer?.name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <div style={{ width: 24, display: 'flex', justifyContent: 'center' }}>
                <Shield size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Hosted by</span>
              <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{car.dealer.name}</span>
              {car?.dealer?.verified && (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: '#22C55E',
                  background: 'rgba(34,197,94,0.15)', padding: '2px 6px', borderRadius: 4,
                }}>VERIFIED</span>
              )}
            </div>
          )}

          {/* Date */}
          {car?.auctionEnd && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <div style={{ width: 24, display: 'flex', justifyContent: 'center' }}>
                <Calendar size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{isLive ? 'Ends' : 'Auction date'}</span>
              <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{fmtAuctionDate(car.auctionEnd)}</span>
            </div>
          )}

          {/* Countdown for live auctions */}
          {isLive && car?.auctionEnd && (
            <div style={{ marginTop: 4 }}>
              <CountdownDisplay endTime={car.auctionEnd} size="sm" />
            </div>
          )}

          {/* Bids */}
          {car?.bidsCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <div style={{ width: 24, display: 'flex', justifyContent: 'center' }}>
                <Users size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </div>
              <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{car.bidsCount}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>bid{car.bidsCount !== 1 ? 's' : ''} placed</span>
              {car?.currentBid && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Current bid:</span>
                  <span style={{ fontWeight: 700, color: 'var(--gold)' }}>KES {Number(car.currentBid).toLocaleString()}</span>
                </>
              )}
            </div>
          )}

          {/* Reserve price indicator */}
          {car?.reservePrice && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
              <div style={{ width: 24, display: 'flex', justifyContent: 'center' }}>
                <TrendingUp size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Reserve price: </span>
              <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                {car?.reserveMet ? 'Met ✓' : 'Not yet met'}
              </span>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <Link to={`/auction/${car._id}`} style={{
          display: 'block', textAlign: 'center', padding: '12px 0',
          borderRadius: 8, fontWeight: 800, fontSize: 13,
          background: isLive
            ? 'linear-gradient(135deg, #ef4444, #f97316)'
            : 'linear-gradient(135deg, var(--gold), #e6c288)',
          color: '#0A1628',
          border: 'none',
          textDecoration: 'none', transition: 'all 0.2s',
          letterSpacing: '0.03em',
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
          {isLive ? '⚡ Enter Auction Room →' : '📋 View Auction Details →'}
        </Link>

        {/* Secondary link */}
        <Link to="/auctions/calendar" style={{
          display: 'block', textAlign: 'center', fontSize: 11,
          color: 'rgba(255,255,255,0.4)', marginTop: 10, textDecoration: 'none',
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--gold)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}>
          See all auctions in Auction House →
        </Link>
      </div>
    </div>
  );
}
