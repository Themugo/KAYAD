import { useState, useEffect } from 'react';
import { inspectionAPI, formatKES } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Eye, Star, ShieldCheck, Smartphone, CheckCircle, Clock, X, AlertTriangle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const GHOST_CHECK_FEE = 2500;

const STATUS_MAP = {
  pending_payment: { bg: 'rgba(251,191,36,0.1)', color: '#f59e0b', label: 'Pending Payment' },
  paid: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Paid — Awaiting Assignment' },
  assigned: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', label: 'Inspector Assigned' },
  in_progress: { bg: 'rgba(212,196,168,0.12)', color: 'var(--gold)', label: 'Inspection In Progress' },
  completed: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', label: 'Report Ready' },
  cancelled: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: 'Cancelled' },
};

export default function GhostCheckOrderModal({ carId, location, onClose, onInspectionComplete }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState('check'); // check | payment | tracking
  const [phone, setPhone] = useState(user?.phone || '');
  const [ordering, setOrdering] = useState(false);
  const [inspection, setInspection] = useState(null);
  const [orderResult, setOrderResult] = useState(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [existingOrder, setExistingOrder] = useState(null);

  useEffect(() => {
    if (!carId) return;
    inspectionAPI.forCar(carId).then(r => {
      if (r.inspection) setExistingOrder(r.inspection);
      if (r.inspection?.status === 'completed') setInspection(r.inspection);
    }).catch(() => {});
    inspectionAPI.myOrders().then(r => {
      const orders = r.orders || [];
      const pending = orders.find(o => o.car === carId && o.status !== 'completed' && o.status !== 'cancelled');
      if (pending) setExistingOrder(pending);
    }).catch(() => {});
  }, [carId]);

  const handleOrder = async () => {
    if (!phone || phone.length < 10) {
      toast('Enter a valid M-Pesa phone number (e.g. 0712345678)', 'error');
      return;
    }
    setOrdering(true);
    try {
      const res = await inspectionAPI.order({ carId, phone, location });
      setOrderResult(res);
      setPaymentConfirmed(true);
      toast('Inspection ordered! Check M-Pesa on your phone to complete payment.', 'success');
      setStep('tracking');
      if (onInspectionComplete) onInspectionComplete();
    } catch (e) {
      toast(e?.response?.data?.message || e?.message || 'Failed to order', 'error');
    } finally { setOrdering(false); }
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  if (!user) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: 16 }}>
        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', maxWidth: 400, width: '100%', padding: 32, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <ShieldCheck size={24} style={{ color: 'var(--gold)' }} />
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: '#fff', margin: '0 0 8px' }}>Sign In Required</h3>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20, lineHeight: 1.6 }}>You need to be signed in to order a Ghost Check inspection. It's quick and free to create an account.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Link to={`/login?redirect=/cars/${carId}`} style={{ padding: '10px 22px', background: 'var(--gold)', color: '#000', borderRadius: 9999, fontWeight: 800, fontSize: 11, textDecoration: 'none' }}>Sign In</Link>
            <button onClick={handleClose} style={{ padding: '10px 22px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: 9999, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  if (inspection?.status === 'completed') {
    const score = inspection.overallScore || 0;
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: 16 }}>
        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', maxWidth: 440, width: '100%', overflow: 'hidden' }}>
          <div style={{
            height: 4,
            background: score >= 80 ? 'linear-gradient(90deg, #22c55e, #34d399)' : score >= 60 ? 'linear-gradient(90deg, #f59e0b, var(--gold))' : 'linear-gradient(90deg, #ef4444, #f87171)',
          }} />
          <div style={{ padding: 28, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
              background: score >= 80 ? 'rgba(34,197,94,0.12)' : score >= 60 ? 'rgba(251,191,36,0.12)' : 'rgba(239,68,68,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldCheck size={28} style={{ color: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: '#fff', margin: '0 0 4px' }}>Ghost Check Complete</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              <Star size={16} fill="currentColor" style={{ color: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444' }} />
              <span style={{ fontSize: 28, fontWeight: 900, color: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{score}/100</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'capitalize' }}>{inspection.conditionRating}</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: '0 0 16px' }}>
              {inspection.inspectorNotes || `${inspection.checklist?.length || 0} points checked. Full report available.`}
            </p>
            <button onClick={handleClose} style={{ padding: '10px 28px', background: 'var(--gold)', color: '#000', borderRadius: 9999, fontWeight: 800, fontSize: 11, border: 'none', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: 16 }}>
      <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', maxWidth: 480, width: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Ghost Check Inspection</span>
          </div>
          <button onClick={handleClose} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        {/* Steps indicator */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
            {[
              { label: 'Order', step: 'payment' },
              { label: 'Pay', step: 'payment' },
              { label: 'Assigned', step: 'tracking' },
              { label: 'Inspected', step: 'tracking' },
              { label: 'Report', step: 'report' },
            ].map((s, i) => {
              const done = s.step === 'payment' ? step !== 'check' : (step === 'tracking');
              const active = s.step === 'payment' ? step === 'payment' : (step === 'tracking' && i < 3);
              return (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', margin: '0 auto 4px',
                    background: done ? '#22c55e' : active ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
                    color: done || active ? '#000' : 'rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 900,
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <div style={{ fontSize: 8, color: done ? 'rgba(255,255,255,0.5)' : active ? 'var(--gold)' : 'rgba(255,255,255,0.2)', fontWeight: done ? 500 : 700 }}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Existing order */}
          {existingOrder && existingOrder.status !== 'completed' && existingOrder.status !== 'cancelled' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Clock size={16} style={{ color: 'var(--gold)' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Inspection Already Ordered</span>
              </div>
              <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 10, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Smartphone size={18} style={{ color: '#3b82f6' }} />
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  Status: <strong style={{ color: '#3b82f6', textTransform: 'capitalize' }}>{existingOrder.status?.replace(/_/g, ' ') || 'Processing'}</strong>
                  <br />Your inspection is being processed.
                </div>
              </div>
              <button onClick={handleClose}
                style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'var(--gold)', color: '#000', fontWeight: 800, fontSize: 11, border: 'none', cursor: 'pointer' }}>
                Track This Order
              </button>
            </div>
          ) : step === 'check' ? (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>What's Included</span>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    '150-point forensic vehicle inspection',
                    'Comprehensive digital report with scores',
                    'Condition rating (Excellent/Good/Fair/Poor)',
                    'Detailed inspector notes & findings',
                    'Photo documentation of key areas',
                  ].map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                      <CheckCircle size={12} style={{ color: '#22c55e', flexShrink: 0 }} /> {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ background: 'rgba(212,196,168,0.04)', border: '1px solid rgba(212,196,168,0.1)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Ghost Check Fee</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{formatKES(GHOST_CHECK_FEE)}</span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Paid once per vehicle via M-Pesa</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>M-Pesa Phone Number</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'rgba(255,255,255,0.2)', pointerEvents: 'none' }}>+254</span>
                    <input value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="712345678"
                      style={{
                        width: '100%', padding: '10px 10px 10px 44px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.3)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }} />
                  </div>
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                  M-Pesa STK push will be sent to this number
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep('payment')} disabled={!phone || phone.length < 10}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 8,
                    background: phone?.length >= 10 ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
                    color: phone?.length >= 10 ? '#000' : 'rgba(255,255,255,0.3)',
                    fontWeight: 800, fontSize: 11, border: 'none', cursor: phone?.length >= 10 ? 'pointer' : 'not-allowed',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                  Continue to Payment
                </button>
                <button onClick={handleClose}
                  style={{ padding: '12px 20px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : step === 'payment' ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Smartphone size={24} style={{ color: '#10b981' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, color: '#fff', margin: '0 0 4px' }}>Confirm Payment</h3>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  An M-Pesa payment request of <strong style={{ color: '#fff' }}>{formatKES(GHOST_CHECK_FEE)}</strong> will be sent to <strong style={{ color: 'var(--gold)' }}>+254 {phone}</strong>
                </p>
              </div>

              <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, color: '#10b981', marginBottom: 4 }}>📱 M-Pesa Instructions</div>
                <ol style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <li>Check your phone for the M-Pesa STK push</li>
                  <li>Enter your M-Pesa PIN and confirm</li>
                  <li>Wait for the confirmation SMS</li>
                  <li>Return here — the report will be ready within 48h</li>
                </ol>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleOrder} disabled={ordering}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 8,
                    background: ordering ? 'rgba(255,255,255,0.06)' : '#10b981',
                    color: ordering ? 'rgba(255,255,255,0.3)' : '#000',
                    fontWeight: 800, fontSize: 11, border: 'none',
                    cursor: ordering ? 'wait' : 'pointer',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  {ordering ? 'Sending Payment Request...' : `Pay ${formatKES(GHOST_CHECK_FEE)} via M-Pesa`}
                </button>
                <button onClick={() => setStep('check')} disabled={ordering}
                  style={{ padding: '12px 20px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: 11, cursor: ordering ? 'not-allowed' : 'pointer' }}>
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle size={24} style={{ color: '#22c55e' }} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, color: '#fff', margin: '0 0 4px' }}>Order Placed!</h3>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 16, maxWidth: 320, margin: '0 auto 16px' }}>
                Your Ghost Check request has been submitted. An inspector will be assigned within 24 hours. You'll receive a notification when the report is ready.
              </p>
              <div style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)', borderRadius: 10, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                <Clock size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                  Expected timeline: <strong style={{ color: '#fff' }}>24-48 hours</strong> from assignment to report delivery.
                </div>
              </div>
              <button onClick={handleClose}
                style={{ width: '100%', padding: '12px', borderRadius: 8, background: 'var(--gold)', color: '#000', fontWeight: 800, fontSize: 11, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Done — Track in Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>
            Powered by Kayad Ghost Check
          </span>
          <Link to="/ghost-checker" style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>Learn more →</Link>
        </div>
      </div>
    </div>
  );
}
