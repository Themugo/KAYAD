import { Zap } from 'lucide-react';

function FieldGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}

export default function EditCarAuctionTab({ form, set, isLive, auctionAction, setAuctionAction, extendHours, setExtendHours, handleAuctionStart, handleAuctionEnd, toast, car, dealerAuctionAPI, id }) {
  return (
    <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 18 }}>Auction Controls</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div>
          <FieldGroup label="Auction End Date and Time">
            <input type="datetime-local" value={form.auctionEnd} onChange={e => set('auctionEnd', e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </FieldGroup>
        </div>
        <div>
          <FieldGroup label="Extend by (hours)">
            <input type="number" value={extendHours} onChange={e => setExtendHours(Number(e.target.value))} min={1} max={48}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </FieldGroup>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {!isLive ? (
          <button onClick={handleAuctionStart} disabled={!!auctionAction || !form.auctionEnd} style={{ padding: '12px 24px', background: form.auctionEnd ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 10, color: form.auctionEnd ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 900, cursor: form.auctionEnd ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={14} /> {auctionAction === 'starting' ? 'Starting...' : 'Start Live Auction'}
          </button>
        ) : (
          <>
            <button onClick={handleAuctionEnd} disabled={!!auctionAction} style={{ padding: '12px 24px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {auctionAction === 'ending' ? 'Ending...' : 'End Auction'}
            </button>
            <button onClick={async () => { setAuctionAction('extending'); try { await dealerAuctionAPI.extend(id, extendHours); toast('Extended by ' + extendHours + 'h', 'success'); } catch { toast('Failed', 'error'); } finally { setAuctionAction(null); } }} disabled={!!auctionAction}
              style={{ padding: '12px 24px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, color: '#3b82f6', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {auctionAction === 'extending' ? 'Extending...' : '+ Extend ' + extendHours + 'h'}
            </button>
          </>
        )}
      </div>
      {car.bidsCount > 0 && (
        <div style={{ marginTop: 20, padding: '14px 18px', background: 'rgba(212,196,168,0.05)', border: '1px solid rgba(212,196,168,0.12)', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            <strong style={{ color: 'var(--gold)' }}>{car.bidsCount}</strong> bid{car.bidsCount !== 1 ? 's' : ''} placed -
            Current: <strong style={{ color: '#fff' }}>KES {Number(car.currentBid || 0).toLocaleString()}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
