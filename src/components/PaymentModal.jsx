// src/components/PaymentModal.jsx
import { useState, useEffect } from 'react';
import { paymentsAPI, formatKES } from '../api/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

export default function PaymentModal({ onClose, amount, carId, type = 'buy', onSuccess, title }) {
  const { on } = useSocket();
  const { toast } = useToast();

  const [phone, setPhone]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [stage, setStage]           = useState('input'); // input | waiting | success | failed
  const [checkoutId, setCheckoutId] = useState(null);
  const [pollInterval, setPoll]     = useState(null);

  // Listen for real-time payment result
  useEffect(() => {
    if (!checkoutId) return;

    const offSuccess = on('paymentSuccess', (data) => {
      if (data.checkoutID === checkoutId) {
        clearInterval(pollInterval);
        setStage('success');
        toast('Payment confirmed via M-Pesa! 🎉', 'success');
        setTimeout(() => { onSuccess?.(); onClose(); }, 2000);
      }
    });

    const offFailed = on('paymentFailed', (data) => {
      if (data.checkoutID === checkoutId) {
        clearInterval(pollInterval);
        setStage('failed');
        toast('Payment failed or cancelled.', 'error');
      }
    });

    return () => { offSuccess(); offFailed(); };
  }, [checkoutId, pollInterval]);

  // Fallback polling every 5s while waiting
  useEffect(() => {
    if (stage !== 'waiting' || !checkoutId) return;

    const interval = setInterval(async () => {
      try {
        const data = await paymentsAPI.byCheckout(checkoutId);
        if (data.payment?.status === 'success') {
          clearInterval(interval);
          setStage('success');
          toast('Payment confirmed! 🎉', 'success');
          setTimeout(() => { onSuccess?.(); onClose(); }, 1800);
        } else if (data.payment?.status === 'failed') {
          clearInterval(interval);
          setStage('failed');
        }
      } catch {}
    }, 5000);

    setPoll(interval);
    return () => clearInterval(interval);
  }, [stage, checkoutId]);

  const formatPhone = (p) => {
    const clean = p.replace(/\D/g, '');
    if (clean.startsWith('0')) return '254' + clean.slice(1);
    if (clean.startsWith('254')) return clean;
    return '254' + clean;
  };

  const handleInitiate = async () => {
    const formatted = formatPhone(phone);
    if (formatted.length !== 12) {
      toast('Enter a valid Safaricom number (07...)', 'error'); return;
    }

    setLoading(true);
    try {
      const data = await paymentsAPI.initiate({
        phone: formatted, amount, carId, type,
      });
      setCheckoutId(data.checkoutRequestID || data.checkoutID);
      setStage('waiting');
      toast('STK push sent! Check your phone 📱', 'info');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to initiate payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              M-Pesa Payment
            </div>
            <h3 style={{ marginTop: 4 }}>{title || 'Complete Payment'}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>✕</button>
        </div>

        {/* Amount display */}
        <div style={{
          background: 'var(--gold-glow)', border: '1px solid rgba(200,150,42,0.2)',
          borderRadius: 'var(--radius)', padding: '16px', marginBottom: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount</div>
          <div className="price-tag" style={{ fontSize: '2rem', marginTop: 4 }}>{formatKES(amount)}</div>
        </div>

        {/* Stages */}
        {stage === 'input' && (
          <>
            <div className="input-group" style={{ marginBottom: 20 }}>
              <label className="input-label">Safaricom Number</label>
              <div className="mpesa-wrap">
                <span className="mpesa-prefix">🇰🇪</span>
                <input
                  className="input"
                  placeholder="0712 345 678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  maxLength={13}
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Funds go directly to the seller — not to us.
              </div>
            </div>

            <button
              className="btn btn-gold btn-full btn-lg"
              onClick={handleInitiate}
              disabled={loading || phone.length < 9}
            >
              {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Sending...</> : '📲 Send STK Push'}
            </button>

            {/* M-Pesa logo branding */}
            <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
              Powered by <strong style={{ color: '#00A651' }}>M-Pesa</strong> · Payments go to the dealer directly
            </div>
          </>
        )}

        {stage === 'waiting' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
            <h3 style={{ marginBottom: 8 }}>Check Your Phone</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              Enter your M-Pesa PIN on your phone to complete the payment.
            </p>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Waiting for M-Pesa confirmation...</div>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => setStage('input')}>
              Try Again
            </button>
          </div>
        )}

        {stage === 'success' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <h3 style={{ color: 'var(--green)', marginBottom: 8 }}>Payment Confirmed!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your M-Pesa payment was received successfully.</p>
          </div>
        )}

        {stage === 'failed' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>❌</div>
            <h3 style={{ color: 'var(--red)', marginBottom: 8 }}>Payment Failed</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              The payment was cancelled or timed out. Please try again.
            </p>
            <button className="btn btn-gold" onClick={() => setStage('input')}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
