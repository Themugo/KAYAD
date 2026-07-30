import React, { useState } from 'react';
import { Modal, Input, Button } from './ui';
import { UserProfile } from '../types';
import { Building2, ShieldCheck, User, Lock, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [tab, setTab] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('712 345 678');
  const [email, setEmail] = useState('user@kayad.co.ke');
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'dealer' | 'mechanic' | 'admin'>('buyer');

  const demoAccounts: Record<'buyer' | 'dealer' | 'mechanic' | 'admin', UserProfile> = {
    buyer: {
      id: 'usr-buyer-1',
      name: 'David Kamau',
      email: 'd.kamau@gmail.com',
      phone: '+254 712 345 678',
      role: 'buyer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      unreadMessagesCount: 2,
      unreadNotificationsCount: 1
    },
    dealer: {
      id: 'usr-dealer-1',
      name: 'Crown Motors Ltd (John Maina)',
      email: 'j.maina@crownmotors.co.ke',
      phone: '+254 722 999 111',
      role: 'dealer',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200',
      unreadMessagesCount: 5,
      unreadNotificationsCount: 3
    },
    mechanic: {
      id: 'usr-[#1E3063]-1',
      name: 'Eng. Samuel Omondi',
      email: 's.omondi@auto-audit.co.ke',
      phone: '+254 733 444 555',
      role: 'mechanic',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      unreadMessagesCount: 1,
      unreadNotificationsCount: 2
    },
    admin: {
      id: 'usr-admin-1',
      name: 'System Admin (Amina Hassan)',
      email: 'admin@kayad.co.ke',
      phone: '+254 700 000 000',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
      unreadMessagesCount: 4,
      unreadNotificationsCount: 6
    }
  };

  const handleSignIn = () => {
    const account = demoAccounts[selectedRole];
    onLogin(account);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="text-center space-y-1 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#1E3063] text-amber-400 font-extrabold text-xl flex items-center justify-center mx-auto mb-2 shadow-md">
          K
        </div>
        <h3 className="text-xl font-extrabold text-[#1E3063] font-display">Sign In to KAYAD</h3>
        <p className="text-xs text-slate-500">Access Escrow Vault, Saved Vehicles & Role Dashboards</p>
      </div>

      <div className="space-y-4 text-xs">
        {/* Role Selector Tabs */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
            Select Account Role
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setSelectedRole('buyer')}
              className={`p-2 rounded-lg font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all ${
                selectedRole === 'buyer' ? 'bg-[#1E3063] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Buyer
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('dealer')}
              className={`p-2 rounded-lg font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all ${
                selectedRole === 'dealer' ? 'bg-[#1E3063] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Dealer
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('mechanic')}
              className={`p-2 rounded-lg font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all ${
                selectedRole === 'mechanic' ? 'bg-[#1E3063] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Mechanic
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={`p-2 rounded-lg font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all ${
                selectedRole === 'admin' ? 'bg-[#1E3063] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Admin
            </button>
          </div>
        </div>

        {/* Selected Account Info Card */}
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-3">
          <img 
            src={demoAccounts[selectedRole].avatar} 
            alt={demoAccounts[selectedRole].name} 
            className="w-10 h-10 rounded-full object-cover border border-amber-400 shrink-0" 
          />
          <div className="overflow-hidden">
            <p className="font-extrabold text-[#1E3063] text-xs truncate">{demoAccounts[selectedRole].name}</p>
            <p className="text-[11px] text-slate-600 truncate">{demoAccounts[selectedRole].email}</p>
            <span className="text-[9px] font-extrabold text-amber-800 uppercase">
              Role: {selectedRole.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Input Method Switcher */}
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
                className="w-full bg-transparent font-medium text-xs focus:outline-none text-slate-800"
              />
            </div>
          </div>
        ) : (
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.co.ke"
          />
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSignIn}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Sign In as {demoAccounts[selectedRole].name.split(' ')[0]}</span>
        </Button>

        <p className="text-[10px] text-center text-slate-400">
          By signing in, you agree to KAYAD Escrow terms and NTSA buyer protection guidelines.
        </p>
      </div>
    </Modal>
  );
};

export default AuthModal;
