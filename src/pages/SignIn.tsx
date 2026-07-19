import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, Building2, Shield, ArrowRight } from 'lucide-react';

type Role = 'private-seller' | 'dealer' | 'admin';

interface AuthUser {
  name: string;
  email: string;
  role: Role;
  dealership?: string;
}

interface SignInProps {
  setPage: (page: string) => void;
  onLogin: (user: AuthUser) => void;
}

const ROLES: { key: Role; label: string; icon: typeof User; desc: string }[] = [
  { key: 'private-seller', label: 'Private Seller', icon: User,     desc: 'Individual selling a vehicle' },
  { key: 'dealer',         label: 'Dealer',         icon: Building2, desc: 'Licensed dealership account' },
  { key: 'admin',          label: 'Admin',          icon: Shield,    desc: 'KAYAD platform management' },
];

const MOCK_USERS: Record<Role, Omit<AuthUser, 'email'>> = {
  'private-seller': { name: 'John Kamau',   role: 'private-seller' },
  dealer:           { name: 'Sarah Mwangi', role: 'dealer', dealership: 'Prestige Motors Kenya' },
  admin:            { name: 'Admin User',   role: 'admin' },
};

export default function SignIn({ setPage, onLogin }: SignInProps) {
  const [role,     setRole]     = useState<Role>('private-seller');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    if (password.length < 4)  { setError('Password must be at least 4 characters.'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      onLogin({ ...MOCK_USERS[role], email });
      setPage('dashboard');
    }, 900);
  };

  return (
    <div className="min-h-screen bg-cream-50 pt-16 flex flex-col">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div className="relative bg-charcoal-900 pt-14 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-3/4 bg-gold-400/8 blur-3xl rounded-full" />
        </div>
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label text-gold-400 mb-4">WELCOME BACK</p>
          <h1 className="font-serif text-4xl md:text-5xl text-white font-bold mb-3">Sign In to KAYAD</h1>
          <p className="font-sans text-white/45 text-sm">
            Access your dashboard, manage listings, and track transactions.
          </p>
        </div>
      </div>

      {/* ── SIGN-IN CARD ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-md">

          {/* Role tabs */}
          <div className="bg-charcoal-900 rounded-2xl p-1.5 flex gap-1 mb-6">
            {ROLES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setRole(key); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-sans text-xs font-semibold transition-all duration-200 ${
                  role === key
                    ? 'bg-gold-600 text-white shadow-sm'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>

          {/* Role description */}
          <p className="font-sans text-xs text-warm-400 text-center mb-6">
            {ROLES.find(r => r.key === role)?.desc}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-cream-200 p-8 shadow-sm space-y-5">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 font-sans text-xs rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}

            <div>
              <label className="block font-sans text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={role === 'admin' ? 'admin@kayad.co.ke' : 'your@email.com'}
                  className="w-full pl-9 pr-4 py-3 border border-cream-300 rounded-xl font-sans text-sm text-charcoal-800 placeholder-warm-300 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-sans text-xs font-semibold text-warm-500 uppercase tracking-wide">Password</label>
                <button type="button" className="font-sans text-xs text-gold-700 hover:text-gold-600 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-10 py-3 border border-cream-300 rounded-xl font-sans text-sm text-charcoal-800 placeholder-warm-300 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gold-600 hover:bg-gold-700 disabled:bg-gold-600/50 text-white font-sans font-bold py-3.5 rounded-full transition-all text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing In…
                </span>
              ) : (
                <>Sign In <ArrowRight size={15} /></>
              )}
            </button>

            {role !== 'admin' && (
              <p className="font-sans text-xs text-warm-400 text-center pt-1">
                New to KAYAD?{' '}
                <button
                  type="button"
                  onClick={() => setPage('create-account')}
                  className="text-gold-700 font-semibold hover:text-gold-600 transition-colors"
                >
                  Create an account
                </button>
              </p>
            )}
          </form>

          {/* Security note */}
          <div className="mt-5 flex items-center justify-center gap-4 text-warm-400">
            <span className="flex items-center gap-1.5 font-sans text-xs"><Lock size={11} className="text-gold-500" /> 256-bit SSL</span>
            <span className="flex items-center gap-1.5 font-sans text-xs"><Shield size={11} className="text-gold-500" /> KAYAD Secured</span>
          </div>
        </div>
      </div>
    </div>
  );
}
