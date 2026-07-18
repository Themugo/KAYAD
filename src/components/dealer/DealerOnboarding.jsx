import { useState } from 'react';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';

/**
 * Dealer Onboarding Wizard Component
 * Multi-step form for dealer registration and verification
 */
export default function DealerOnboardingWizard({ onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    businessName: '',
    registrationNumber: '',
    kraPin: '',
    physicalAddress: '',
    county: '',
    phone: '',
    email: '',
    website: '',
    yearsInBusiness: '',
    inventorySize: '',
    specializations: [],
    agreeToTerms: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const steps = [
    { id: 'business', label: 'Business Info', icon: '🏢' },
    { id: 'verification', label: 'Verification', icon: '✓' },
    { id: 'profile', label: 'Profile Setup', icon: '👤' },
    { id: 'review', label: 'Review & Submit', icon: '📋' },
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // In production, this would call the API
      // await dealerAPI.register(formData);
      await new Promise(resolve => setTimeout(resolve, 1500));
      onComplete?.();
    } catch (err) {
      console.error('Registration failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ margin: 0 }}>Business Information</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>
              Enter your business details for verification
            </p>
            
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Business Name *
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={e => handleChange('businessName', e.target.value)}
                placeholder="e.g., Nairobi Auto Hub Ltd"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Business Registration No. *
                </label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={e => handleChange('registrationNumber', e.target.value)}
                  placeholder="e.g., CPR/2018/12345"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  KRA PIN *
                </label>
                <input
                  type="text"
                  value={formData.kraPin}
                  onChange={e => handleChange('kraPin', e.target.value)}
                  placeholder="A012345678B"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
                />
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Physical Address *
              </label>
              <input
                type="text"
                value={formData.physicalAddress}
                onChange={e => handleChange('physicalAddress', e.target.value)}
                placeholder="e.g., Industrial Area, Nairobi"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                County *
              </label>
              <select
                value={formData.county}
                onChange={e => handleChange('county', e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
              >
                <option value="">Select county</option>
                <option value="Nairobi">Nairobi</option>
                <option value="Mombasa">Mombasa</option>
                <option value="Kisumu">Kisumu</option>
                <option value="Nakuru">Nakuru</option>
                <option value="Eldoret">Eldoret</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        );
        
      case 1:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ margin: 0 }}>Verification Documents</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>
              Upload documents for identity verification
            </p>
            
            <div style={{
              border: '2px dashed var(--border)',
              borderRadius: 12,
              padding: 40,
              textAlign: 'center',
              cursor: 'pointer',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Upload Business Registration Certificate</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF, JPG, PNG up to 10MB</div>
            </div>
            
            <div style={{
              border: '2px dashed var(--border)',
              borderRadius: 12,
              padding: 40,
              textAlign: 'center',
              cursor: 'pointer',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🪪</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Upload Director ID / Passport</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF, JPG, PNG up to 10MB</div>
            </div>
            
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              gap: 12,
            }}>
              <AlertCircle size={20} style={{ color: '#3b82f6', flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: '#3b82f6' }}>
                Documents are securely stored and only used for verification purposes. 
                All information is encrypted and protected.
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ margin: 0 }}>Profile Setup</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>
              Complete your dealer profile
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  placeholder="+254 700 000 000"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Years in Business *
                </label>
                <select
                  value={formData.yearsInBusiness}
                  onChange={e => handleChange('yearsInBusiness', e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
                >
                  <option value="">Select</option>
                  <option value="0-1">Less than 1 year</option>
                  <option value="1-3">1-3 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5+">5+ years</option>
                </select>
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Typical Inventory Size
              </label>
              <select
                value={formData.inventorySize}
                onChange={e => handleChange('inventorySize', e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
              >
                <option value="">Select</option>
                <option value="1-10">1-10 vehicles</option>
                <option value="10-50">10-50 vehicles</option>
                <option value="50-100">50-100 vehicles</option>
                <option value="100+">100+ vehicles</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Specializations
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['SUVs', 'Sedans', 'Trucks', 'Luxury', 'Commercial', 'Import'].map(spec => (
                  <label key={spec} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: formData.specializations.includes(spec) ? 'var(--blue-500)' : 'var(--surface)',
                    color: formData.specializations.includes(spec) ? '#fff' : 'var(--text)',
                    borderRadius: 20,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.specializations.includes(spec)}
                      onChange={e => {
                        const newSpecs = e.target.checked
                          ? [...formData.specializations, spec]
                          : formData.specializations.filter(s => s !== spec);
                        handleChange('specializations', newSpecs);
                      }}
                      style={{ display: 'none' }}
                    />
                    {spec}
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ margin: 0 }}>Review & Submit</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>
              Please review your information before submitting
            </p>
            
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Business Name</div>
                  <div style={{ fontWeight: 600 }}>{formData.businessName || '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Registration No.</div>
                  <div style={{ fontWeight: 600 }}>{formData.registrationNumber || '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>KRA PIN</div>
                  <div style={{ fontWeight: 600 }}>{formData.kraPin || '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>County</div>
                  <div style={{ fontWeight: 600 }}>{formData.county || '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Years in Business</div>
                  <div style={{ fontWeight: 600 }}>{formData.yearsInBusiness || '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Specializations</div>
                  <div style={{ fontWeight: 600 }}>{formData.specializations.join(', ') || 'None'}</div>
                </div>
              </div>
            </div>
            
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.agreeToTerms}
                onChange={e => handleChange('agreeToTerms', e.target.checked)}
                style={{ marginTop: 4 }}
              />
              <span style={{ fontSize: 13 }}>
                I agree to KAYAD's <a href="/terms" style={{ color: 'var(--blue-500)' }}>Terms of Service</a> and{' '}
                <a href="/privacy" style={{ color: 'var(--blue-500)' }}>Privacy Policy</a>, and confirm that all information provided is accurate.
              </span>
            </label>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      {/* Progress indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: 16,
          left: '10%',
          right: '10%',
          height: 2,
          background: 'var(--border)',
        }} />
        <div style={{
          position: 'absolute',
          top: 16,
          left: '10%',
          width: `${(currentStep / (steps.length - 1)) * 80}%`,
          height: 2,
          background: 'var(--blue-500)',
          transition: 'width 0.3s',
        }} />
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: i <= currentStep ? 'var(--blue-500)' : 'var(--surface)',
              border: i <= currentStep ? 'none' : '2px solid var(--border)',
              color: i <= currentStep ? '#fff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
            }}>
              {i < currentStep ? <CheckCircle size={18} /> : step.icon}
            </div>
            <span style={{ fontSize: 11, color: i <= currentStep ? 'var(--blue-500)' : 'var(--text-muted)', fontWeight: 500 }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Form content */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: 32,
        border: '1px solid var(--border)',
        marginBottom: 24,
      }}>
        {renderStep()}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={currentStep === 0 ? onCancel : handleBack}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </button>
        
        {currentStep < steps.length - 1 ? (
          <button
            onClick={handleNext}
            style={{
              padding: '12px 32px',
              background: 'var(--blue-500)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!formData.agreeToTerms || submitting}
            style={{
              padding: '12px 32px',
              background: formData.agreeToTerms && !submitting ? 'var(--blue-500)' : 'var(--border)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: formData.agreeToTerms && !submitting ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        )}
      </div>
    </div>
  );
}
