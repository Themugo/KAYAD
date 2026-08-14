import React, { useState } from 'react';
import { Modal, Input, Button } from './ui';
import { Building2, User, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * KAYAD Fusion Phase 3: real backend-authoritative authentication.
 * Previously this modal picked one of 4 hardcoded local demo accounts
 * (buyer/dealer/mechanic/admin) and called onLogin() directly - zero
 * backend involvement, confirmed in this project's own prior audit
 * phases. Every action below now calls the real backend through
 * AuthContext -> services/authApi.ts, which calls the actual endpoints
 * documented in backend/controllers/authController.js. Nothing here
 * decides whether a login succeeds - the backend does, and this modal
 * only reflects what it says (including when it says "failed").
 */

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'login' | 'register';
// Only the 3 roles the backend's own DEMO_ACCOUNTS actually defines
// (backend/controllers/authController.js) - confirmed directly rather
// than preserving the old 4-role UI (buyer/dealer/mechanic/admin) that
// the backend has no equivalent for. See phase-03-auth.md for the full
// account-set mismatch this surfaced and how it's handled.
type DemoRole = 'buyer' | 'dealer' | 'seller';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, demoLogin, isAuthenticating, authError, clearAuthError, isDemoModeEnabled } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [registerRole, setRegisterRole] = useState<'user' | 'dealer' | 'individual_seller'>('user');

  const handleClose = () => {
    clearAuthError();
    onClose();
  };

  const handleLogin = async () => {
    try {
      await login(email, password);
      handleClose();
    } catch {
      // authError is already set by AuthContext; this modal stays open
      // so the user can see the message and retry, rather than closing
      // on failure (which the old demo picker never had a reason to
      // need, since it could never actually fail).
    }
  };

  const handleRegister = async () => {
    try {
      await register({ name, email, password, role: registerRole });
      handleClose();
    } catch {
      // Same reasoning as handleLogin.
    }
  };

  const handleDemoLogin = async (role: DemoRole) => {
    try {
      // Backend DEMO_ACCOUNTS keys are 'buyer', 'dealer', 'seller' -
      // confirmed directly against backend/controllers/authController.js
      // rather than assumed to match this UI's own labels.
      await demoLogin(role);
      handleClose();
    } catch {
      // Same reasoning as handleLogin - most likely failure here is the
      // backend's own real "Demo account not found. Run seed first."
      // message, surfaced via authError below, not synthesized here.
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="md">
      <div className="text-center space-y-1 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#1E3063] text-amber-400 font-extrabold text-xl flex items-center justify-center mx-auto mb-2 shadow-md">
          K
        </div>
        <h3 className="text-xl font-extrabold text-[#1E3063] font-display">
          {mode === 'login' ? 'Sign In to KAYAD' : 'Create Your KAYAD Account'}
        </h3>
        <p className="text-xs text-slate-500">Access Escrow Vault, Saved Vehicles & Role Dashboards</p>
      </div>

      <div className="space-y-4 text-xs">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setMode('login'); clearAuthError(); }}
            className={`flex-1 py-1.5 font-bold rounded-lg transition-all ${
              mode === 'login' ? 'bg-[#1E3063] text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); clearAuthError(); }}
            className={`flex-1 py-1.5 font-bold rounded-lg transition-all ${
              mode === 'register' ? 'bg-[#1E3063] text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            Create Account
          </button>
        </div>

        {authError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-semibold">{authError}</span>
          </div>
        )}

        {mode === 'register' && (
          <>
            <Input
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Wanjiru"
            />
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Account Type
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRegisterRole('user')}
                  className={`p-2 rounded-lg font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all ${
                    registerRole === 'user' ? 'bg-[#1E3063] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" /> Buyer
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterRole('individual_seller')}
                  className={`p-2 rounded-lg font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all ${
                    registerRole === 'individual_seller' ? 'bg-[#1E3063] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" /> Seller
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterRole('dealer')}
                  className={`p-2 rounded-lg font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all ${
                    registerRole === 'dealer' ? 'bg-[#1E3063] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" /> Dealer
                </button>
              </div>
            </div>
          </>
        )}

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.co.ke"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={mode === 'login' ? handleLogin : handleRegister}
          disabled={isAuthenticating || !email || !password || (mode === 'register' && !name)}
        >
          {isAuthenticating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-300" />
          )}
          <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
        </Button>

        {isDemoModeEnabled && mode === 'login' && (
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center">
              Demo Access
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <Button variant="secondary" size="sm" disabled={isAuthenticating} onClick={() => handleDemoLogin('buyer')}>
                Buyer
              </Button>
              <Button variant="secondary" size="sm" disabled={isAuthenticating} onClick={() => handleDemoLogin('seller')}>
                Seller
              </Button>
              <Button variant="secondary" size="sm" disabled={isAuthenticating} onClick={() => handleDemoLogin('dealer')}>
                Dealer
              </Button>
            </div>
          </div>
        )}

        <p className="text-[10px] text-center text-slate-400">
          By signing in, you agree to KAYAD Escrow terms and NTSA buyer protection guidelines.
        </p>
      </div>
    </Modal>
  );
};

export default AuthModal;
