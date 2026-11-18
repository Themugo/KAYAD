import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Shield, Bell, Lock, LogOut, Clock, Loader2, LayoutDashboard, ArrowUpRight, CheckCircle2, CircleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ChangePasswordForm from '../components/account/ChangePasswordForm';
import NotificationPreferences from '../components/account/NotificationPreferences';
import { PhoneVerification } from '../components/PhoneVerification';

interface ProfileProps {
  setPage: (page: string) => void;
  authUser?: any;
}

export default function Profile({ setPage, authUser }: ProfileProps) {
  const { user: authUser2, logout, updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  // Use auth context user or prop
  const user = authUser2 || authUser || {
    name: 'Guest User',
    email: '',
    phone: '',
    location: '',
    createdAt: new Date().toISOString(),
    avatar: null,
  };

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [stepUpPassword, setStepUpPassword] = useState('');

  const menuItems = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'info', label: 'Personal Information', icon: User },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security', icon: Lock },
  ];

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      const result = await logout();
      if (result.ok) navigate('/');
    }
  };

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || '');
    setStepUpPassword('');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    setStepUpPassword('');
  };

  const needsStepUp = editingField === 'phone' && (user.role === 'user' || user.role === 'dealer' || user.role === 'individual_seller') && editValue.trim() !== (user.phone || '');
  const handleSaveEdit = async () => {
    if (!editingField) return;
    if (loading) return;
    if (editingField === 'name' && (editValue.trim().length < 1 || editValue.trim().length > 100)) { toast('Name must be 1-100 characters', 'error'); return; }
    if (needsStepUp && !stepUpPassword) { toast('Enter your current password to change your phone number', 'error'); return; }
    setLoading(true);
    try {
      await updateProfile({ [editingField]: editValue, ...(needsStepUp ? { currentPassword: stepUpPassword } : {}) });
      setStepUpPassword('');
      toast('Profile updated successfully', 'success');
      setEditingField(null);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      toast(status === 429 ? 'Too many attempts. Please wait a few minutes and try again.' : ((status === 403 || status === 400) && msg) ? msg : 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const memberYear = user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();

  return (
    <div className="w-full min-w-0 space-y-4" data-kayad-personal-account-profile="true">
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#D7E7E4] bg-white p-4 shadow-sm sm:p-5">
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#DDF4F0] text-xl font-black text-[#0D766F]">
          {user.avatar ? <img src={user.avatar} alt={user.name || 'Profile'} className="h-full w-full object-cover" /> : (user.name?.charAt(0) || 'U')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#0D766F]">Personal account</p>
          <h2 className="truncate text-lg font-black text-[#0A3340]">{user.name || 'My account'}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-[#64748B]"><Clock size={12}/> Member since {memberYear}</p>
        </div>
        <span className="rounded-full bg-[#E8F7F3] px-3 py-1.5 text-[11px] font-bold text-[#0D766F]">One personal identity</span>
      </section>
      {/* Content */}
      <div className="w-full min-w-0">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[210px_minmax(0,1fr)]">
          {/* Sidebar */}
          <div className="min-w-0">
            <div className="bg-white rounded-2xl border border-[#D7E7E4] p-2 sm:p-3 md:sticky md:top-24">
              <nav aria-label="My Account sections" className="grid grid-cols-2 gap-1">
                {menuItems.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    aria-current={activeTab === key ? 'page' : undefined}
                    className={`min-h-11 w-full flex items-center gap-2 px-3 py-3 rounded-xl text-left transition-colors ${
                      activeTab === key
                        ? 'bg-[#DDF4F0] text-[#0A3340] ring-1 ring-inset ring-[#9AD8CD]'
                        : 'text-[#0A3340] hover:bg-[#F6FAF9]'
                    }`}
                  >
                    <Icon size={17} />
                    <span className="font-sans text-xs sm:text-sm font-semibold">{label}</span>
                  </button>
                ))}
              </nav>
              <div className="mt-4 pt-4 border-t border-[#D7E7E4]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-700 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="font-sans text-sm font-semibold">Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="min-w-0">
            {activeTab === 'overview' && (
              <section className="space-y-4" aria-labelledby="my-account-overview-title" data-kayad-my-account-overview="true">
                <div className="rounded-2xl border border-[#D7E7E4] bg-white p-5 sm:p-6">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#0D766F]">Your account at a glance</p>
                  <h2 id="my-account-overview-title" className="mt-1 text-xl font-black text-[#0A3340]">My Account Overview</h2>
                  <p className="mt-1 text-sm leading-6 text-[#64748B]">Manage the personal details and settings used for buying and privately selling on KAYARD KE.</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-4">
                      <div className="flex items-center gap-2 text-[#12576D]"><User size={17}/><span className="text-xs font-bold uppercase tracking-wide">Personal identity</span></div>
                      <p className="mt-2 truncate text-base font-black text-[#0A3340]">{user.name || 'Name not set'}</p>
                      <p className="mt-1 truncate text-xs text-[#64748B]">{user.email || 'Email not available'}</p>
                    </div>
                    <div className="rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-4">
                      <div className="flex items-center gap-2 text-[#12576D]"><Shield size={17}/><span className="text-xs font-bold uppercase tracking-wide">Account status</span></div>
                      <p className="mt-2 flex items-center gap-2 text-sm font-bold text-[#0A3340]">
                        {user.emailVerified ? <CheckCircle2 size={17} className="text-[#0D9488}"/> : <CircleAlert size={17} className="text-[#B7791F}"/>}
                        {user.emailVerified ? 'Email verified' : 'Email verification pending'}
                      </p>
                      <p className="mt-1 text-xs text-[#64748B]">Member since {memberYear}</p>
                    </div>
                    <div className="rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-4">
                      <div className="flex items-center gap-2 text-[#12576D]"><Phone size={17}/><span className="text-xs font-bold uppercase tracking-wide">Contact details</span></div>
                      <p className="mt-2 text-sm font-bold text-[#0A3340]">{user.phone || 'Phone number not added'}</p>
                      <p className="mt-1 text-xs text-[#64748B]">{user.location || 'Location not added'}</p>
                    </div>
                    <div className="rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-4">
                      <div className="flex items-center gap-2 text-[#12576D]"><Lock size={17}/><span className="text-xs font-bold uppercase tracking-wide">Account security</span></div>
                      <p className="mt-2 text-sm font-bold text-[#0A3340]">Password & sign-in</p>
                      <p className="mt-1 text-xs text-[#64748B]">Review the security controls currently available to your account.</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setActiveTab('info')} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-[#D7E7E4] bg-white p-4 text-left hover:border-[#8ECFC4]">
                    <span><span className="block text-sm font-bold text-[#0A3340]">Personal Information</span><span className="mt-1 block text-xs text-[#64748B]">Update your name, phone and location</span></span><ArrowUpRight size={18} className="shrink-0 text-[#0D766F]"/>
                  </button>
                  <button type="button" onClick={() => setActiveTab('notifications')} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-[#D7E7E4] bg-white p-4 text-left hover:border-[#8ECFC4]">
                    <span><span className="block text-sm font-bold text-[#0A3340]">Notification Preferences</span><span className="mt-1 block text-xs text-[#64748B]">Choose your communication channels</span></span><ArrowUpRight size={18} className="shrink-0 text-[#0D766F]"/>
                  </button>
                  <button type="button" onClick={() => setActiveTab('security')} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-[#D7E7E4] bg-white p-4 text-left hover:border-[#8ECFC4]">
                    <span><span className="block text-sm font-bold text-[#0A3340]">Security</span><span className="mt-1 block text-xs text-[#64748B]">Change your password and review sign-in security</span></span><ArrowUpRight size={18} className="shrink-0 text-[#0D766F]"/>
                  </button>
                  <button type="button" onClick={() => setPage('notifications')} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-[#D7E7E4] bg-white p-4 text-left hover:border-[#8ECFC4]">
                    <span><span className="block text-sm font-bold text-[#0A3340]">Notification History</span><span className="mt-1 block text-xs text-[#64748B]">View account and transaction alerts</span></span><ArrowUpRight size={18} className="shrink-0 text-[#0D766F]"/>
                  </button>
                </div>
              </section>
            )}
            {activeTab === 'info' && (
              <div className="bg-white rounded-2xl border border-[#D7E7E4] p-4 sm:p-6">
                <h2 className="font-serif text-xl text-[#0A3340] font-bold mb-6">Personal Information</h2>

                <div className="space-y-6">
                  <div className="flex flex-wrap items-start sm:items-center gap-3 sm:gap-4 p-4 bg-[#F6FAF9] rounded-xl">
                    <div className="w-10 h-10 bg-[#13B8A6]/10 rounded-lg flex items-center justify-center">
                      <User size={18} className="text-[#176B87]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="block font-sans text-xs text-warm-400 font-semibold uppercase tracking-wider mb-1">
                        Full Name
                      </label>
                      {editingField === 'name' ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="font-sans text-sm text-[#0A3340] border border-[#BDE5DE] rounded px-2 py-1"
                          />
                          <button onClick={handleSaveEdit} disabled={loading} className="text-[#176B87] text-sm font-semibold">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                          </button>
                          <button type="button" onClick={handleCancelEdit} disabled={loading} className="text-[#64748B] text-sm font-semibold hover:text-[#0A3340] disabled:opacity-50">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <p className="font-sans text-sm text-[#0A3340]">{user.name}</p>
                      )}
                    </div>
                    {!editingField && (
                      <button onClick={() => handleEdit('name', user.name || '')} className="text-[#176B87] text-sm font-semibold hover:text-[#12576D]">Edit</button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-start sm:items-center gap-3 sm:gap-4 p-4 bg-[#F6FAF9] rounded-xl">
                    <div className="w-10 h-10 bg-[#13B8A6]/10 rounded-lg flex items-center justify-center">
                      <Mail size={18} className="text-[#176B87]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="block font-sans text-xs text-warm-400 font-semibold uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <p className="font-sans text-sm text-[#0A3340]">{user.email}</p>
                      <p className="font-sans text-xs text-warm-400 mt-1">{user.emailVerified ? 'Verified. ' : ''}Changing your sign-in email is not available yet - contact support if it needs to change.</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-start sm:items-center gap-3 sm:gap-4 p-4 bg-[#F6FAF9] rounded-xl">
                    <div className="w-10 h-10 bg-[#13B8A6]/10 rounded-lg flex items-center justify-center">
                      <Phone size={18} className="text-[#176B87]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="block font-sans text-xs text-warm-400 font-semibold uppercase tracking-wider mb-1">
                        Phone Number
                      </label>
                      {editingField === 'phone' ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="tel"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="font-sans text-sm text-[#0A3340] border border-[#BDE5DE] rounded px-2 py-1"
                          />
                          {needsStepUp && (
                            <input type="password" autoComplete="current-password" aria-label="Current password" placeholder="Current password" value={stepUpPassword} onChange={(e) => setStepUpPassword(e.target.value)} className="font-sans text-sm text-[#0A3340] border border-[#BDE5DE] rounded px-2 py-1" />
                          )}
                          <button onClick={handleSaveEdit} disabled={loading} className="text-[#176B87] text-sm font-semibold">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                          </button>
                          <button type="button" onClick={handleCancelEdit} disabled={loading} className="text-[#64748B] text-sm font-semibold hover:text-[#0A3340] disabled:opacity-50">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <p className="font-sans text-sm text-[#0A3340]">{user.phone || 'Not set'}</p>
                      )}
                    </div>
                    {!editingField && (
                      <button onClick={() => handleEdit('phone', user.phone || '')} className="text-[#176B87] text-sm font-semibold hover:text-[#12576D]">Edit</button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-start sm:items-center gap-3 sm:gap-4 p-4 bg-[#F6FAF9] rounded-xl">
                    <div className="w-10 h-10 bg-[#13B8A6]/10 rounded-lg flex items-center justify-center">
                      <MapPin size={18} className="text-[#176B87]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="block font-sans text-xs text-warm-400 font-semibold uppercase tracking-wider mb-1">
                        Location
                      </label>
                      {editingField === 'location' ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="font-sans text-sm text-[#0A3340] border border-[#BDE5DE] rounded px-2 py-1"
                          />
                          <button onClick={handleSaveEdit} disabled={loading} className="text-[#176B87] text-sm font-semibold">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                          </button>
                          <button type="button" onClick={handleCancelEdit} disabled={loading} className="text-[#64748B] text-sm font-semibold hover:text-[#0A3340] disabled:opacity-50">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <p className="font-sans text-sm text-[#0A3340]">{user.location || 'Not set'}</p>
                      )}
                    </div>
                    {!editingField && (
                      <button onClick={() => handleEdit('location', user.location || '')} className="text-[#176B87] text-sm font-semibold hover:text-[#12576D]">Edit</button>
                    )}
                  </div>
                  {/* Refresh the server-owned phone verification state whenever the account phone changes. */}
                  <PhoneVerification key={user.phone || 'no-phone'} />
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl border border-[#D7E7E4] p-4 sm:p-6">
                <h2 className="font-serif text-xl text-[#0A3340] font-bold mb-6">Notification Preferences</h2>
                <NotificationPreferences />
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl border border-[#D7E7E4] p-4 sm:p-6">
                <h2 className="font-serif text-xl text-[#0A3340] font-bold mb-6">Security</h2>

                <div className="space-y-4">
                  <ChangePasswordForm />
                  <div className="flex items-center justify-between p-4 bg-[#F6FAF9] rounded-xl">
                    <div className="flex items-center gap-3">
                      <Shield size={18} className="text-[#176B87]" />
                      <span className="font-sans text-sm font-semibold text-[#0A3340]">Two-factor authentication</span>
                    </div>
                    <span className="text-xs text-warm-400">Not available yet</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
