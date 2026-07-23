import React, { useState, useEffect } from 'react';
import { biddingSecurityAPI, formatKES } from '../../../api/api.exports';

interface BiddingSecurityGatewayProps {
  isOpen: boolean;
  onClose: () => void;
  carId?: string;
  bidAmount?: number;
  onAuthorized?: () => void;
}

export const BiddingSecurityGateway: React.FC<BiddingSecurityGatewayProps> = ({
  isOpen,
  onClose,
  carId,
  bidAmount,
  onAuthorized,
}) => {
  const [step, setStep] = useState<'status' | 'deposit' | 'biometric' | 'success'>('status');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bidderStatus, setBidderStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkBidderStatus();
    }
  }, [isOpen]);

  const checkBidderStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await biddingSecurityAPI.getStatus();
      setBidderStatus(status);
      
      if (carId && bidAmount) {
        const auth = await biddingSecurityAPI.checkAuthorization(carId, bidAmount);
        if (auth.authorized) {
          setStep('success');
          onAuthorized?.();
        } else if (!status.verified) {
          setStep('deposit');
        } else if (!status.biometricVerified) {
          setStep('biometric');
        }
      } else if (status.verified) {
        setStep('success');
      } else {
        setStep('deposit');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check bidder status');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (tier: 'basic' | 'premium') => {
    setSaving(true);
    setError(null);
    try {
      const amount = tier === 'premium' ? 50000 : 10000;
      await biddingSecurityAPI.createDeposit({
        amount,
        tier,
        paymentMethod: 'mpesa',
      });
      // In production, this would redirect to payment
      setStep('status');
      checkBidderStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to create deposit');
    } finally {
      setSaving(false);
    }
  };

  const handleBiometricVerify = async () => {
    setSaving(true);
    setError(null);
    try {
      // Simulated biometric verification
      await biddingSecurityAPI.verifyBiometric({
        biometricToken: 'demo-token',
        verificationCode: '1234',
      });
      setStep('success');
      checkBidderStatus();
    } catch (err: any) {
      setError(err.message || 'Biometric verification failed');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white dark:bg-charcoal-800 rounded-2xl shadow-xl p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-600 dark:hover:text-cream-200"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-charcoal-800 dark:text-cream-100">
                  Bidding Security
                </h2>
                <p className="mt-2 text-sm text-charcoal-500 dark:text-cream-300">
                  Complete verification to start bidding
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Status Card */}
              <div className="bg-cream-50 dark:bg-charcoal-700 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-charcoal-500 dark:text-cream-300">Verification Status</p>
                    <p className={`font-semibold ${bidderStatus?.verified ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {bidderStatus?.verified ? 'Verified' : 'Not Verified'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-charcoal-500 dark:text-cream-300">KYC Level</p>
                    <p className="font-semibold text-charcoal-700 dark:text-cream-100">
                      Level {bidderStatus?.kycLevel || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Steps */}
              {step === 'status' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bidderStatus?.verified ? 'bg-emerald-100 text-emerald-600' : 'bg-cream-200'}`}>
                      {bidderStatus?.verified ? '✓' : '1'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-charcoal-700 dark:text-cream-100">Deposit Verification</p>
                      <p className="text-sm text-charcoal-500 dark:text-cream-300">
                        {bidderStatus?.verified ? 'Completed' : 'Required'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bidderStatus?.biometricVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-cream-200'}`}>
                      {bidderStatus?.biometricVerified ? '✓' : '2'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-charcoal-700 dark:text-cream-100">Biometric Verification</p>
                      <p className="text-sm text-charcoal-500 dark:text-cream-300">
                        {bidderStatus?.biometricVerified ? 'Completed' : 'Optional'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {step === 'deposit' && (
                <div className="space-y-4">
                  <p className="text-center text-charcoal-600 dark:text-cream-200 mb-4">
                    Choose a deposit tier to start bidding
                  </p>
                  <button
                    onClick={() => handleDeposit('basic')}
                    disabled={saving}
                    className="w-full p-4 rounded-xl border-2 border-cream-200 dark:border-charcoal-600 hover:border-brand-500 transition-colors text-left"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-charcoal-700 dark:text-cream-100">Basic Tier</p>
                        <p className="text-sm text-charcoal-500">Up to {formatKES(500000)} bid limit</p>
                      </div>
                      <p className="text-lg font-bold text-brand-500">{formatKES(10000)}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeposit('premium')}
                    disabled={saving}
                    className="w-full p-4 rounded-xl border-2 border-brand-500 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 transition-colors text-left"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-brand-600">Premium Tier</p>
                        <p className="text-sm text-charcoal-500">Up to {formatKES(2000000)} bid limit</p>
                      </div>
                      <p className="text-lg font-bold text-brand-500">{formatKES(50000)}</p>
                    </div>
                  </button>
                </div>
              )}

              {step === 'biometric' && (
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-cream-100 dark:bg-charcoal-700 flex items-center justify-center">
                    <svg className="w-12 h-12 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                  </div>
                  <p className="text-charcoal-600 dark:text-cream-200 mb-6">
                    Verify your identity with biometric authentication
                  </p>
                  <button
                    onClick={handleBiometricVerify}
                    disabled={saving}
                    className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Verifying...' : 'Verify with Biometrics'}
                  </button>
                </div>
              )}

              {step === 'success' && (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-charcoal-700 dark:text-cream-100 mb-2">
                    You're all set!
                  </p>
                  <p className="text-charcoal-500 dark:text-cream-300 mb-6">
                    You can now place bids on any vehicle
                  </p>
                  <button
                    onClick={onAuthorized}
                    className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors"
                  >
                    Start Bidding
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BiddingSecurityGateway;
