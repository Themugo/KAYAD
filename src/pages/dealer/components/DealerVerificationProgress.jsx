import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { verificationAPI } from '../../../api/api';

const STEPS = [
  { key: 'phone', label: 'Phone Verified', icon: '📱' },
  { key: 'documents', label: 'Documents Submitted', icon: '📄' },
  { key: 'review', label: 'Under Review', icon: '🔍' },
  { key: 'approved', label: 'Approved', icon: '✅' },
];

const STEP_ORDER = ['phone', 'documents', 'review', 'approved'];

export default function DealerVerificationProgress({ user }) {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.status !== 'approved') {
      verificationAPI.getStatus().then(setVerification).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const vStatus = verification?.verificationStatus;
  const currentStepIdx = vStatus === 'approved' ? 3 : vStatus === 'under_review' ? 2 : verification?.documents?.length > 0 ? 1 : 0;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(212,196,168,0.04))',
      border: '1px solid rgba(249,115,22,0.2)',
      borderRadius: 12, padding: '16px 20px', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>⏳</span>
        <div>
          <strong style={{ color: '#fff', fontSize: 14 }}>Verification in Progress</strong>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>
            Complete verification to make your listings visible to buyers
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 12 }}>
        {STEPS.map((step, i) => {
          const completed = i < currentStepIdx;
          const active = i === currentStepIdx;
          return (
            <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: completed ? '#22c55e' : active ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${completed ? '#22c55e' : active ? '#f97316' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, marginBottom: 4,
              }}>
                {completed ? '✓' : step.icon}
              </div>
              <span style={{
                fontSize: 9, fontWeight: 600, textAlign: 'center', maxWidth: 80,
                color: completed ? '#22c55e' : active ? '#f97316' : 'rgba(255,255,255,0.35)',
              }}>
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <div style={{
                  position: 'absolute', top: 15, left: 'calc(50% + 16px)',
                  width: 'calc(100% - 32px)', height: 2,
                  background: completed ? '#22c55e' : 'rgba(255,255,255,0.06)',
                }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          {vStatus === 'under_review'
            ? 'Your documents are being reviewed by our team.'
            : verification?.documents?.length > 0
              ? 'Documents received. Waiting for admin review.'
              : 'Submit your documents to start the verification process.'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {(!verification || !verification.documents || verification.documents.length === 0) && (
            <Link to="/dealer/onboarding" style={{
              padding: '7px 16px', borderRadius: 8,
              background: 'var(--gold)', color: '#000',
              fontSize: 11, fontWeight: 700, textDecoration: 'none',
            }}>
              Submit Documents
            </Link>
          )}
          <Link to="/dealer/onboarding" style={{
            padding: '7px 16px', borderRadius: 8,
            background: 'rgba(255,255,255,0.06)', color: '#fff',
            fontSize: 11, fontWeight: 600, textDecoration: 'none',
          }}>
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
