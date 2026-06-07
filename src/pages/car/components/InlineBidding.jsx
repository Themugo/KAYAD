import { Link } from 'react-router-dom';

export default function InlineBidding({
  car, bidAmount, onBidAmountChange, onPlaceBid, bidPlacing, bidError, bidHistory, countdown,
}) {
  const minBid = (car?.currentBid || car?.startingBid || 0) + 1000;

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span className="live-dot" /> Live Auction
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
          {countdown || '—'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--gold)', fontWeight: 700, pointerEvents: 'none' }}>KES</span>
          <input type="number" value={bidAmount} onChange={e => onBidAmountChange(Number(e.target.value))}
            min={minBid}
            step={1000}
            style={{ width: '100%', padding: '10px 10px 10px 42px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: '#fff', fontSize: 14, fontWeight: 700, outline: 'none' }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
        </div>
        <button onClick={onPlaceBid} disabled={bidPlacing}
          style={{ padding: '10px 22px', borderRadius: 8, background: 'linear-gradient(135deg, var(--gold), var(--gold-muted))', color: '#000', fontWeight: 900, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'all 0.2s', opacity: bidPlacing ? 0.6 : 1, whiteSpace: 'nowrap' }}>
          {bidPlacing ? 'Placing…' : 'Place Bid'}
        </button>
      </div>
      {bidError && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{bidError}</div>}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Min: KES {minBid.toLocaleString()} · Last bid by you outbids others</div>
      {bidHistory.length > 0 && (
        <div style={{ marginTop: 10, maxHeight: 120, overflowY: 'auto', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          {bidHistory.slice(-5).reverse().map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 11, borderBottom: '1px solid var(--border)', animation: 'fadeInDown 0.3s ease' }}>
              <span style={{ color: 'var(--text-muted)' }}>{b.user?.name || b.bidderTag || `Bidder #${i + 1}`}</span>
              <span style={{ fontWeight: 700, color: 'var(--gold)' }}>KES {Number(b.amount || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      <Link to={`/auction/${car?._id}`} style={{ display: 'block', textAlign: 'center', fontSize: 11, color: 'var(--gold)', marginTop: 10, textDecoration: 'none', fontWeight: 600 }}>
        Full Auction Room →
      </Link>
    </div>
  );
}
