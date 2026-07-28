import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { escrowVaultAPI, formatKES } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import usePageMeta from '../hooks/usePageMeta';

const STATUS_LABELS = {
  awaiting_payment:    { label: 'Awaiting Bank Transfer', icon: '🏦', color: 'var(--gold)' },
  escrow_locked:       { label: 'Escrow Locked', icon: '🔒', color: 'var(--green)' },
  inspection_pending:  { label: 'Inspection Scheduled', icon: '🔍', color: 'var(--gold)' },
  inspection_complete: { label: 'Inspection Complete', icon: '✅', color: 'var(--green)' },
  otp_sent:            { label: 'Release OTP Sent', icon: '📲', color: 'var(--gold)' },
  released:            { label: 'Funds Released', icon: '💰', color: 'var(--green)' },
  refunded:            { label: 'Refunded', icon: '🔙', color: 'var(--red)' },
};

const STEPS = ['awaiting_payment', 'escrow_locked', 'inspection_pending', 'inspection_complete', 'otp_sent', 'released'];

export default function EscrowVaultPortal() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [vault, setVault] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [copied, setCopied] = useState(false);

  usePageMeta(
    vault ? `Escrow: ${vault.car?.title || 'Transaction'}` : 'Escrow Vault',
    vault ? `Secure escrow vault for ${vault.car?.title}` : 'KAYAD Escrow Vault'
  );

  const loadVault = () => {
    if (id) {
      escrowVaultAPI.get(id).then(d => setVault(d.vault)).catch(() => {}).finally(() => setLoading(false));
    } else {
      escrowVaultAPI.my().then(d => {
        if (d.vaults?.length > 0) navigate(`/escrow-vault/${d.vaults[0]._id}`, { replace: true });
        else setLoading(false);
      }).catch(() => setLoading(false));
    }
  };

  useEffect(() => { loadVault(); }, [id]);

  const currentIdx = vault ? STEPS.indexOf(vault.status) : -1;

  const handleCopyRef = () => {
    if (vault?.bankTransferRef) {
      navigator.clipboard.writeText(vault.bankTransferRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRequestOtp = async () => {
    if (!vault) return;
    setSendingOtp(true);
    try {
      await escrowVaultAPI.requestOtp(vault._id);
      toast('OTP sent to your phone', 'success');
      loadVault();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to send OTP', 'error');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleRelease = async () => {
    if (!vault || !otp) return;
    setReleasing(true);
    try {
      await escrowVaultAPI.release(vault._id, otp);
      toast('Funds released successfully! 🎉', 'success');
      loadVault();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to release funds', 'error');
    } finally {
      setReleasing(false);
    }
  };

  const isBuyer = vault?.buyer?._id === user?.id || vault?.buyer === user?.id;
  const isSeller = vault?.seller?._id === user?.id || vault?.seller === user?.id;

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  if (!vault) return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, textAlign: 'center' }}>
        <h3>No active escrow transactions</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          When you win an auction on an independent seller listing, your secure escrow vault will appear here.
        </p>
        <Link to="/" className="btn btn-outline" style={{ marginTop: 16 }}>Browse Cars</Link>
      </div>
    </div>
  );

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 720 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 13 }}>← Dashboard</Link>
          <h2 style={{ marginTop: 8 }}>🔐 Secure Escrow Vault</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Bank-backed transaction protection for P2P car purchases</p>
        </div>

        {/* Status Card */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transaction Ref</div>
              <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700 }}>{vault.bankTransferRef}</div>
            </div>
            <div style={{
              padding: '8px 16px', borderRadius: 8,
              background: STATUS_LABELS[vault.status]?.color === 'var(--green)' ? 'rgba(34,197,94,0.1)' : 'rgba(212,196,168,0.1)',
              color: STATUS_LABELS[vault.status]?.color,
              fontWeight: 600, fontSize: 13,
            }}>
              {STATUS_LABELS[vault.status]?.icon} {STATUS_LABELS[vault.status]?.label}
            </div>
          </div>

          <div style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>
            {formatKES(vault.amount)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {vault.car?.title || 'Vehicle'} — {vault.car?.brand} {vault.car?.model} {vault.car?.year}
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h4 style={{ marginBottom: 20 }}>Transaction Progress</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {STEPS.map((step, i) => {
              const done = i <= currentIdx;
              const current = i === currentIdx;
              return (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: done ? 1 : 0.4 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: current ? 'var(--gold)' : done ? 'var(--green)' : 'var(--surface)',
                    border: `2px solid ${current ? 'var(--gold)' : done ? 'var(--green)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    color: current || done ? '#0A1628' : 'var(--text-muted)',
                  }}>
                    {done ? (current ? '●' : '✓') : i + 1}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: current ? 600 : 400 }}>
                    {STATUS_LABELS[step]?.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bank Transfer Info — only when awaiting_payment */}
        {vault.status === 'awaiting_payment' && (
          <div className="card" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(212,196,168,0.3)' }}>
            <h4 style={{ marginBottom: 16 }}>🏦 Make Your Bank Transfer</h4>
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">Bank</label>
                <div style={{ fontWeight: 600 }}>{vault.platformBankName}</div>
              </div>
              <div className="input-group">
                <label className="input-label">Account Name</label>
                <div style={{ fontWeight: 600 }}>{vault.platformAccountName}</div>
              </div>
              <div className="input-group">
                <label className="input-label">Account Number</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700 }}>{vault.platformAccountNumber}</span>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Your Unique Reference</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: 6, fontSize: 14 }}>{vault.bankTransferRef}</code>
                  <button className="btn btn-sm btn-outline" onClick={handleCopyRef}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Include this reference in your transfer so we can match it automatically
                </div>
              </div>
            </div>
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(212,196,168,0.08)', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
              <strong>Accepted payment methods:</strong> RTGS, EFT, Pesalink, or direct bank deposit.
              Transfers are usually confirmed within 1-2 business hours.
            </div>
          </div>
        )}

        {/* Escrow Locked — Inspection */}
        {(vault.status === 'escrow_locked' || vault.status === 'inspection_pending') && (
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h4 style={{ marginBottom: 12 }}>🔍 Physical Inspection & NTSA TIMS</h4>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              The seller has been notified that funds are secured in escrow.
              Coordinate with them to schedule a physical inspection and verify NTSA TIMS records.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>
              Once inspection is complete, mark it below to proceed to fund release.
            </p>
            <button
              className="btn btn-gold"
              style={{ marginTop: 16 }}
              onClick={async () => {
                try {
                  await escrowVaultAPI.markInspection(vault._id);
                  toast('Inspection marked complete', 'success');
                  loadVault();
                } catch (err) {
                  toast(err.response?.data?.message || 'Failed', 'error');
                }
              }}
            >
              ✅ Inspection Complete — Release Ready
            </button>
          </div>
        )}

        {/* OTP Release */}
        {vault.status === 'inspection_complete' && (
          <div className="card" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(34,197,94,0.3)' }}>
            <h4 style={{ marginBottom: 12 }}>📲 Release Funds to Seller</h4>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
              Once you've confirmed the vehicle condition and NTSA documents, enter the OTP sent to your phone to release funds from escrow.
            </p>
            {!vault.releaseOtp ? (
              <button
                className="btn btn-gold"
                onClick={handleRequestOtp}
                disabled={sendingOtp}
              >
                {sendingOtp ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Sending...</> : '📲 Request Release OTP'}
              </button>
            ) : (
              <div>
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label className="input-label">Enter 4-digit OTP</label>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="0000"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    style={{ fontSize: 24, textAlign: 'center', letterSpacing: 8 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-green btn-full"
                    onClick={handleRelease}
                    disabled={releasing || otp.length !== 4}
                  >
                    {releasing ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Releasing...</> : '💰 Confirm & Release Funds'}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={handleRequestOtp}
                    disabled={sendingOtp}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Resend OTP
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completed State */}
        {vault.status === 'released' && (
          <div className="card" style={{ padding: 24, marginBottom: 20, border: '1px solid var(--green)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h4>Transaction Complete!</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>
              {formatKES(vault.amount)} has been released from escrow to the seller.
            </p>
          </div>
        )}

        {vault.status === 'refunded' && (
          <div className="card" style={{ padding: 24, marginBottom: 20, border: '1px solid var(--red)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔙</div>
            <h4>Transaction Refunded</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>
              The escrow amount has been returned to the buyer.
            </p>
          </div>
        )}

        {/* Transaction Details */}
        <div className="card" style={{ padding: 16 }}>
          <h5 style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transaction Details</h5>
          <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Buyer</span>
              <span>{vault.buyer?.name || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Seller</span>
              <span>{vault.seller?.name || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Reference</span>
              <span style={{ fontFamily: 'monospace' }}>{vault.bankTransferRef}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Created</span>
              <span>{new Date(vault.createdAt).toLocaleDateString('en-KE', { dateStyle: 'medium' })}</span>
            </div>
            {vault.fundedAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Funded</span>
                <span>{new Date(vault.fundedAt).toLocaleDateString('en-KE', { dateStyle: 'medium' })}</span>
              </div>
            )}
            {vault.releasedAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Released</span>
                <span>{new Date(vault.releasedAt).toLocaleDateString('en-KE', { dateStyle: 'medium' })}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
