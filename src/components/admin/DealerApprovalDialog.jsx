import { useEffect, useRef, useState } from 'react';
import { approvalEligibility, DEALER_REASON_MIN, isReasonValid } from '../../utils/dealerDecision';

/**
 * In-page approval dialog (replaces window.prompt, which browsers and embedded views can block or dismiss silently).
 * Shows what the server says is still missing BEFORE anything is submitted, takes the audit reason, and shows a refusal inline.
 * The parent owns the request; this component never assumes success.
 */
export default function DealerApprovalDialog({ dealer, busy, error, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const ref = useRef(null);
  const eligibility = approvalEligibility(dealer?.application);
  const blocked = eligibility.state === 'blocked';
  const warnings = dealer?.application?.warnings || [];
  const valid = isReasonValid(reason);

  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const name = dealer?.businessName || dealer?.name || dealer?.email || 'this dealer';
  return (
    <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="dealer-approve-title" className="card" style={{ width: 'min(520px, 100%)', padding: 24, maxHeight: '90vh', overflow: 'auto' }}>
        <h2 id="dealer-approve-title" style={{ fontSize: '1.15rem', marginBottom: 4 }}>Approve dealer</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{name}{dealer?.email ? ` · ${dealer.email}` : ''}</p>

        {blocked && (
          <div role="status" style={{ border: '1px solid var(--warning, #d97706)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13 }}>
            <strong>Not ready to approve yet.</strong> The dealer still needs to:
            <ul style={{ margin: '8px 0 0 18px' }}>{eligibility.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
        )}
        {!blocked && warnings.length > 0 && (
          <div role="status" style={{ borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, background: 'var(--surface-2, rgba(128,128,128,0.12))' }}>
            {warnings.includes('EMAIL_NOT_VERIFIED') && <div>The dealer has not verified their e-mail yet; they cannot sign in until they do.</div>}
            {warnings.includes('OPTIONAL_DOCUMENTS_NOT_SUPPLIED') && <div>Some optional paperwork was not supplied. This does not block approval.</div>}
          </div>
        )}

        <label htmlFor="dealer-approve-reason" className="input-label">Reason for approval (kept in the audit log)</label>
        <textarea id="dealer-approve-reason" ref={ref} className="input" rows={3} value={reason} disabled={blocked || busy}
          onChange={(e) => setReason(e.target.value)} placeholder="e.g. Business licence and ID checked" style={{ width: '100%', resize: 'vertical' }} />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {reason.trim().length}/{DEALER_REASON_MIN} characters minimum
        </div>

        {error && <div role="alert" style={{ color: 'var(--danger, #dc2626)', fontSize: 13, marginTop: 12 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={blocked || !valid || busy} onClick={() => onConfirm(reason.trim())}>
            {busy ? 'Approving…' : 'Approve dealer'}
          </button>
        </div>
      </div>
    </div>
  );
}
