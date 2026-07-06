import { useState } from 'react';
import { dealerAPI } from '../../../api/api';
import { StatusBadge, BID_STATUS_CONFIG, timeAgo } from './DashboardWidgets';

export default function DealerBidsTab({ bids, setBids, toast }) {
  const [bidFilter, setBidFilter] = useState('all');
  const filteredBids = bidFilter === 'all' ? bids : bids.filter(b => b.status === bidFilter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: 0 }}>Incoming Bids</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'pending', 'accepted', 'rejected'].map(status => (
            <button key={status} onClick={() => setBidFilter(status)} style={{
              padding: '6px 14px', borderRadius: 8,
              background: bidFilter === status ? 'rgba(212,196,168,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${bidFilter === status ? 'rgba(212,196,168,0.25)' : 'rgba(255,255,255,0.07)'}`,
              color: bidFilter === status ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>
      {filteredBids.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--card)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>⚡</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            {bidFilter === 'all' ? 'No bids received yet' : `No ${bidFilter} bids`}
          </div>
        </div>
      ) : filteredBids.map(b => {
        const bidderName = b.bidderName || b.user?.name || 'Bidder';
        const initials = bidderName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const bidCfg = BID_STATUS_CONFIG[b.status] || BID_STATUS_CONFIG.pending;
        return (
          <div key={b._id} style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 20px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: b.accepted ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: b.accepted ? '#22c55e' : 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{b.carTitle || b.car?.title || 'Vehicle'}</span>
                  <StatusBadge custom={bidCfg} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 8 }}>
                  <span>{bidderName}</span>
                  <span>·</span>
                  <span>{timeAgo(b.createdAt)}</span>
                  {b.isAuto && <span>· <span style={{ color: 'var(--gold)' }}>Auto-bid</span></span>}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>KES {Number(b.amount||0).toLocaleString()}</div>
            </div>
            {b.status === 'pending' && (
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={async () => { try { const carId = b.carId?._id || b.carId; await dealerAPI.acceptBid(carId, b._id); toast(`Bid accepted — sale completed!`, 'success'); dealerAPI.bids({ limit: 50 }).then(d => setBids(d.bids || [])).catch(() => {}); } catch (e) { toast(e?.response?.data?.message || 'Failed to accept bid', 'error'); } }} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Accept
                </button>
                <button onClick={async () => { try { const carId = b.carId?._id || b.carId; await dealerAPI.rejectBid(carId, b._id); toast('Bid rejected', 'info'); dealerAPI.bids({ limit: 50 }).then(d => setBids(d.bids || [])).catch(() => {}); } catch { toast('Failed to reject', 'error'); } }} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.8)', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Decline
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
