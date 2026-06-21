import { useState, useEffect } from 'react';
import { inspectionAPI, formatKES } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { Eye, Star, ShieldCheck, Clock, ChevronRight } from 'lucide-react';
import GhostCheckOrderModal from './GhostCheckOrderModal';

interface InspectionButtonProps {
  carId: string;
  location?: string;
  onInspectionComplete?: () => void;
}

type InspectionOrder = {
  car?: string | { _id?: string };
  status?: string;
  overallScore?: number;
  conditionRating?: string;
  inspectorNotes?: string;
  checklist?: unknown[];
  inspector?: { name?: string };
};

export default function InspectionButton({ carId, location, onInspectionComplete }: InspectionButtonProps) {
  const { user } = useAuth();
  const [inspection, setInspection] = useState<InspectionOrder | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<InspectionOrder | null>(null);

  useEffect(() => {
    if (!carId) return;
    inspectionAPI.forCar(carId).then(r => {
      if (r.inspection) setInspection(r.inspection);
    }).catch(() => {});
  }, [carId]);

  useEffect(() => {
    if (!carId || !user) return;
    inspectionAPI.myOrders().then(r => {
      const orders = (r.orders || []) as InspectionOrder[];
      const matchingOrders = orders.filter((o) => o.car === carId || (typeof o.car === 'object' && o.car?._id === carId));
      const active = matchingOrders.find((o) => o.status !== 'completed' && o.status !== 'cancelled');
      if (active) setPendingOrder(active);
    }).catch(() => {});
  }, [carId, user]);

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
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Ghost Check Report Available</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Star size={12} fill="currentColor" style={{ color: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444' }} />
              <span style={{ fontSize: 14, fontWeight: 900, color: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444' }}>{score}/100</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'capitalize' }}>{inspection.conditionRating} condition</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
          {inspection.inspectorNotes || `${inspection.checklist?.length || 0} inspection points checked by ${inspection.inspector?.name || 'a certified Ghost Checker'}.`}
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{
        background: pendingOrder
          ? 'rgba(59,130,246,0.06)'
          : 'rgba(16,185,129,0.08)',
        border: `1px solid ${
          pendingOrder
            ? 'rgba(59,130,246,0.15)'
            : 'rgba(16,185,129,0.15)'
        }`,
        borderRadius: 14, padding: 16, marginTop: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <h4 style={{ color: pendingOrder ? '#60a5fa' : '#34d399', fontWeight: 700, fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={13} /> Ghost Check
            </h4>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, lineHeight: 1.5 }}>
              {pendingOrder
                ? `Status: ${pendingOrder.status?.replace(/_/g, ' ') || 'Processing'} — an inspection is already in progress for this vehicle.`
                : `Can't inspect ${location || 'the vehicle'} in person? Send a certified Ghost Checker for a 150-point forensic assessment.`
              }
            </p>
          </div>
          <span style={{
            background: pendingOrder ? '#3b82f6' : '#10b981',
            color: '#000', fontSize: 9, fontWeight: 900, padding: '3px 7px',
            borderRadius: 4, whiteSpace: 'nowrap',
          }}>{pendingOrder ? 'TRACKING' : '150-POINT'}</span>
        </div>

        {!user ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Sign in to order a Ghost Check</span>
          </div>
        ) : (
          <button onClick={() => setShowModal(true)}
            style={{
              width: '100%', padding: '10px', borderRadius: 8,
              background: pendingOrder ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${pendingOrder ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.15)'}`,
              color: pendingOrder ? '#60a5fa' : '#34d399',
              fontWeight: 700, fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = pendingOrder ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = pendingOrder ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)'; }}
          >
            {pendingOrder ? (
              <><Clock size={13} /> Track Inspection Status <ChevronRight size={12} /></>
            ) : (
              <><Eye size={13} /> Order Ghost Check — {formatKES(2500)}</>
            )}
          </button>
        )}
      </div>

      {showModal && (
        <GhostCheckOrderModal
          carId={carId}
          location={location}
          onClose={() => setShowModal(false)}
          onInspectionComplete={onInspectionComplete}
        />
      )}
    </>
  );
}
