import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { escrowVaultAPI, formatKES } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import usePageMeta from '../hooks/usePageMeta';
import { Shield, Banknote, CheckCircle, Search, Lock, ArrowRight, ExternalLink } from 'lucide-react';
import NotFoundState from '../components/NotFoundState';

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

const HOW_IT_WORKS = [
  { icon: Banknote, title: '1. Buyer Pays to Escrow', desc: 'You transfer the agreed amount to KAYAD\'s secure trust account via RTGS, EFT, Pesalink, or bank deposit.' },
  { icon: Lock, title: '2. Funds Locked', desc: 'KAYAD verifies the payment and locks it in escrow. The seller is notified that funds are secured and ready.' },
  { icon: Search, title: '3. Inspect the Vehicle', desc: 'You inspect the vehicle in person or through our Pre-Inspection service. Verify NTSA TIMS records.' },
  { icon: CheckCircle, title: '4. Approve & Release', desc: 'Once satisfied, enter your OTP to release funds from escrow to the seller. Your money never goes direct.' },
];

function EscrowLanding() {
  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 800 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield size={32} style={{ color: 'var(--gold)' }} />
          </div>
          <h1 className="font-display font-black italic text-[clamp(1.8rem,4vw,2.8rem)] text-white leading-none mb-3">
            Secure <span className="text-gold">Escrow Vault</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            KAYAD holds every payment in a regulated trust account — so neither buyer nor seller can run with the money.
            Funds only release when you confirm you're happy.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2" style={{ marginBottom: 48 }}>
          {HOW_IT_WORKS.map(step => (
            <div key={step.title} className="card" style={{ padding: 24, border: '1px solid rgba(255,255,255,0.04)' }}>
              <step.icon size={20} style={{ color: 'var(--gold)', marginBottom: 12 }} />
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{step.title}</h4>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 32, background: 'rgba(212,196,168,0.03)', border: '1px solid rgba(212,196,168,0.1)' }}>
          <h4 style={{ marginBottom: 16 }}>Why Escrow?</h4>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { label: 'Bank-grade security', desc: 'Funds held in a licensed trust account, not a hot wallet.' },
              { label: 'Fraud prevention', desc: 'We verify ownership, NTSA records, and bank details before any release.' },
              { label: 'You control release', desc: 'Only you (the buyer) can authorize payment to the seller via OTP.' },
              { label: 'Free cancellation', desc: 'If the deal falls through, the full amount is refunded to you.' },
            ].map(b => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Shield size={14} style={{ color: 'var(--green)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link to="/showroom" className="btn btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Browse Vehicles <ArrowRight size={16} />
          </Link>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 16 }}>
            Escrow protection is included free on every KAYAD transaction
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EscrowVaultPortal() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [vault, setVault] = useState(null);
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [copied, setCopied] = useState(false);

  usePageMeta(
    id && vault ? `Escrow: ${vault.car?.title || 'Transaction'}` : 'Escrow Vault — Secure Payments',
    'KAYAD Escrow Vault — bank-grade payment protection for car buyers and sellers in Kenya.'
  );

  useEffect(() => {
    if (id) {
      escrowVaultAPI.get(id).then(d => {
        setVault(d.vault);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (user) {
      escrowVaultAPI.my().then(d => {
        setVaults(d.vaults || []);
      }).catch(() => {});
    }
  }, [id, user]);

  if (!id) {
    if (!user) return <EscrowLanding />;
    return (
      <div className="page" style={{ background: 'var(--bg)' }}>
        <div className="container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 800 }}>
          <div style={{ marginBottom: 32 }}>
            <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 13 }}>← Home</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(212,196,168,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={20} style={{ color: 'var(--gold)' }} />
              </div>
              <div>
                <h2 style={{ margin: 0 }}>Escrow Vault</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '2px 0 0' }}>Your secure transaction hub</p>
              </div>
            </div>
          </div>

          {vaults.length === 0 ? (
            <>
              <div className="card" style={{ padding: 32, textAlign: 'center', marginBottom: 32 }}>
                <Shield size={48} style={{ color: 'rgba(212,196,168,0.2)', marginBottom: 16 }} />
                <h3 style={{ marginBottom: 8 }}>No Active Escrow Transactions</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 400, margin: '0 auto 20px', lineHeight: 1.6 }}>
                  When you win an auction or purchase from a verified seller, your payment will be held securely here until you're satisfied.
                </p>
                <Link to="/showroom" className="btn btn-gold">Browse Vehicles</Link>
              </div>
              <EscrowLanding />
            </>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {vaults.map(v => (
                <Link key={v._id} to={`/escrow-vault/${v._id}`} className="card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{v.car?.title || 'Vehicle'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Ref: {v.bankTransferRef}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{formatKES(v.amount)}</span>
                    <span style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: STATUS_LABELS[v.status]?.color === 'var(--green)' ? 'rgba(34,197,94,0.1)' : 'rgba(212,196,168,0.1)',
                      color: STATUS_LABELS[v.status]?.color,
                    }}>
                      {STATUS_LABELS[v.status]?.label}
                    </span>
                    <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  if (!vault) return <NotFoundState title="Vault Not Found" message="This escrow transaction doesn't exist or you don't have access to it." actions={[{ label: 'Back to Vault', to: '/escrow-vault' }, { label: 'Go Home', to: '/' }]} />;

  const currentIdx = vault ? STEPS.indexOf(vault.status) : -1;

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 720 }}>
        <div style={{ marginBottom: 28 }}>
          <Link to="/escrow-vault" style={{ color: 'var(--text-muted)', fontSize: 13 }}>← All Vaults</Link>
          <h2 style={{ marginTop: 8 }}>🔐 Secure Escrow Vault</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Bank-backed transaction protection for P2P car purchases</p>
        </div>

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
                  <button className="btn btn-sm btn-outline" onClick={() => {
                    navigator.clipboard.writeText(vault.bankTransferRef);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}>
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
            <button className="btn btn-gold" style={{ marginTop: 16 }}
              onClick={async () => {
                try {
                  await escrowVaultAPI.markInspection(vault._id);
                  toast('Inspection marked complete', 'success');
                } catch (err) {
                  toast(err.response?.data?.message || 'Failed', 'error');
                }
              }}
            >
              ✅ Inspection Complete — Release Ready
            </button>
          </div>
        )}

        {vault.status === 'inspection_complete' && (
          <div className="card" style={{ padding: 24, marginBottom: 20, border: '1px solid rgba(34,197,94,0.3)' }}>
            <h4 style={{ marginBottom: 12 }}>📲 Release Funds to Seller</h4>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
              Once you've confirmed the vehicle condition and NTSA documents, enter the OTP sent to your phone.
            </p>
            {!vault.releaseOtp ? (
              <button className="btn btn-gold" onClick={async () => {
                setSendingOtp(true);
                try {
                  await escrowVaultAPI.requestOtp(vault._id);
                  toast('OTP sent to your phone', 'success');
                } catch (err) {
                  toast(err.response?.data?.message || 'Failed to send OTP', 'error');
                } finally {
                  setSendingOtp(false);
                }
              }} disabled={sendingOtp}>
                {sendingOtp ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Sending...</> : '📲 Request Release OTP'}
              </button>
            ) : (
              <div>
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label className="input-label">Enter 4-digit OTP</label>
                  <input className="input" type="text" inputMode="numeric" maxLength={4} placeholder="0000" value={otp}
                    autoComplete="one-time-code"
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    style={{ fontSize: 24, textAlign: 'center', letterSpacing: 8 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-green btn-full" onClick={async () => {
                    setReleasing(true);
                    try {
                      await escrowVaultAPI.release(vault._id, otp);
                      toast('Funds released successfully! 🎉', 'success');
                    } catch (err) {
                      toast(err.response?.data?.message || 'Failed to release funds', 'error');
                    } finally {
                      setReleasing(false);
                    }
                  }} disabled={releasing || otp.length !== 4}>
                    {releasing ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Releasing...</> : '💰 Confirm & Release Funds'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {vault.status === 'released' && (
          <div className="card" style={{ padding: 24, marginBottom: 20, border: '1px solid var(--green)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h4>Transaction Complete!</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>{formatKES(vault.amount)} has been released from escrow to the seller.</p>
          </div>
        )}

        {vault.status === 'refunded' && (
          <div className="card" style={{ padding: 24, marginBottom: 20, border: '1px solid var(--red)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔙</div>
            <h4>Transaction Refunded</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>The escrow amount has been returned to the buyer.</p>
          </div>
        )}

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
