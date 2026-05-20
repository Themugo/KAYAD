import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authAPI } from '../../api/api';

export default function DealerSetup() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [bankInfo, setBankInfo] = useState({
    bankName: '', accountName: '', accountNumber: '', paybillNumber: '', mpesaPhone: ''
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.paymentDetails) setBankInfo(prev => ({ ...prev, ...user.paymentDetails }));
    setLoading(false);
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile({ paymentDetails: bankInfo, onboardingComplete: true });
      toast('Payment details saved! You can now start listing.', 'success');
      navigate('/dealer');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save payment details', 'error');
    }
    finally { setSaving(false); }
  };

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 700 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Seller Onboarding</div>
          <h2>Activate Your Shop</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Enter where you want buyers to send their payments.</p>
        </div>

        <div style={{ background: '#111', padding: 40, borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ marginBottom: 32 }}>
            <h4 style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: 20 }}>🏦 Bank Transfer Details</h4>
            <div className="space-y-4">
              {[
                { key: 'bankName', placeholder: 'Bank Name (e.g. KCB, Equity)' },
                { key: 'accountName', placeholder: 'Account Name' },
                { key: 'accountNumber', placeholder: 'Account Number' },
              ].map(f => (
                <div key={f.key} className="input-group" style={{ marginBottom: 16 }}>
                  <input className="input" placeholder={f.placeholder}
                    value={bankInfo[f.key]} onChange={e => setBankInfo(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.05)', marginBottom: 32 }} />

          <div style={{ marginBottom: 32 }}>
            <h4 style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: 20 }}>📱 M-Pesa</h4>
            <div className="input-group" style={{ marginBottom: 16 }}>
              <input className="input" placeholder="Paybill Number (Optional)"
                value={bankInfo.paybillNumber} onChange={e => setBankInfo(p => ({ ...p, paybillNumber: e.target.value }))} />
            </div>
            <div className="input-group">
              <input className="input" placeholder="M-Pesa Phone for Bid Deposits (2547...)"
                value={bankInfo.mpesaPhone} onChange={e => setBankInfo(p => ({ ...p, mpesaPhone: e.target.value }))} />
            </div>
          </div>

          <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 8, padding: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--gold-light)' }}>
              🎉 <strong>Listing fees are currently waived.</strong> You can list and sell without any upfront payment. Escrow transactions are fully protected.
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', padding: '16px 0', background: 'var(--gold)', color: 'black', fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 16 }}>
            {saving ? 'Saving...' : '🚀 Launch My Showroom'}
          </button>
        </div>
      </div>
    </div>
  );
}
