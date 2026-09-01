import React, { useState } from 'react';
import { Modal, Input, Button } from './ui';
import { UserProfile } from '../types';
import { Building2, ShieldCheck, User, KeyRound, Sparkles } from 'lucide-react';
import {
  login as apiLogin,
  register as apiRegister,
  AuthApiError,
  BackendUser,
} from '../services/authApi';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserProfile) => void;
}

const toUserProfile = (u: BackendUser): UserProfile => ({
  id: u.id || u._id || '',
  name: u.name,
  email: u.email,
  phone: u.phone || '',
  role: (u.role === 'user' ? 'buyer' : u.role) as UserProfile['role'],
  avatar: u.avatar || '',
  isVerified: u.emailVerified,
});

type RegisterRole = 'buyer' | 'seller' | 'dealer';

const REGISTER_ROLES: { key: RegisterRole; backendRole: string; label: string }[] = [
  { key: 'buyer', backendRole: 'user', label: 'Buyer' },
  { key: 'seller', backendRole: 'individual_seller', label: 'Seller' },
  { key: 'dealer', backendRole: 'dealer', label: 'Dealer' },
];


export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerRole, setRegisterRole] = useState<RegisterRole>('buyer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishWith = (user: BackendUser) => {
    onLogin(toUserProfile(user));
    onClose();
  };

  const showError = (err: unknown, fallback: string) => {
    if (err instanceof AuthApiError) setError(err.message);
    else setError(fallback);
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      finishWith(await apiLogin(email.trim(), password));
    } catch (err) {
      showError(err, 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      const backendRole = REGISTER_ROLES.find((r) => r.key === registerRole)!.backendRole;
      finishWith(await apiRegister({ name: name.trim(), email: email.trim(), password, role: backendRole }));
    } catch (err) {
      showError(err, 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="text-center space-y-1 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#1E3063] text-amber-400 font-extrabold text-xl flex items-center justify-center mx-auto mb-2 shadow-md">
          K
        </div>
        <h3 className="text-xl font-extrabold text-[#1E3063] font-display">
          {mode === 'signin' ? 'Sign In to KAYAD' : 'Create Your KAYAD Account'}
        </h3>
        <p className="text-xs text-slate-500">Access Escrow Vault, Saved Vehicles & Role Dashboards</p>
      </div>

      {/* Mode Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
        <button
          type="button"
          onClick={() => { setMode('signin'); setError(null); }}
          className={`flex-1 py-1.5 font-bold rounded-lg transition-all text-xs ${
            mode === 'signin' ? 'bg-[#1E3063] text-white shadow-sm' : 'text-slate-600'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setError(null); }}
          className={`flex-1 py-1.5 font-bold rounded-lg transition-all text-xs ${
            mode === 'register' ? 'bg-[#1E3063] text-white shadow-sm' : 'text-slate-600'
          }`}
        >
          Create Account
        </button>
      </div>

      <div className="space-y-4 text-xs">
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
                I am a...
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                {REGISTER_ROLES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRegisterRole(r.key)}
                    className={`p-2 rounded-lg font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all ${
                      registerRole === r.key ? 'bg-[#1E3063] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r.key === 'buyer' && <User className="w-3.5 h-3.5" />}
                    {r.key === 'seller' && <KeyRound className="w-3.5 h-3.5" />}
                    {r.key === 'dealer' && <Building2 className="w-3.5 h-3.5" />}
                    {r.label}
                  </button>
                ))}
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

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] font-bold">
            {error}
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={loading}
          onClick={mode === 'signin' ? handleSignIn : handleRegister}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
        </Button>

      </div>
    </Modal>
  );
};

export default AuthModal;
