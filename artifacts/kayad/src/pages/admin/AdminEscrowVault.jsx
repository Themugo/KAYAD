import { useState, useEffect, useCallback } from 'react';
import { escrowVaultAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';

const STATUS_META = {
  awaiting_payment:     { label: 'Awaiting Payment',    badge: 'badge-orange', icon: '⏳' },
  escrow_locked:        { label: 'Escrow Locked',      badge: 'badge-blue',   icon: '💰' },
  inspection_pending:   { label: 'Inspection Pending', badge: 'badge-orange', icon: '🔍' },
  inspection_complete:  { label: 'Inspection Complete', badge: 'badge-green',  icon: '✅' },
  otp_sent:             { label: 'OTP Sent',           badge: 'badge-blue',   icon: '📲' },
  released:             { label: 'Released',           badge: 'badge-green',  icon: '✅' },
  refunded:             { label: 'Refunded',           badge: 'badge-red',    icon: '↩️' },
};

export default function AdminEscrowVault() {
  const { toast } = useToast();
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionId, setActionId] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await escrowVaultAPI.adminAll();
      setVaults(data.vaults || []);
    } catch { toast('Failed to load vaults', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConfirmFunding = async (id) => {
    if (!window.confirm('Confirm that funds have been received for this vault?')) return;
    setActionId(id);
    try {
      await escrowVaultAPI.adminConfirm(id);
      toast('✅ Funding confirmed', 'success');
      load();
      if (selected?._id === id) setSelected(null);
    } catch (err) {
      toast(err.response?.data?.message || 'Confirmation failed', 'error');
    } finally { setActionId(null); }
  };

  const handleRefund = async (id) => {
    if (!window.confirm('Refund this vault to the buyer? This is irreversible.')) return;
    setActionId(id);
    try {
      await escrowVaultAPI.adminRefund(id);
      toast('↩️ Vault refunded to buyer', 'success');
      load();
      if (selected?._id === id) setSelected(null);
    } catch (err) {
      toast(err.response?.data?.message || 'Refund failed', 'error');
    } finally { setActionId(null); }
  };

  const filtered = filter === 'all' ? vaults : vaults.filter(v => v.status === filter);
  const counts = vaults.reduce((acc, v) => { acc[v.status] = (acc[v.status] || 0) + 1; return acc; }, {});
  const filters = ['all', ...Object.keys(STATUS_META)];

  return (
    <div style={{ padding: '32px', background: '#050505', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, fontStyle: 'italic' }}>🔐 Escrow Vaults</h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 6 }}>Secure bank-backed P2P transaction vaults</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-gold' : 'btn-outline'}`}
              style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              {f !== 'all' && <span>{STATUS_META[f]?.icon}</span>}
              {f === 'all' ? 'All' : STATUS_META[f]?.label || f}
              <span style={{ opacity: 0.5 }}>({f === 'all' ? vaults.length : (counts[f] || 0)})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-icon">🔐</div>
            <h3>No vaults found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>{filter !== 'all' ? 'No vaults in this status' : 'No escrow vaults have been created yet'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.map(v => {
              const meta = STATUS_META[v.status] || { label: v.status, badge: '', icon: '🔐' };
              return (
                <div key={v._id} style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{formatKES(v.amount)}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{v.car?.title || 'Unknown'} — Ref: {v.bankTransferRef}</div>
                    </div>
                    <span className={meta.badge || 'badge'} style={{ fontSize: 11 }}>{meta.icon} {meta.label}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    <div><span style={{ color: 'rgba(255,255,255,0.3)' }}>Buyer:</span> {v.buyer?.name || '—'}</div>
                    <div><span style={{ color: 'rgba(255,255,255,0.3)' }}>Seller:</span> {v.seller?.name || '—'}</div>
                    <div><span style={{ color: 'rgba(255,255,255,0.3)' }}>Created:</span> {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '—'}</div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setSelected(selected?._id === v._id ? null : v)} style={{ fontSize: 11 }}>
                      {selected?._id === v._id ? 'Less' : 'Details'}
                    </button>
                    {v.status === 'awaiting_payment' && (
                      <button className="btn btn-gold btn-sm" style={{ fontSize: 11 }} disabled={actionId === v._id} onClick={() => handleConfirmFunding(v._id)}>
                        {actionId === v._id ? 'Confirming…' : 'Confirm Funding'}
                      </button>
                    )}
                    {['escrow_locked', 'inspection_pending', 'inspection_complete', 'otp_sent'].includes(v.status) && (
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 11, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }} disabled={actionId === v._id} onClick={() => handleRefund(v._id)}>
                        {actionId === v._id ? 'Refunding…' : 'Refund'}
                      </button>
                    )}
                  </div>

                  {selected?._id === v._id && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>Car: {v.car?.brand} {v.car?.model} ({v.car?._id})</div>
                      <div>Buyer: {v.buyer?.email || '—'}</div>
                      <div>Seller: {v.seller?.email || '—'}</div>
                      <div>Status: {v.status}</div>
                      <div>OTP Attempts: {v.otpAttempts || 0}/5</div>
                      <div>OTP Sent: {v.lastOtpSentAt ? new Date(v.lastOtpSentAt).toLocaleString() : '—'}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
