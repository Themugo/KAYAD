import { useState, useEffect } from 'react';
import { paymentsAPI, formatKES } from '../api/api';
import { useToast } from '../context/ToastContext';

const TYPE_META = {
  escrow: {
    label: 'Escrow Payment',
    desc: 'Your payment is held securely in escrow until you confirm receipt of the car. Funds are only released to the seller after your approval.',
    sub: 'Held in escrow · Released on your confirmation',
  },
  bid: {
    label: 'Bid Security Deposit',
    desc: 'This is a bid security deposit paid to the seller to secure your bid. It shows you are a serious buyer.',
    sub: 'Paid to the seller · Non-refundable if you win',
  },
  listing: {
    label: 'Listing Fee',
    desc: 'One-time listing fee paid to KAYAD platform to publish your car listing.',
    sub: 'Platform fee · One-time payment',
  },
};

export default function PaymentModal({ onClose, amount, carId, type = 'escrow', onSuccess, title }) {
  const { toast } = useToast();

  const meta = TYPE_META[type] || TYPE_META.escrow;

  const [phone, setPhone]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [stage, setStage]           = useState('input');
  const [checkoutId, setCheckoutId] = useState(null);

  useEffect(() => {
    if (stage !== 'waiting' || !checkoutId) return;

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const data = await paymentsAPI.byCheckout(checkoutId);
        if (data.payment?.status === 'success') {
          clearInterval(interval);
          setStage('success');
          toast('Payment confirmed!', 'success');
          setTimeout(() => { onSuccess?.(); onClose(); }, 1800);
        } else if (data.payment?.status === 'failed') {
          clearInterval(interval);
          setStage('failed');
        }
      } catch {}
      if (attempts >= 24) { // ~2 minutes at 5s intervals
        clearInterval(interval);
        setStage('failed');
        toast('Payment confirmation timed out — please try again.', 'error');
      }
    }, 5000);

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
      toast('STK push sent! Check your phone', 'info');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to initiate payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {meta.label}
            </div>
            <h3 style={{ marginTop: 4 }}>{title || 'Complete Payment'}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>✕</button>
        </div>

        <div style={{
          border: '1px solid #18B6A5',
          borderRadius: 'var(--radius)', padding: '16px', marginBottom: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: '#18B6A5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount</div>
          <div className="price-tag" style={{ fontSize: '2rem', marginTop: 4 }}>{formatKES(amount)}</div>
        </div>

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
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 8 }}>
                {meta.desc}
              </div>
            </div>

            <button
              className="btn btn-gold btn-full btn-lg"
              onClick={handleInitiate}
              disabled={loading || phone.length < 9}
            >
              {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Sending...</> : '📲 Send STK Push'}
            </button>

            <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
              Powered by <strong style={{ color: '#00A651' }}>M-Pesa</strong> · {meta.sub}
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
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {type === 'escrow' ? 'Your payment is held in escrow. The seller will be notified.' :
               type === 'bid' ? 'Your bid security deposit has been paid to the seller.' :
               'Your listing fee has been received.'}
            </p>
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
