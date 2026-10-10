import { useState } from 'react';
import { RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { disputeAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function AppealPanel({ dispute, onRefresh }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [decision, setDecision] = useState('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = ['admin', 'superadmin', 'escrow_officer'].includes(user?.role);
  const isParty = dispute?.openedBy?._id === user?.id || dispute?.openedAgainst?._id === user?.id;
  const isResolved = dispute?.status === 'resolved';
  const isAppealed = dispute?.status === 'appealed';
  const appeal = dispute?.appeal;
  const hasPendingAppeal = appeal?.status === 'pending';

  const handleSubmitAppeal = async () => {
    if (!reason.trim()) { toast('Reason is required', 'error'); return; }
    setLoading(true);
    try {
      await disputeAPI.appeal(dispute._id, { reason, additionalDetails });
      toast('Appeal submitted', 'success');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to submit appeal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAppeal = async () => {
    if (!decision) { toast('Select a decision', 'error'); return; }
    setLoading(true);
    try {
      await disputeAPI.reviewAppeal(dispute._id, { decision, reviewNotes });
      toast(`Appeal ${decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'modified'}`, 'success');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to review appeal', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0A3340] border border-[#12576D] rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-[#DDF4F0] uppercase tracking-wide flex items-center gap-2">
        <RotateCcw size={16} className="text-gold" /> Appeal
      </h3>

      {appeal?.appealedAt && (
        <div className="bg-[#12576D] rounded-lg p-3 space-y-1 text-sm">
          <p className="text-[#94A3B8]">Appealed by: <span className="text-[#DDF4F0]">{appeal.appealedBy?.name || 'Party'}</span></p>
          <p className="text-[#94A3B8]">Status: <span className={`font-medium ${appeal.status === 'pending' ? 'text-[#13B8A6]' : appeal.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}>{appeal.status}</span></p>
          <p className="text-[#94A3B8]">Reason: <span className="text-[#DDF4F0]">{appeal.reason}</span></p>
          {appeal.additionalDetails && <p className="text-[#94A3B8] mt-1">Details: <span className="text-[#DDF4F0]">{appeal.additionalDetails}</span></p>}
          {appeal.reviewNotes && <p className="text-[#94A3B8] mt-1">Review: <span className="text-[#DDF4F0]">{appeal.reviewNotes}</span></p>}
        </div>
      )}

      {isResolved && isParty && !appeal?.appealedAt && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1">Reason for Appeal</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Explain why you disagree with the resolution..."
              className="w-full px-3 py-2 bg-[#12576D] border border-[#12576D] rounded-lg text-sm text-[#DDF4F0] focus:outline-none focus:border-gold resize-none" />
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1">Additional Details (optional)</label>
            <textarea value={additionalDetails} onChange={e => setAdditionalDetails(e.target.value)} rows={2}
              className="w-full px-3 py-2 bg-[#12576D] border border-[#12576D] rounded-lg text-sm text-[#DDF4F0] focus:outline-none focus:border-gold resize-none" />
          </div>
          <button onClick={handleSubmitAppeal} disabled={!reason.trim() || loading}
            className="w-full py-2 bg-[#176B87] text-white font-semibold rounded-lg hover:bg-[#12576D] disabled:opacity-50 text-sm">
            {loading ? 'Submitting...' : 'Submit Appeal'}
          </button>
        </div>
      )}

      {isAdmin && isAppealed && hasPendingAppeal && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1">Decision</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'approve', label: 'Approve', desc: 'Re-open case', color: 'text-green-400 border-green-700 hover:bg-green-900/20' },
                { value: 'reject', label: 'Reject', desc: 'Uphold resolution', color: 'text-red-400 border-red-700 hover:bg-red-900/20' },
                { value: 'modify', label: 'Modify', desc: 'Partially approve', color: 'text-[#13B8A6] border-[#12576D] hover:bg-[#0A3340]/20' },
              ].map(d => (
                <button key={d.value} type="button" onClick={() => setDecision(d.value)}
                  className={`p-3 rounded-lg border text-center text-xs transition ${decision === d.value ? `border-gold bg-gold/10 ${d.color.split(' ')[0]}` : `border-[#12576D] bg-[#12576D] ${d.color}`}`}>
                  <span className="block font-medium">{d.label}</span>
                  <span className="block text-[#64748B] mt-0.5">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1">Review Notes</label>
            <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 bg-[#12576D] border border-[#12576D] rounded-lg text-sm text-[#DDF4F0] focus:outline-none focus:border-gold resize-none" />
          </div>
          <button onClick={handleReviewAppeal} disabled={loading}
            className="w-full py-2 bg-gold text-[#0A3340] font-semibold rounded-lg hover:bg-gold/90 disabled:opacity-50 text-sm">
            {loading ? 'Processing...' : `Review Appeal — ${decision.charAt(0).toUpperCase() + decision.slice(1)}`}
          </button>
        </div>
      )}
    </div>
  );
}
