import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { carsAPI, formatKES } from '../api/api';
import { getMockCar } from '../data/mockCars';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Checkout() {
  const { id } = useParams();
  const { user, isAuth } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    carsAPI.get(id)
      .then(d => { const c = d.car || d.data || d; setCar(c || getMockCar(id)); })
      .catch(() => setCar(getMockCar(id)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBuy = async () => {
    if (!isAuth) { navigate(`/login?redirect=/checkout/${id}`); return; }
    if (!phone || phone.replace(/\D/g, '').length < 9) {
      toast('Enter a valid M-Pesa number', 'error'); return;
    }
    setProcessing(true);
    try {
      const data = await carsAPI.buy(id, { phone: phone.replace(/\D/g, '') });
      toast('M-Pesa STK Push sent! Check your phone.', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Payment failed', 'error');
    } finally { setProcessing(false); }
  };

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;
  if (!car) return <div className="page loading-center"><h3>Car not found</h3></div>;

  const coverIdx = car.coverImage ?? 0;
  const img = car.images?.[coverIdx]?.url || car.images?.[coverIdx];

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 100, paddingBottom: 32, maxWidth: 640 }}>
        <Link to={`/cars/${id}`} style={{ color: 'var(--text-muted)', fontSize: 13, display: 'inline-block', marginBottom: 20 }}>← Back to listing</Link>
        <h2 style={{ marginBottom: 24 }}>Checkout</h2>

        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ width: 100, height: 70, borderRadius: 8, overflow: 'hidden', background: 'var(--surface)', flexShrink: 0 }}>
              {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ padding: 20, textAlign: 'center', fontSize: 24 }}>🚗</div>}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{car.title}</div>
              <div className="price-tag" style={{ fontSize: '1.2rem', marginTop: 4 }}>{formatKES(car.price)}</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div className="input-group" style={{ marginBottom: 16 }}>
              <label className="input-label">M-Pesa Phone Number</label>
              <div className="mpesa-wrap">
                <span className="mpesa-prefix">🇰🇪</span>
                <input className="input" placeholder="0712 345 678" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>

            <button className="btn btn-gold btn-full btn-lg" onClick={handleBuy} disabled={processing || !phone}>
              {processing ? 'Processing...' : `🔒 Pay ${formatKES(car.price)} via M-Pesa`}
            </button>

            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
              🔒 Your payment is held in escrow until you confirm receipt of the vehicle.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
