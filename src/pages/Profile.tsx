import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Shield, Bell, Lock, LogOut, Clock, Loader2, ArrowUpRight, CheckCircle2, CircleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ChangePasswordForm from '../components/account/ChangePasswordForm';
import NotificationPreferences from '../components/account/NotificationPreferences';
import { PhoneVerification } from '../components/PhoneVerification';

interface ProfileProps {
  setPage: (page: string) => void;
  authUser?: any;
  /** Optional deep-link target inside the single workspace (scrolls to the matching card). */
  focus?: 'personal' | 'notifications' | 'security';
  /** Hide the local sign-out action when embedded in DashboardHub, which owns the shared account navigation. */
  showSignOut?: boolean;
}

type EditableField = 'name' | 'phone' | 'location';

const card = 'rounded-2xl border border-[#DCE9E7] bg-white shadow-[0_1px_2px_rgba(8,43,64,.04)]';
const sectionLabel = 'text-[10px] font-black uppercase tracking-[.16em] text-[#0D766F]';
const fieldInput = 'min-h-10 w-full max-w-xs rounded-lg border border-[#BDE5DE] bg-white px-3 text-sm text-[#082B40] focus:border-[#11B8A6] focus:outline-none focus:ring-2 focus:ring-[#11B8A6]/25';

/**
 * My Account — ONE workspace rendered inside the unified personal DashboardHub shell.
 * There is no nested navigation panel: personal information, notification preferences and security are
 * stacked cards (deep-linkable by `focus`), and the dashboard sidebar remains the only navigation.
 */
