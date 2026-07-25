import { useState } from 'react';
import { Gavel, DollarSign } from 'lucide-react';
import { disputeAPI } from '../api/api';
import { useToast } from '../context/ToastContext';

const DECISIONS = [
  { value: 'full_refund',     label: 'Full Refund',         desc: 'Refund full amount to buyer' },
  { value: 'partial_refund',  label: 'Partial Refund',      desc: 'Refund partial amount to buyer' },
  { value: 'release_funds',   label: 'Release Funds',       desc: 'Release full amount to seller' },
  { value: 'split_settlement', label: 'Split Settlement',   desc: 'Split between buyer and seller' },
  { value: 'dismissed',       label: 'Dismiss',             desc: 'Dismiss the dispute, release to seller' },
];

export default function ResolutionPanel({ dispute, escrow, onRefresh }) {
  const { toast } = useToast();
  const [decision, setDecision] = useState('');
  const [amount, setAmount] = useState(escrow?.amount || 0);
  const [sellerAmount, setSellerAmount] = useState(0);
  const [buyerAmount, setBuyerAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const canResolve = ['under_review', 'mediation', 'appealed'].includes(dispute?.status);
  const resolution = dispute?.resolution;
  const totalAmount = escrow?.amount || dispute?.amountInDispute || 0;

  const handleResolve = async () => {
    if (!decision) { toast('Select a decision', 'error'); return; }
    setLoading(true);
    try {
      const body = { decision, reason };
      if (decision === 'partial_refund') body.amount = Number(amount);
      if (decision === 'split_settlement') {
        body.sellerAmount = Number(sellerAmount);
        body.buyerAmount = Number(buyerAmount);
      }
      await disputeAPI.resolve(dispute._id, body);
      toast('Dispute resolved', 'success');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast(err?.response?.data?.message || 'Resolution failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const decisionMeta = DECISIONS.find(d => d.value === decision);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide flex items-center gap-2">
        <Gavel size={16} className="text-gold" /> Resolution
      </h3>

      {resolution?.decidedAt && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-1 text-sm">
          <p className="text-gray-400">Decision: <span className="text-gray-200 font-medium">{resolution.decision}</span></p>
          <p className="text-gray-400">Amount: <span className="text-gray-200">KES {Number(resolution.amount || totalAmount).toLocaleString('en-KE')}</span></p>
          {resolution.reason && <p className="text-gray-400 mt-1">{resolution.reason}</p>}
          <p className="text-xs text-gray-500 mt-1">Resolved by {resolution.decidedBy?.name || 'Admin'} on {new Date(resolution.decidedAt).toLocaleDateString()}</p>
          {resolution.implemented && <span className="text-xs text-green-400">✓ Implemented</span>}
        </div>
      )}

      {canResolve && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2">
            {DECISIONS.map(d => (
              <button key={d.value} type="button" onClick={() => setDecision(d.value)}
                className={`text-left p-3 rounded-lg border text-sm transition
                  ${decision === d.value ? 'border-gold bg-gold/10' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
                <span className="font-medium text-gray-200">{d.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{d.desc}</p>
              </button>
            ))}
          </div>

          {decision === 'partial_refund' && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Refund Amount (KES)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold" />
              <p className="text-xs text-gray-500 mt-1">Seller gets: KES {(totalAmount - Number(amount)).toLocaleString('en-KE')}</p>
            </div>
          )}

          {decision === 'split_settlement' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Seller Amount (KES)</label>
                <input type="number" value={sellerAmount} onChange={e => setSellerAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Buyer Amount (KES)</label>
                <input type="number" value={buyerAmount} onChange={e => setBuyerAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold" />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 block mb-1">Reason</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Explain the resolution decision..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold resize-none" />
          </div>

          <button onClick={handleResolve} disabled={!decision || loading}
            className="w-full py-2 bg-gold text-black font-semibold rounded-lg hover:bg-gold/90 disabled:opacity-50 text-sm">
            {loading ? 'Processing...' : `Apply Resolution (KES ${totalAmount.toLocaleString('en-KE')})`}
          </button>
        </div>
      )}
    </div>
  );
}
