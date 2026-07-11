import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  CheckCircle, XCircle, Clock, AlertCircle, Shield, 
  FileText, Building, Phone, Mail, MapPin, Upload,
  ChevronRight, Star, BadgeCheck
} from 'lucide-react';
import { DealerHub } from '../../components/dealer';
import '../../styles/dealer.css';

const VERIFICATION_STEPS = [
  {
    id: 'business',
    title: 'Business Verification',
    description: 'Verify your business registration and documents',
    icon: Building,
  },
  {
    id: 'phone',
    title: 'Phone Verification',
    description: 'Confirm your phone number via OTP',
    icon: Phone,
  },
  {
    id: 'email',
    title: 'Email Verification',
    description: 'Verify your email address',
    icon: Mail,
  },
  {
    id: 'identity',
    title: 'Identity Verification',
    description: 'Submit ID or passport for KYC',
    icon: Shield,
  },
  {
    id: 'location',
    title: 'Location Verification',
    description: 'Verify your business address',
    icon: MapPin,
  },
];

const STATUS_CONFIG = {
  pending: {
    color: 'var(--orange)',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    icon: Clock,
    label: 'Pending Review',
    description: 'Your documents are being reviewed by our team.',
  },
  verified: {
    color: 'var(--green)',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    icon: CheckCircle,
    label: 'Verified',
    description: 'Your account is fully verified. You have access to all dealer features.',
  },
  rejected: {
    color: 'var(--red)',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    icon: XCircle,
    label: 'Rejected',
    description: 'Some documents were rejected. Please resubmit.',
  },
  unverified: {
    color: 'var(--text-muted)',
    bgColor: 'rgba(156, 163, 175, 0.1)',
    icon: AlertCircle,
    label: 'Not Verified',
    description: 'Complete verification to unlock all features.',
  },
};

export default function DealerVerificationStatus() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);

  useEffect(() => {
    loadVerification();
  }, []);

  const loadVerification = async () => {
    setLoading(true);
    try {
      const data = await dealerAPI.getVerificationStatus();
      setVerification(data);
    } catch {
      toast('Failed to load verification status', 'error');
    }
    setLoading(false);
  };

  const getStepStatus = (stepId) => {
    if (!verification) return 'unverified';
    const step = verification.steps?.find(s => s.id === stepId);
    return step?.status || 'unverified';
  };

  const isFullyVerified = verification?.status === 'verified';
  const verifiedSteps = verification?.steps?.filter(s => s.status === 'verified').length || 0;
  const totalSteps = VERIFICATION_STEPS.length;
  const progressPercent = (verifiedSteps / totalSteps) * 100;

  return (
    <DealerHub user={user}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 0' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 'var(--dealer-text-2xl)', fontWeight: 800, marginBottom: 8 }}>
            Account Verification
          </h1>
          <p style={{ color: 'var(--dealer-text-muted)' }}>
            Complete verification to build trust with buyers and unlock all dealer features.
          </p>
        </div>

        {/* Status Card */}
        <div style={{
          padding: 24,
          background: 'var(--dealer-surface)',
          borderRadius: 'var(--dealer-radius-xl)',
          border: '1px solid var(--dealer-border)',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: STATUS_CONFIG[verification?.status || 'unverified'].bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {isFullyVerified ? (
                <Star size={32} style={{ color: 'var(--gold)' }} />
              ) : (
                <BadgeCheck size={32} style={{ color: STATUS_CONFIG[verification?.status || 'unverified'].color }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                {STATUS_CONFIG[verification?.status || 'unverified'].label}
              </div>
              <div style={{ color: 'var(--dealer-text-muted)', fontSize: 14 }}>
                {STATUS_CONFIG[verification?.status || 'unverified'].description}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {!isFullyVerified && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--dealer-text-muted)' }}>
                  Verification Progress
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {verifiedSteps} of {totalSteps} completed
                </span>
              </div>
              <div style={{
                height: 8,
                background: 'var(--dealer-card)',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, var(--dealer-gold), var(--dealer-gold-dark))',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )}

          {isFullyVerified && (
            <div style={{
              padding: 16,
              background: 'linear-gradient(135deg, rgba(212, 196, 168, 0.08), rgba(168, 85, 247, 0.05))',
              border: '1px solid var(--dealer-border-gold)',
              borderRadius: 'var(--dealer-radius-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <CheckCircle size={20} style={{ color: 'var(--dealer-gold)' }} />
              <span style={{ color: 'var(--dealer-text)', fontSize: 14 }}>
                Your verified badge is displayed on all your listings, building buyer trust.
              </span>
            </div>
          )}
        </div>

        {/* Verification Steps */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 'var(--dealer-text-lg)', fontWeight: 700, marginBottom: 16 }}>
            Verification Steps
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {VERIFICATION_STEPS.map((step) => {
              const status = getStepStatus(step.id);
              const isComplete = status === 'verified';
              const isPending = status === 'pending';
              const Icon = step.icon;
              
              return (
                <div
                  key={step.id}
                  style={{
                    padding: 20,
                    background: 'var(--dealer-surface)',
                    borderRadius: 'var(--dealer-radius-lg)',
                    border: `1px solid ${isComplete ? 'rgba(34, 197, 94, 0.3)' : isPending ? 'rgba(249, 115, 22, 0.3)' : 'var(--dealer-border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--dealer-radius-md)',
                    background: isComplete 
                      ? 'rgba(34, 197, 94, 0.1)' 
                      : isPending 
                        ? 'rgba(249, 115, 22, 0.1)' 
                        : 'var(--dealer-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isComplete ? (
                      <CheckCircle size={24} style={{ color: 'var(--green)' }} />
                    ) : isPending ? (
                      <Clock size={24} style={{ color: 'var(--orange)' }} />
                    ) : (
                      <Icon size={24} style={{ color: 'var(--dealer-text-muted)' }} />
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{step.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--dealer-text-muted)' }}>
                      {step.description}
                    </div>
                  </div>

                  <div>
                    {isComplete ? (
                      <span style={{
                        padding: '4px 12px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: 'var(--green)',
                        borderRadius: 100,
                        fontSize: 12,
                        fontWeight: 600,
                      }}>
                        Verified
                      </span>
                    ) : isPending ? (
                      <span style={{
                        padding: '4px 12px',
                        background: 'rgba(249, 115, 22, 0.1)',
                        color: 'var(--orange)',
                        borderRadius: 100,
                        fontSize: 12,
                        fontWeight: 600,
                      }}>
                        Under Review
                      </span>
                    ) : (
                      <Link 
                        to={`/dealer/verify/${step.id}`}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--dealer-gold)',
                          color: '#0A1628',
                          borderRadius: 'var(--dealer-radius)',
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        Complete <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Benefits Section */}
        <div style={{
          padding: 24,
          background: 'var(--dealer-surface)',
          borderRadius: 'var(--dealer-radius-xl)',
          border: '1px solid var(--dealer-border)',
        }}>
          <h3 style={{ fontSize: 'var(--dealer-text-lg)', fontWeight: 700, marginBottom: 16 }}>
            Benefits of Verification
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { icon: '✓', text: 'Verified dealer badge on listings' },
              { icon: '✓', text: 'Higher search ranking' },
              { icon: '✓', text: 'Access to premium features' },
              { icon: '✓', text: 'Escrow transaction limit increase' },
            ].map((benefit, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} style={{ color: 'var(--dealer-gold)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: 'var(--dealer-text-muted)' }}>{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DealerHub>
  );
}
