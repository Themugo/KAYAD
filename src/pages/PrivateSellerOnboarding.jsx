import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authAPI } from '../api/api';
import { Check, ChevronRight, Phone, MapPin, CreditCard, CheckCircle } from 'lucide-react';

const STEPS = [
  { label: 'Phone', icon: Phone },
  { label: 'Location', icon: MapPin },
  { label: 'Payment', icon: CreditCard },
  { label: 'Review', icon: CheckCircle },
];

export default function PrivateSellerOnboarding() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    phone: '',
    location: '',
    city: '',
    paymentMethod: 'mpesa',
    mpesaPhone: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      phone: user.phone || '',
      location: user.location || '',
      city: user.city || '',
      paymentMethod: user.paymentMethod || 'mpesa',
      mpesaPhone: user.mpesaPhone || '',
      bankName: user.bankName || '',
      accountName: user.accountName || '',
      accountNumber: user.accountNumber || '',
    });
  }, [user]);

  const update = (key, val) => { setForm(p => ({ ...p, [key]: val })); setErrors(p => { const n = { ...p }; delete n[key]; return n; }); };

  const validate = () => {
    const errs = {};
    if (step === 0) {
      if (!form.phone.trim()) errs.phone = 'Phone number required';
      else if (!/^(?:\+?254|0)?7\d{8}$/.test(form.phone.replace(/[\s-]/g, ''))) errs.phone = 'Enter valid Kenyan number';
    }
    if (step === 1) {
      if (!form.location.trim()) errs.location = 'Location required';
      if (!form.city.trim()) errs.city = 'City required';
    }
    if (step === 2) {
      if (form.paymentMethod === 'mpesa' && !form.mpesaPhone.trim()) errs.mpesaPhone = 'M-Pesa phone required';
      else if (form.paymentMethod === 'mpesa' && !/^(?:\+?254|0)?7\d{8}$/.test(form.mpesaPhone.replace(/[\s-]/g, ''))) errs.mpesaPhone = 'Enter valid Kenyan number';
      if (form.paymentMethod === 'bank') {
        if (!form.bankName.trim()) errs.bankName = 'Bank name required';
        if (!form.accountName.trim()) errs.accountName = 'Account name required';
        if (!form.accountNumber.trim()) errs.accountNumber = 'Account number required';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const canNext = () => {
    if (step === 0) return form.phone.trim() && /^(?:\+?254|0)?7\d{8}$/.test(form.phone.replace(/[\s-]/g, ''));
    if (step === 1) return form.location.trim() && form.city.trim();
    if (step === 2) {
      if (form.paymentMethod === 'mpesa') return form.mpesaPhone.trim() && /^(?:\+?254|0)?7\d{8}$/.test(form.mpesaPhone.replace(/[\s-]/g, ''));
      if (form.paymentMethod === 'bank') return form.bankName.trim() && form.accountName.trim() && form.accountNumber.trim();
    }
    return true;
  };

  const handleNext = () => { if (validate()) setStep(s => Math.min(s + 1, 3)); };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { user: updated } = await authAPI.updateProfile({
        phone: form.phone,
        location: form.location,
        city: form.city,
        paymentMethod: form.paymentMethod,
        mpesaPhone: form.mpesaPhone,
        bankName: form.bankName,
        accountName: form.accountName,
        accountNumber: form.accountNumber,
        phoneVerified: true,
        onboardingComplete: true,
      });
      if (updated) setUser(updated);

      toast('Onboarding complete! You can now list vehicles.', 'success');
      navigate('/seller');
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
          <button onClick={() => navigate('/seller')} className="btn btn-gold">
            Go to Seller Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 680 }}>

        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div className="section-eyebrow">Private Seller Setup</div>
          <h2>Complete Your Profile</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
            A few quick steps to start selling securely
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
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Phone Verification</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
                Your phone number is used for buyer communication and payment verification.
              </p>
              <div className="input-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>Phone Number *</label>
                <input className="input" placeholder="0712 345 678"
                  value={form.phone} onChange={e => update('phone', e.target.value)}
                  style={{ borderColor: errors.phone ? 'var(--red)' : undefined }} />
                {errors.phone && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{errors.phone}</span>}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Location</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
                Let buyers know where your vehicle is located for viewing and pickup.
              </p>
              <div className="input-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>City *</label>
                <input className="input" placeholder="e.g. Nairobi"
                  value={form.city} onChange={e => update('city', e.target.value)}
                  style={{ borderColor: errors.city ? 'var(--red)' : undefined }} />
                {errors.city && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{errors.city}</span>}
              </div>
              <div className="input-group">
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>Location Details *</label>
                <input className="input" placeholder="e.g. Westlands, Nairobi"
                  value={form.location} onChange={e => update('location', e.target.value)}
                  style={{ borderColor: errors.location ? 'var(--red)' : undefined }} />
                {errors.location && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{errors.location}</span>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Payment Method</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
                Choose how you want to receive payments from buyers through escrow.
              </p>
              <div className="input-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>Payment Method</label>
                <select className="input" value={form.paymentMethod} onChange={e => update('paymentMethod', e.target.value)}>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              {form.paymentMethod === 'mpesa' && (
                <div className="input-group">
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>M-Pesa Phone *</label>
                  <input className="input" placeholder="0712 345 678"
                    value={form.mpesaPhone} onChange={e => update('mpesaPhone', e.target.value)}
                    style={{ borderColor: errors.mpesaPhone ? 'var(--red)' : undefined }} />
                  {errors.mpesaPhone && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{errors.mpesaPhone}</span>}
                </div>
              )}

              {form.paymentMethod === 'bank' && (
                <>
                  <div className="input-group" style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>Bank Name *</label>
                    <input className="input" placeholder="e.g. KCB, Equity"
                      value={form.bankName} onChange={e => update('bankName', e.target.value)}
                      style={{ borderColor: errors.bankName ? 'var(--red)' : undefined }} />
                    {errors.bankName && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{errors.bankName}</span>}
                  </div>
                  <div className="input-group" style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>Account Name *</label>
                    <input className="input" placeholder="Name on bank account"
                      value={form.accountName} onChange={e => update('accountName', e.target.value)}
                      style={{ borderColor: errors.accountName ? 'var(--red)' : undefined }} />
                    {errors.accountName && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{errors.accountName}</span>}
                  </div>
                  <div className="input-group">
                    <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>Account Number *</label>
                    <input className="input" placeholder="Bank account number"
                      value={form.accountNumber} onChange={e => update('accountNumber', e.target.value)}
                      style={{ borderColor: errors.accountNumber ? 'var(--red)' : undefined }} />
                    {errors.accountNumber && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{errors.accountNumber}</span>}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Review & Complete</h3>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Contact Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Phone</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.phone}</div></div>
                  <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>City</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.city}</div></div>
                  <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Location</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.location}</div></div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Payment Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Method</div><div style={{ fontSize: 13, fontWeight: 600, capitalize }}>{form.paymentMethod}</div></div>
                    {form.paymentMethod === 'mpesa' && <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>M-Pesa</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.mpesaPhone}</div></div>}
                    {form.paymentMethod === 'bank' && (
                      <>
                        {form.bankName && <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Bank</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.bankName}</div></div>}
                        {form.accountName && <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Account Name</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.accountName}</div></div>}
                        {form.accountNumber && <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>Account No.</div><div style={{ fontSize: 13, fontWeight: 600 }}>{form.accountNumber}</div></div>}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ background: 'rgba(212,196,168,0.06)', border: '1px solid rgba(212,196,168,0.12)', borderRadius: 8, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--gold-light)' }}>
                  <strong>Listing is free for private sellers.</strong> You can list and sell without any upfront payment. Escrow transactions are fully protected.
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
              <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={handleNext} disabled={!canNext()} style={{
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
