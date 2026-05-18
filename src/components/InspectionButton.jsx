import { useState, useEffect } from 'react';
import { inspectionAPI, formatKES } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Eye, CheckCircle, ClipboardCheck, Star, ShieldCheck } from 'lucide-react';

export default function InspectionButton({ carId, location, onInspectionComplete }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inspection, setInspection] = useState(null);
  const [loadingInsp, setLoadingInsp] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!carId) return;
    inspectionAPI.forCar(carId).then(r => {
      if (r.inspection) setInspection(r.inspection);
    }).catch(() => {});
  }, [carId]);

  const handleOrder = async () => {
    if (!phone || phone.length < 10) {
      toast('Enter a valid M-Pesa phone number', 'error');
      return;
    }
    setOrdering(true);
    try {
      await inspectionAPI.order({ carId, phone, location });
      toast('Inspection ordered! Check your phone for M-Pesa prompt.', 'success');
      setPhone('');
      if (onInspectionComplete) onInspectionComplete();
    } catch (e) {
      toast(e?.message || 'Failed to order inspection', 'error');
    }
    finally { setOrdering(false); }
  };

  if (inspection && inspection.status === 'completed') {
    const score = inspection.overallScore || 0;
    return (
      <div style={{
        background: score >= 80 ? 'rgba(34,197,94,0.08)' : score >= 60 ? 'rgba(251,191,36,0.08)' : 'rgba(239,68,68,0.08)',
        border: `1px solid ${score >= 80 ? 'rgba(34,197,94,0.2)' : score >= 60 ? 'rgba(251,191,36,0.2)' : 'rgba(239,68,68,0.2)'}`,
        borderRadius: 14, padding: 16, marginTop: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: score >= 80 ? 'rgba(34,197,94,0.15)' : score >= 60 ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ShieldCheck size={20} style={{ color: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Inspection Report Available</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Star size={12} fill="currentColor" style={{ color: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444' }} />
              <span style={{ fontSize: 14, fontWeight: 900, color: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444' }}>{score}/100</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'capitalize' }}>{inspection.conditionRating} condition</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
          {inspection.inspectorNotes || `${inspection.checklist?.length || 0} inspection points checked by ${inspection.inspector?.name || 'a certified inspector'}.`}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 14, padding: 16, marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <h4 style={{ color: '#34d399', fontWeight: 700, fontSize: 13, margin: 0 }}>Remote Inspection</h4>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, lineHeight: 1.5 }}>
            Can't travel to {location || 'the seller'}? Send a certified inspector for a 150-point vehicle assessment.
          </p>
        </div>
        <span style={{ background: '#10b981', color: '#000', fontSize: 9, fontWeight: 900, padding: '3px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>150-POINT</span>
      </div>

      {!user ? (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 8 }}>
          Sign in to order an inspection
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="M-Pesa phone (0712345678)"
            style={{
              flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 11, outline: 'none',
            }}
          />
          <button onClick={handleOrder} disabled={ordering}
            style={{
              padding: '8px 16px', background: '#059669', color: '#fff', fontSize: 11,
              fontWeight: 800, borderRadius: 8, border: 'none', cursor: ordering ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
            }}>
            {ordering ? '...' : <Eye size={13} />} Inspect
          </button>
        </div>
      )}
    </div>
  );
}
