import { Trophy } from 'lucide-react';

export default function WinnerModal({ certificate, onClose, onDownload, onPayBalance }) {
  if (!certificate) return null;
  const c = certificate;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
    }}>
      <div style={{
        background: '#111', border: '1px solid rgba(212,175,55,0.3)', padding: 32,
        borderRadius: '2.5rem', maxWidth: 480, width: '100%', textAlign: 'center',
        boxShadow: '0 0 50px rgba(212,175,55,0.2)',
      }}>
        <div style={{ width: 80, height: 80, background: 'var(--gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Trophy size={40} style={{ color: 'black' }} />
        </div>

        <h2 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'white', marginBottom: 8, textTransform: 'uppercase', fontStyle: 'italic' }}>
          Congratulations!
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>
          You are the official winner of this auction.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: 24, textAlign: 'left', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Certificate No.</p>
              <p style={{ fontSize: 14, fontFamily: 'monospace', color: 'white' }}>{c.certificateNumber}</p>
            </div>
            <span style={{ fontWeight: 900, color: 'var(--gold)' }}>KAYAD</span>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vehicle</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{c.vehicle?.title || 'Vehicle'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Winning Bid</span>
              <span style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: 'var(--gold)' }}>
                KES {Number(c.financials?.winningBid || 0).toLocaleString('en-KE')}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={onDownload || onClose}
            style={{ flex: 1, padding: '16px 0', background: 'var(--gold)', color: 'black', fontWeight: 900, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
            Download PDF
          </button>
          <button onClick={onPayBalance || onClose}
            style={{ flex: 1, padding: '16px 0', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 700, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
            Pay Balance
          </button>
        </div>
      </div>
    </div>
  );
}
