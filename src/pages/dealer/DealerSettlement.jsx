import { useState, useEffect } from 'react';
import { dealerAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import usePageMeta from '../../hooks/usePageMeta';

export default function DealerSettlement() {
  const { toast } = useToast();
  usePageMeta('Settlement Config', 'Configure your M-Pesa Till/Paybill for direct merchant settlement');

  const [settlement, setSettlement] = useState({
    mpesaBusiness: '',
    mpesaBusinessName: '',
    paymentDetails: { bankName: '', accountName: '', accountNumber: '', paybillNumber: '', mpesaPhone: '' },
    bankName: '',
    bankAccount: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dealerAPI.getSettlement()
      .then(d => { if (d.settlement) setSettlement(d.settlement); })
      .catch(() => toast('Failed to load settlement config', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const d = await dealerAPI.updateSettlement(settlement);
      if (d.settlement) setSettlement(d.settlement);
      toast('Settlement configuration saved', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 640 }}>
        <div style={{ marginBottom: 28 }}>
          <h2>💳 Merchant Settlement</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Configure where buyer payments land. Certified dealers receive bids directly to their Till/Paybill.
          </p>
        </div>

        {/* Dealer Info */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h4 style={{ marginBottom: 16 }}>🏪 Autonomously Managed Dealer Flow</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
            When a buyer bids on your listing, the M-Pesa STK push routes directly to your configured business
            Till or Paybill number. Funds land in your commercial account without holding queues.
          </p>
        </div>

        {/* M-Pesa Settlement */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h4 style={{ marginBottom: 16 }}>📱 M-Pesa Business</h4>

          <div className="input-group" style={{ marginBottom: 12 }}>
            <label className="input-label">M-Pesa Business/Till Number</label>
            <input
              className="input"
              placeholder="e.g. 123456"
              value={settlement.mpesaBusiness}
              onChange={e => setSettlement(prev => ({ ...prev, mpesaBusiness: e.target.value }))}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              The Till or Paybill number where buyer bid commitments will be sent
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 12 }}>
            <label className="input-label">Business Name</label>
            <input
              className="input"
              placeholder="e.g. My Car Yard Ltd"
              value={settlement.mpesaBusinessName}
              onChange={e => setSettlement(prev => ({ ...prev, mpesaBusinessName: e.target.value }))}
            />
          </div>
        </div>

        {/* Bank Details */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h4 style={{ marginBottom: 16 }}>🏦 Bank Account (Settlement)</h4>

          <div className="input-group" style={{ marginBottom: 12 }}>
            <label className="input-label">Bank Name</label>
            <input
              className="input"
              placeholder="e.g. Equity Bank Kenya"
              value={settlement.bankName}
              onChange={e => setSettlement(prev => ({ ...prev, bankName: e.target.value }))}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 12 }}>
            <label className="input-label">Account Number</label>
            <input
              className="input"
              placeholder="e.g. 1234567890"
              value={settlement.bankAccount}
              onChange={e => setSettlement(prev => ({ ...prev, bankAccount: e.target.value }))}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 12 }}>
            <label className="input-label">Payment Details (JSON)</label>
            <textarea
              className="input"
              style={{ minHeight: 100, fontFamily: 'monospace', fontSize: 12 }}
              value={JSON.stringify(settlement.paymentDetails, null, 2)}
              onChange={e => {
                try { setSettlement(prev => ({ ...prev, paymentDetails: JSON.parse(e.target.value) })); }
                catch { /* allow editing */ }
              }}
            />
          </div>
        </div>

        {/* Guardrail Info */}
        <div className="card" style={{ padding: 16, marginBottom: 20, background: 'rgba(212,196,168,0.06)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>🛡️ Guardrail</strong>
            The independent seller P2P flow (bank transfer escrow) is used automatically when the seller is not a certified dealer.
            As a certified dealer with configured settlement, your transactions bypass the holding queue and settle directly.
          </div>
        </div>

        <button
          className="btn btn-gold btn-full btn-lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Saving...</> : '💾 Save Settlement Configuration'}
        </button>
      </div>
    </div>
  );
}
