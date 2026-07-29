import React, { useState } from 'react';
import { Modal, Input, Button } from './ui';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [signedIn, setSignedIn] = useState(false);

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="text-center space-y-1 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#1E3063] text-amber-400 font-extrabold text-xl flex items-center justify-center mx-auto mb-2">
          K
        </div>
        <h3 className="text-xl font-extrabold text-[#1E3063] font-display">Sign In to KAYAD</h3>
        <p className="text-xs text-slate-500">Access Escrow Vault, Saved Vehicles & Instant Price Drop Alerts</p>
      </div>

      {signedIn ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3 text-xs text-emerald-900">
          <p className="font-bold text-sm">Successfully Signed In!</p>
          <p>Welcome back to East Africa's trusted marketplace.</p>
          <Button variant="primary" size="md" fullWidth onClick={onClose}>
            Continue Browsing
          </Button>
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTab('phone')}
              className={`flex-1 py-1.5 font-bold rounded-lg transition-all ${
                tab === 'phone' ? 'bg-[#1E3063] text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              M-Pesa / Phone Number
            </button>
            <button
              onClick={() => setTab('email')}
              className={`flex-1 py-1.5 font-bold rounded-lg transition-all ${
                tab === 'email' ? 'bg-[#1E3063] text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              Email Address
            </button>
          </div>

          {tab === 'phone' ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Safaricom / Airtel Phone Number
              </label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden px-3.5 py-2.5">
                <span className="font-bold text-slate-500 mr-2 text-xs">+254</span>
                <input
                  type="tel"
                  placeholder="712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent font-medium text-xs focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.co.ke"
            />
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => setSignedIn(true)}
          >
            Get Verification Code
          </Button>

          <p className="text-[10px] text-center text-slate-400">
            By signing in, you agree to KAYAD Escrow terms and NTSA buyer protection guidelines.
          </p>
        </div>
      )}
    </Modal>
  );
};

export default AuthModal;
