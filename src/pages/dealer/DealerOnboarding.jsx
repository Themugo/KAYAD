import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authAPI } from '../../api/api';
import { Check, ChevronRight, ChevronLeft, Building2, Banknote, CheckCircle } from 'lucide-react';

const STEPS = [
  { label: 'Business', icon: Building2 },
  { label: 'Payments', icon: Banknote },
  { label: 'Review', icon: CheckCircle },
];

export default function DealerOnboarding() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    location: '',
    bio: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    paybillNumber: '',
    mpesaPhone: '',
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      businessName: user.businessName || '',
      location: user.location || '',
      bio: user.bio || '',
      bankName: user.bankName || user.paymentDetails?.bankName || '',
      accountName: user.paymentDetails?.accountName || '',
      accountNumber: user.bankAccount || user.paymentDetails?.accountNumber || '',
      paybillNumber: user.paymentDetails?.paybillNumber || '',
      mpesaPhone: user.mpesaBusiness || user.paymentDetails?.mpesaPhone || '',
    });
  }, [user]);

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const canNext = () => {
    if (step === 0) return form.businessName.trim() && form.location.trim();
    if (step === 1) return true;
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { user: updated } = await authAPI.updateProfile({
        businessName: form.businessName,
        location: form.location,
        bio: form.bio,
        paymentDetails: {
          bankName: form.bankName,
          accountName: form.accountName,
          accountNumber: form.accountNumber,
          paybillNumber: form.paybillNumber,
          mpesaPhone: form.mpesaPhone,
        },
        onboardingComplete: true,
      });
      if (updated) setUser(updated);
      toast('Onboarding complete! Welcome to Kayad.', 'success');
      navigate('/dealer');
    } catch {
      toast('Failed to save. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <div className="page loading-center"><div className="spinner" /></div>;

  if (user.onboardingComplete) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 60, paddingBottom: 60, maxWidth: 600, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2>Onboarding Complete</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
            Your seller profile is all set up.
          </p>
          <button onClick={() => navigate('/dealer')} className="btn btn-gold">
            Go to Dealer Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 680 }}>

        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div className="section-eyebrow">Seller Onboarding</div>
          <h2>Set Up Your Shop</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
            Complete these steps to start listing vehicles
          </p>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 40 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 9999,
                background: i <= step ? 'rgba(212,196,168,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${i <= step ? 'rgba(212,196,168,0.2)' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.3s',
              }}>
                <s.icon size={13} style={{ color: i <= step ? 'var(--gold)' : 'rgba(255,255,255,0.2)' }} />
                <span style={{
                  fontSize: 11, fontWeight: 700, color: i <= step ? 'var(--gold)' : 'rgba(255,255,255,0.2)',
                }}>{s.label}</span>
                {i < step && <Check size={11} style={{ color: 'var(--gold)' }} />}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  width: 32, height: 1,
                  background: i < step ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
                }} />
              )}
            </div>
          ))}
        </div>

        <div style={{
          background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: 36,
        }}>
          {step === 0 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Business Profile</h3>
              <div className="input-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>Business Name *</label>
                <input className="input" placeholder="Your dealership or trading name"
                  value={form.businessName} onChange={e => update('businessName', e.target.value)} />
              </div>
              <div className="input-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>Location *</label>
                <input className="input" placeholder="City (e.g. Nairobi, Mombasa)"
                  value={form.location} onChange={e => update('location', e.target.value)} />
              </div>
              <div className="input-group">
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>Bio</label>
                <textarea className="input" rows={3} placeholder="Tell buyers about your dealership..."
                  value={form.bio} onChange={e => update('bio', e.target.value)}
                  style={{ resize: 'vertical', minHeight: 80 }} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Payment Setup</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
                Enter your preferred payout methods. Buyers will send payments here.
              </p>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', marginBottom: 16 }}>Bank Transfer</h4>
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>Bank Name</label>
                <input className="input" placeholder="e.g. KCB, Equity, Co-op"
                  value={form.bankName} onChange={e => update('bankName', e.target.value)} />
              </div>
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>Account Name</label>
                <input className="input" placeholder="Name on the bank account"
                  value={form.accountName} onChange={e => update('accountName', e.target.value)} />
              </div>
              <div className="input-group" style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>Account Number</label>
                <input className="input" placeholder="Bank account number"
                  value={form.accountNumber} onChange={e => update('accountNumber', e.target.value)} />
              </div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', marginBottom: 16 }}>M-Pesa</h4>
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>Paybill Number</label>
                <input className="input" placeholder="Optional — M-Pesa paybill"
                  value={form.paybillNumber} onChange={e => update('paybillNumber', e.target.value)} />
              </div>
              <div className="input-group">
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>M-Pesa Phone (2547...)</label>
                <input className="input" placeholder="Phone for bid deposits and payouts"
                  value={form.mpesaPhone} onChange={e => update('mpesaPhone', e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Review & Complete</h3>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Business Profile</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Business Name</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.businessName}</div></div>
                  <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Location</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.location}</div></div>
                  {form.bio && <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Bio</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.bio}</div></div>}
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Payment Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {form.bankName && <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Bank</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.bankName}</div></div>}
                    {form.accountName && <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Account Name</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.accountName}</div></div>}
                    {form.accountNumber && <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Account No.</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.accountNumber}</div></div>}
                    {form.paybillNumber && <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Paybill</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.paybillNumber}</div></div>}
                    {form.mpesaPhone && <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>M-Pesa</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.mpesaPhone}</div></div>}
                  </div>
                </div>
              </div>
              <div style={{ background: 'rgba(212,196,168,0.06)', border: '1px solid rgba(212,196,168,0.12)', borderRadius: 8, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--gold-light)' }}>
                  <strong>Listing fees are currently waived.</strong> You can list and sell without any upfront payment. Escrow transactions are fully protected.
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={() => setStep(s => s - 1)} disabled={step === 0} style={{
              padding: '10px 20px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: step === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
              cursor: step === 0 ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <ChevronLeft size={14} /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} style={{
                padding: '10px 24px', borderRadius: 10,
                background: canNext() ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
                border: 'none', color: canNext() ? '#000' : 'rgba(255,255,255,0.2)',
                cursor: canNext() ? 'pointer' : 'not-allowed',
                fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving} style={{
                padding: '10px 28px', borderRadius: 10,
                background: 'var(--gold)', border: 'none', color: '#000',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                opacity: saving ? 0.6 : 1,
              }}>
                {saving ? 'Saving...' : 'Complete Setup'}
                {!saving && <CheckCircle size={14} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
