import { Trophy, X, Printer } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface WinnerModalProps {
  certificate: any;
  onClose?: () => void;
  onDownload?: () => void;
  onPayBalance?: () => void;
}

const kes = (v: any) => `KES ${Number(v || 0).toLocaleString('en-KE')}`;

/** Winner certificate. "Print / save as PDF" uses the browser print dialog; print CSS shows only the certificate. */
export default function WinnerModal({ certificate, onClose, onDownload, onPayBalance }: WinnerModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!certificate) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [certificate, onClose]);
  if (!certificate) return null;
  const c = certificate;
  const f = c.financials || {};
  const due = f.paymentDueAt ? new Date(f.paymentDueAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : null;
  const row = (label: string, value: string, strong = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: strong ? 14 : 12, fontWeight: 700, color: 'white', textAlign: 'right', fontFamily: strong ? 'monospace' : undefined }}>{value}</span>
    </div>
  );

  return (
    <div role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }} className="kayad-certificate-overlay"
      style={{ position: 'fixed', inset: 0, background: 'rgba(10, 51, 64, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16, overflowY: 'auto' }}>
      <div role="dialog" aria-modal="true" aria-label="Auction winner certificate" className="kayad-certificate"
        style={{ position: 'relative', background: '#0a3340', border: '1px solid rgba(212,175,55,0.3)', padding: 28, borderRadius: '1.5rem', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 0 50px rgba(212,175,55,0.2)' }}>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close certificate" className="kayad-no-print"
          style={{ position: 'absolute', top: 12, right: 12, width: 44, height: 44, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
          <X size={22} aria-hidden="true" />
        </button>
        <div style={{ width: 64, height: 64, background: 'var(--brand)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Trophy size={32} style={{ color: 'black' }} aria-hidden="true" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginBottom: 6, textTransform: 'uppercase' }}>Certificate of win</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>You are the official winner of this auction.</p>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: 20, textAlign: 'left', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 10, color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Certificate No.</p>
              <p style={{ fontSize: 14, fontFamily: 'monospace', color: 'white' }}>{c.certificateNumber}</p>
            </div>
            <span style={{ fontWeight: 900, color: 'var(--brand)' }}>KAYAD KE</span>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {row('Vehicle', [c.vehicle?.year, c.vehicle?.title].filter(Boolean).join(' ') || 'Vehicle')}
            {row('Bidder ID', c.bidderId || '—')}
            {row('Issued', c.issuedAt ? new Date(c.issuedAt).toLocaleDateString('en-KE', { dateStyle: 'long' }) : '—')}
            {row('Winning bid', kes(f.winningBid), true)}
            {Number(f.commitmentCredited) > 0 && row('Commitment credited', `− ${kes(f.commitmentCredited)}`)}
            {row('Balance due', kes(f.balanceDue), true)}
            {due && row('Pay by', due)}
          </div>
        </div>
        <div className="kayad-no-print" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={onDownload || (() => window.print())}
            style={{ flex: '1 1 140px', minHeight: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--brand)', color: 'black', fontWeight: 900, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
            <Printer size={18} aria-hidden="true" /> Print / save as PDF
          </button>
          {onPayBalance && Number(f.balanceDue) > 0 && (
            <button type="button" onClick={onPayBalance}
              style={{ flex: '1 1 140px', minHeight: 48, background: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 700, borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              Pay balance
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
