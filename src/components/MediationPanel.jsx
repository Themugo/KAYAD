import { useState } from 'react';
import { Calendar, User, CheckCircle, XCircle } from 'lucide-react';
import { disputeAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function MediationPanel({ dispute, onRefresh }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [scheduledAt, setScheduledAt] = useState('');
  const [mediatorId, setMediatorId] = useState('');
  const [outcome, setOutcome] = useState('settled');
  const [mediatorNotes, setMediatorNotes] = useState('');
  const [buyerSatisfied, setBuyerSatisfied] = useState(false);
  const [sellerSatisfied, setSellerSatisfied] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = ['admin', 'superadmin', 'escrow_officer'].includes(user?.role);
  const isMediation = dispute?.status === 'mediation';
  const isPreMediation = dispute?.status === 'under_review';
  const mediation = dispute?.mediation;

  const handleStart = async () => {
    setLoading(true);
    try {
      await disputeAPI.startMediation(dispute._id, {
        mediatorId: mediatorId || undefined,
        scheduledAt: scheduledAt || undefined,
      });
      toast('Mediation started', 'success');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to start mediation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!outcome) { toast('Select an outcome', 'error'); return; }
    setLoading(true);
    try {
      await disputeAPI.completeMediation(dispute._id, { outcome, mediatorNotes, buyerSatisfied, sellerSatisfied });
      toast('Mediation completed', 'success');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to complete mediation', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0A3340] border border-[#12576D] rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-[#DDF4F0] uppercase tracking-wide flex items-center gap-2">
        <Calendar size={16} className="text-gold" /> Mediation
      </h3>

      {mediation?.scheduledAt && (
        <div className="bg-[#12576D] rounded-lg p-3 space-y-1 text-sm">
          <p className="text-[#94A3B8]">Scheduled: <span className="text-[#DDF4F0]">{new Date(mediation.scheduledAt).toLocaleString()}</span></p>
          {mediation.mediatorId && <p className="text-[#94A3B8]">Mediator: <span className="text-[#DDF4F0]">{mediation.mediatorId?.name || mediation.mediatorId}</span></p>}
        </div>
      )}

      {mediation?.completedAt && (
        <div className="bg-[#12576D] rounded-lg p-3 space-y-1 text-sm">
          <p className="text-[#94A3B8]">Completed: <span className="text-[#DDF4F0]">{new Date(mediation.completedAt).toLocaleString()}</span></p>
          <p className="text-[#94A3B8]">Outcome: <span className="text-[#DDF4F0]">{mediation.outcome}</span></p>
          {mediation.mediatorNotes && <p className="text-[#94A3B8] mt-1">{mediation.mediatorNotes}</p>}
          <div className="flex gap-3 mt-2">
            {mediation.buyerSatisfied !== undefined && <span className={`text-xs ${mediation.buyerSatisfied ? 'text-green-400' : 'text-red-400'}`}>Buyer: {mediation.buyerSatisfied ? 'Satisfied' : 'Unsatisfied'}</span>}
            {mediation.sellerSatisfied !== undefined && <span className={`text-xs ${mediation.sellerSatisfied ? 'text-green-400' : 'text-red-400'}`}>Seller: {mediation.sellerSatisfied ? 'Satisfied' : 'Unsatisfied'}</span>}
          </div>
        </div>
      )}

      {isAdmin && isPreMediation && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1">Schedule Date/Time</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 bg-[#12576D] border border-[#12576D] rounded-lg text-sm text-[#DDF4F0] focus:outline-none focus:border-gold" />
          </div>
          <button onClick={handleStart} disabled={loading}
            className="w-full py-2 bg-gold text-[#0A3340] font-semibold rounded-lg hover:bg-gold/90 disabled:opacity-50 text-sm">
            {loading ? 'Starting...' : 'Start Mediation'}
          </button>
        </div>
      )}

      {isAdmin && isMediation && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1">Outcome</label>
            <select value={outcome} onChange={e => setOutcome(e.target.value)}
              className="w-full px-3 py-2 bg-[#12576D] border border-[#12576D] rounded-lg text-sm text-[#DDF4F0] focus:outline-none focus:border-gold">
              <option value="settled">Settled</option>
              <option value="impasse">Impasse (no agreement)</option>
              <option value="buyer_favored">Buyer Favored</option>
              <option value="seller_favored">Seller Favored</option>
              <option value="partial">Partial Agreement</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1">Mediator Notes</label>
            <textarea value={mediatorNotes} onChange={e => setMediatorNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 bg-[#12576D] border border-[#12576D] rounded-lg text-sm text-[#DDF4F0] focus:outline-none focus:border-gold resize-none" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-[#94A3B8] cursor-pointer">
              <input type="checkbox" checked={buyerSatisfied} onChange={e => setBuyerSatisfied(e.target.checked)} className="accent-[#13B8A6]" />
              Buyer Satisfied
            </label>
            <label className="flex items-center gap-2 text-xs text-[#94A3B8] cursor-pointer">
              <input type="checkbox" checked={sellerSatisfied} onChange={e => setSellerSatisfied(e.target.checked)} className="accent-[#13B8A6]" />
              Seller Satisfied
            </label>
          </div>
          <button onClick={handleComplete} disabled={loading}
            className="w-full py-2 bg-gold text-[#0A3340] font-semibold rounded-lg hover:bg-gold/90 disabled:opacity-50 text-sm">
            {loading ? 'Saving...' : 'Complete Mediation'}
          </button>
        </div>
      )}

      {!isMediation && !isPreMediation && !mediation?.completedAt && (
        <p className="text-xs text-[#64748B] text-center py-2">Mediation not available in current state</p>
      )}
    </div>
  );
}
