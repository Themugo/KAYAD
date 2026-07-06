import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authAPI } from '../api/api';
import { Check, ChevronRight, Phone, MapPin, CreditCard, CheckCircle } from 'lucide-react';
import '../styles/dashboard.css';

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
        <div className="container onboarding-complete-container">
          <div className="onboarding-check-icon">✅</div>
          <h2>Onboarding Complete</h2>
          <p className="onboarding-complete-text">
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
      <div className="container onboarding-form-container">

        <div className="onboarding-header">
          <div className="section-eyebrow">Private Seller Setup</div>
          <h2>Complete Your Profile</h2>
          <p className="onboarding-header-desc">
            A few quick steps to start selling securely
          </p>
        </div>

        {/* Steps indicator */}
        <div className="onboarding-step-row">
          {STEPS.map((s, i) => (
            <div key={i} className="onboarding-step-wrap">
              <div className={`onboarding-step ${i <= step ? 'onboarding-step-active' : 'onboarding-step-inactive'}`}>
                <s.icon size={13} style={{ color: i <= step ? 'var(--gold)' : 'rgba(255,255,255,0.2)' }} />
                <span className={i <= step ? 'onboarding-step-text-active' : 'onboarding-step-text-inactive'}>{s.label}</span>
                {i < step && <Check size={11} style={{ color: 'var(--gold)' }} />}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`onboarding-connector ${i < step ? 'onboarding-connector-done' : 'onboarding-connector-pending'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="form-card">
          {step === 0 && (
            <div>
              <h3 className="form-card-title">Phone Verification</h3>
              <p className="form-card-desc">
                Your phone number is used for buyer communication and payment verification.
              </p>
              <div className="input-group form-group">
                <label className="form-label">Phone Number *</label>
                <input className="input" placeholder="0712 345 678"
                  value={form.phone} onChange={e => update('phone', e.target.value)}
                  style={{ borderColor: errors.phone ? 'var(--red)' : undefined }} />
                {errors.phone && <span className="form-error">{errors.phone}</span>}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className="form-card-title">Location</h3>
              <p className="form-card-desc">
                Let buyers know where your vehicle is located for viewing and pickup.
              </p>
              <div className="input-group form-group">
                <label className="form-label">City *</label>
                <input className="input" placeholder="e.g. Nairobi"
                  value={form.city} onChange={e => update('city', e.target.value)}
                  style={{ borderColor: errors.city ? 'var(--red)' : undefined }} />
                {errors.city && <span className="form-error">{errors.city}</span>}
              </div>
              <div className="input-group form-group">
                <label className="form-label">Location Details *</label>
                <input className="input" placeholder="e.g. Westlands, Nairobi"
                  value={form.location} onChange={e => update('location', e.target.value)}
                  style={{ borderColor: errors.location ? 'var(--red)' : undefined }} />
                {errors.location && <span className="form-error">{errors.location}</span>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="form-card-title">Payment Method</h3>
              <p className="form-card-desc">
                Choose how you want to receive payments from buyers through escrow.
              </p>
              <div className="input-group form-group">
                <label className="form-label">Payment Method</label>
                <select className="input" value={form.paymentMethod} onChange={e => update('paymentMethod', e.target.value)}>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              {form.paymentMethod === 'mpesa' && (
                <div className="input-group form-group">
                  <label className="form-label">M-Pesa Phone *</label>
                  <input className="input" placeholder="0712 345 678"
                    value={form.mpesaPhone} onChange={e => update('mpesaPhone', e.target.value)}
                    style={{ borderColor: errors.mpesaPhone ? 'var(--red)' : undefined }} />
                  {errors.mpesaPhone && <span className="form-error">{errors.mpesaPhone}</span>}
                </div>
              )}

              {form.paymentMethod === 'bank' && (
                <>
                  <div className="input-group form-group">
                    <label className="form-label">Bank Name *</label>
                    <input className="input" placeholder="e.g. KCB, Equity"
                      value={form.bankName} onChange={e => update('bankName', e.target.value)}
                      style={{ borderColor: errors.bankName ? 'var(--red)' : undefined }} />
                    {errors.bankName && <span className="form-error">{errors.bankName}</span>}
                  </div>
                  <div className="input-group form-group">
                    <label className="form-label">Account Name *</label>
                    <input className="input" placeholder="Name on bank account"
                      value={form.accountName} onChange={e => update('accountName', e.target.value)}
                      style={{ borderColor: errors.accountName ? 'var(--red)' : undefined }} />
                    {errors.accountName && <span className="form-error">{errors.accountName}</span>}
                  </div>
                  <div className="input-group form-group">
                    <label className="form-label">Account Number *</label>
                    <input className="input" placeholder="Bank account number"
                      value={form.accountNumber} onChange={e => update('accountNumber', e.target.value)}
                      style={{ borderColor: errors.accountNumber ? 'var(--red)' : undefined }} />
                    {errors.accountNumber && <span className="form-error">{errors.accountNumber}</span>}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="form-card-title">Review & Complete</h3>
              <div className="review-card">
                <div className="review-section-title">Contact Information</div>
                <div className="review-grid review-grid-mb">
                  <div><div className="review-label">Phone</div><div className="review-value">{form.phone}</div></div>
                  <div><div className="review-label">City</div><div className="review-value">{form.city}</div></div>
                  <div className="review-item-full"><div className="review-label">Location</div><div className="review-value">{form.location}</div></div>
                </div>
                <div className="review-section-border">
                  <div className="review-section-title">Payment Details</div>
                  <div className="review-grid">
                    <div><div className="review-label">Method</div><div className="review-value" style={{ textTransform: 'capitalize' }}>{form.paymentMethod}</div></div>
                    {form.paymentMethod === 'mpesa' && <div><div className="review-label">M-Pesa</div><div className="review-value">{form.mpesaPhone}</div></div>}
                    {form.paymentMethod === 'bank' && (
                      <>
                        {form.bankName && <div><div className="review-label">Bank</div><div className="review-value">{form.bankName}</div></div>}
                        {form.accountName && <div><div className="review-label">Account Name</div><div className="review-value">{form.accountName}</div></div>}
                        {form.accountNumber && <div className="review-item-full"><div className="review-label">Account No.</div><div className="review-value">{form.accountNumber}</div></div>}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="review-highlight">
                <div className="review-highlight-text">
                  <strong>Listing is free for private sellers.</strong> You can list and sell without any upfront payment. Escrow transactions are fully protected.
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="form-nav">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
              className={`btn-back ${step === 0 ? 'btn-back-disabled' : 'btn-back-enabled'}`}>
              <ChevronRight size={14} className="chevron-back" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={handleNext} disabled={!canNext()}
                className={`btn-next ${canNext() ? 'btn-next-enabled' : 'btn-next-disabled'}`}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving}
                className="btn-submit"
                style={{ cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
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