export default function Profile({ setPage, authUser, focus, showSignOut = true }: ProfileProps) {
  const { user: authUser2, logout, updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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

  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [stepUpPassword, setStepUpPassword] = useState('');
  const personalRef = useRef<HTMLElement | null>(null);
  const notificationsRef = useRef<HTMLElement | null>(null);
  const securityRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const target = focus === 'notifications' ? notificationsRef.current : focus === 'security' ? securityRef.current : focus === 'personal' ? personalRef.current : null;
    if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [focus]);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      const result = await logout();
      if (result.ok) navigate('/');
    }
  };

  const handleEdit = (field: EditableField, currentValue: string) => {
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
      const offline = !status && ((typeof navigator !== 'undefined' && navigator.onLine === false) || err?.code === 'ERR_NETWORK' || /network error|failed to fetch/i.test(String(err?.message || '')));
      toast(status === 429 ? 'Too many attempts. Please wait a few minutes and try again.' : status === 401 ? 'Your session has expired. Please sign in again.' : offline ? 'You appear to be offline. Your change was not saved; check your connection and try again.' : ((status === 403 || status === 400) && msg) ? msg : 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const memberYear = user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();

  /** One editable personal-information row (name / phone / location). Behaviour is identical to the previous per-field blocks. */
  const renderEditableRow = (field: EditableField, label: string, Icon: typeof User, value: string, inputType: string, extra?: React.ReactNode) => (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-[#E5EFED] bg-[#F4F9F8] p-4 sm:items-center">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#11B8A6]/10 text-[#176B87]"><Icon size={18} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <label htmlFor={`account-${field}`} className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#475569]">{label}</label>
        {editingField === field ? (
          <div className="flex flex-wrap items-center gap-2">
            <input id={`account-${field}`} type={inputType} value={editValue} onChange={(e) => setEditValue(e.target.value)} className={fieldInput} />
            {field === 'phone' && needsStepUp && (
              <input type="password" autoComplete="current-password" aria-label="Current password" placeholder="Current password" value={stepUpPassword} onChange={(e) => setStepUpPassword(e.target.value)} className={fieldInput} />
            )}
            <button type="button" onClick={handleSaveEdit} disabled={loading} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[#176B87] hover:bg-[#DDF4F0]">
              {loading ? <Loader2 size={14} className="animate-spin" aria-label="Saving" /> : 'Save'}
            </button>
            <button type="button" onClick={handleCancelEdit} disabled={loading} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[#475569] hover:text-[#082B40] disabled:opacity-50">Cancel</button>
          </div>
        ) : (
          <p className="text-sm text-[#082B40]">{value || (field === 'name' ? '' : 'Not set')}</p>
        )}
        {extra}
      </div>
      {!editingField && (
        <button type="button" onClick={() => handleEdit(field, value || '')} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[#176B87] hover:bg-[#DDF4F0]">Edit</button>
      )}
    </div>
  );

  return (
    <div className="w-full min-w-0 space-y-4" data-kayad-personal-account-profile="true" data-kayad-my-account-workspace="true">
      {/* Identity */}
      <section className={`${card} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5`} aria-labelledby="my-account-identity-title" data-kayad-my-account-overview="true">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[#DDF4F0] text-xl font-black text-[#0D766F]">
          {user.avatar ? <img src={user.avatar} alt={user.name || 'Profile'} className="h-full w-full object-cover" /> : (user.name?.charAt(0) || 'U')}
        </div>
        <div className="min-w-0 flex-1">
          <p className={sectionLabel}>Personal account</p>
          <h2 id="my-account-identity-title" className="break-words text-xl font-black text-[#082B40]">{user.name || 'My account'}</h2>
          <p className="mt-0.5 break-all text-sm text-[#475569] sm:break-normal">{user.email || 'Email not available'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold ${user.emailVerified ? 'bg-[#E8F7F3] text-[#0B6B63]' : 'bg-[#F4F9F8] text-[#475569] ring-1 ring-inset ring-[#DCE9E7]'}`}>
              {user.emailVerified ? <CheckCircle2 size={13} aria-hidden="true" /> : <CircleAlert size={13} aria-hidden="true" />}
              {user.emailVerified ? 'Email verified' : 'Email verification pending'}
            </span>
            <span className="inline-flex items-center gap-1 text-[#475569]"><Clock size={13} aria-hidden="true" /> Member since {memberYear}</span>
            <span className="rounded-full bg-[#E8F7F3] px-2.5 py-1 font-bold text-[#0B6B63]">One personal identity</span>
          </div>
        </div>
        {showSignOut && <button type="button" onClick={handleLogout} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#DCE9E7] px-4 text-sm font-semibold text-[#0A3340] hover:bg-[#F4F9F8] sm:w-auto">
          <LogOut size={17} aria-hidden="true" /> Sign Out
        </button>}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          {/* Personal information */}
          <section ref={personalRef} id="account-personal-information" aria-labelledby="account-personal-title" className={`${card} scroll-mt-24 p-4 sm:p-6`} data-kayad-account-section="personal">
            <p className={sectionLabel}>Profile</p>
            <h2 id="account-personal-title" className="mt-1 text-xl font-black text-[#082B40]">Personal Information</h2>
            <p className="mt-1 text-sm text-[#475569]">The details used for buying and privately selling on KAYARD KE.</p>
            <div className="mt-5 space-y-3">
              {renderEditableRow('name', 'Full Name', User, user.name || '', 'text')}
              <div className="flex flex-wrap items-start gap-3 rounded-xl border border-[#E5EFED] bg-[#F4F9F8] p-4 sm:items-center">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#11B8A6]/10 text-[#176B87]"><Mail size={18} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#475569]">Email Address</span>
                  <p className="break-words text-sm text-[#082B40]">{user.email}</p>
                  <p className="mt-1 text-xs text-[#475569]">{user.emailVerified ? 'Verified. ' : ''}Changing your sign-in email is not available yet - contact support if it needs to change.</p>
                </div>
              </div>
              {renderEditableRow('phone', 'Phone Number', Phone, user.phone || '', 'tel')}
              {renderEditableRow('location', 'Location', MapPin, user.location || '', 'text')}
              {/* Refresh the server-owned phone verification state whenever the account phone changes. */}
              <PhoneVerification key={user.phone || 'no-phone'} />
            </div>
          </section>

          {/* Notifications */}
          <section ref={notificationsRef} id="account-notifications" aria-labelledby="account-notifications-title" className={`${card} scroll-mt-24 p-4 sm:p-6`} data-kayad-account-section="notifications">
            <p className={sectionLabel}>Communication</p>
            <h2 id="account-notifications-title" className="mt-1 flex items-center gap-2 text-xl font-black text-[#082B40]"><Bell size={18} aria-hidden="true" className="text-[#176B87]" /> Notification Preferences</h2>
            <div className="mt-5"><NotificationPreferences /></div>
            <button type="button" onClick={() => setPage('notifications')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DCE9E7] px-4 text-sm font-semibold text-[#0A3340] hover:bg-[#F4F9F8]">
              Notification History <ArrowUpRight size={16} aria-hidden="true" className="text-[#0D766F]" />
            </button>
          </section>
        </div>

        {/* Security */}
        <div className="min-w-0 space-y-4">
          <section ref={securityRef} id="account-security" aria-labelledby="account-security-title" className={`${card} scroll-mt-24 p-4 sm:p-6`} data-kayad-account-section="security">
            <p className={sectionLabel}>Protection</p>
            <h2 id="account-security-title" className="mt-1 flex items-center gap-2 text-xl font-black text-[#082B40]"><Lock size={18} aria-hidden="true" className="text-[#176B87]" /> Security</h2>
            <p className="mt-1 text-sm text-[#475569]">Change your password and review sign-in security.</p>
            <div className="mt-5 space-y-4">
              <ChangePasswordForm />
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E5EFED] bg-[#F4F9F8] p-4">
                <div className="flex items-center gap-3">
                  <Shield size={18} aria-hidden="true" className="text-[#176B87]" />
                  <span className="text-sm font-semibold text-[#082B40]">Two-factor authentication</span>
                </div>
                <span className="text-xs text-[#475569]">Not available yet</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
