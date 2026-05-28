import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, dealerAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { formatPhone, displayPhone } from '../../utils/helpers';
import { User, Building2, CreditCard, Shield, Eye, EyeOff, Save, Camera } from 'lucide-react';

const TABS = [
  { id: 'profile',   label: 'Profile',    icon: User },
  { id: 'business',  label: 'Business',   icon: Building2 },
  { id: 'payments',  label: 'Payments',   icon: CreditCard },
  { id: 'privacy',   label: 'Privacy',    icon: Eye },
  { id: 'security',  label: 'Security',   icon: Shield },
];

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', rows }) {
  const [focused, setFocused] = useState(false);
  const style = {
    width: '100%', padding: '11px 14px', borderRadius: 10, boxSizing: 'border-box',
    border: `1px solid ${focused ? 'rgba(212,196,168,0.4)' : 'rgba(255,255,255,0.08)'}`,
    background: focused ? 'rgba(212,196,168,0.03)' : 'rgba(255,255,255,0.04)',
    color: '#fff', fontSize: 13, outline: 'none', transition: 'all 0.2s',
    resize: rows ? 'vertical' : undefined,
  };
  if (rows) return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={style} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />;
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={style} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />;
}

function Toggle({ checked, onChange, label, desc }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{desc}</div>}
      </div>
      <button onClick={() => onChange(!checked)} style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--gold)' : 'rgba(255,255,255,0.1)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', top: 3, left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%',
          background: checked ? '#000' : 'rgba(255,255,255,0.5)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

export default function DealerSettings() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});

  const [profile, setProfile] = useState({ name: '', phone: '', location: '', bio: '', avatar: '' });
  const [business, setBusiness] = useState({ businessName: '', mpesaBusiness: '', mpesaBusinessName: '', bankName: '', bankAccount: '', bankBranch: '' });
  const [privacy, setPrivacy] = useState({ showPhone: true, showEmail: true, showLocation: true, chatEnabled: true, autoApproveReviews: false });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => {
    if (!user) return;
    setProfile({ name: user.name||'', phone: user.phone||'', location: user.location||'', bio: user.bio||'', avatar: user.avatar||'' });
    setBusiness({ businessName: user.businessName||'', mpesaBusiness: user.mpesaBusiness||'', mpesaBusinessName: user.mpesaBusinessName||'', bankName: user.bankName||'', bankAccount: user.bankAccount||'', bankBranch: user.bankBranch||'' });
    setPrivacy(user.visibility || { showPhone:true, showEmail:true, showLocation:true, chatEnabled:true, autoApproveReviews:false });
  }, [user]);

  const validate = () => {
    const errs = {};
    if (!profile.name.trim()) errs.name = 'Full name is required';
    if (profile.phone) {
      const formatted = formatPhone(profile.phone);
      if (formatted.length !== 12) errs.phone = 'Enter a valid Kenyan phone number (e.g. 0712 345 678)';
    }
    if (tab === 'business' && !business.businessName.trim()) errs.businessName = 'Business name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Please select an image file', 'error'); return; }
    if (file.size > 2 * 1024 * 1024) { toast('Image must be under 2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setProfile(p => ({ ...p, avatar: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...profile,
        phone: profile.phone ? formatPhone(profile.phone) : '',
        ...business,
        visibility: privacy,
      };
      const { user: updated } = await authAPI.updateProfile(payload);
      if (setUser && updated) {
        setUser(updated);
        setPrivacy(updated.visibility || { showPhone:true, showEmail:true, showLocation:true, chatEnabled:true, autoApproveReviews:false });
      }
      toast('Settings saved ✓', 'success');
    } catch (e) {
      toast(e?.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (passwords.next !== passwords.confirm) { toast('Passwords do not match', 'error'); return; }
    if (passwords.next.length < 8) { toast('Min 8 characters required', 'error'); return; }
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: passwords.current, newPassword: passwords.next });
      setPasswords({ current: '', next: '', confirm: '' });
      toast('Password updated ✓', 'success');
    } catch (e) {
      toast(e?.response?.data?.message || 'Password change failed', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '36px 0 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 6 }}>Dealer Hub</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.6rem,3vw,2.2rem)', color: '#fff', margin: 0 }}>
              Account <span style={{ color: 'var(--gold)' }}>Settings</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '11px 16px',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
                fontWeight: tab === id ? 700 : 500,
                color: tab === id ? '#fff' : 'rgba(255,255,255,0.4)',
                borderBottom: `2px solid ${tab === id ? 'var(--gold)' : 'transparent'}`,
                transition: 'all 0.2s',
              }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 32px' }}>
        <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '32px', marginBottom: 20 }}>

          {/* ── PROFILE ── */}
          {tab === 'profile' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, paddingBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ position: 'relative' }}>
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), var(--gold-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#000', fontFamily: 'var(--font-display)' }}>
                      {(profile.name||'D')[0].toUpperCase()}
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                  <button onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: '#111', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </button>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{profile.name || user?.email}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{user?.email}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)', borderRadius: 9999, padding: '3px 10px', fontSize: 10, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {user?.role} · {user?.approved ? '✓ Approved' : '⏳ Pending'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                <div style={{ paddingRight: 24 }}>
                  <Field label="Full Name">{errors.name && <div style={{ color: '#ef4444', fontSize: 11, marginBottom: 4 }}>{errors.name}</div>}<Input value={profile.name} onChange={e => { setErrors(p=>({...p,name:''})); setProfile(p => ({...p, name: e.target.value})); }} placeholder="Your full name" /></Field>
                  <Field label="Phone Number" hint={`Used for M-Pesa and buyer contact${profile.phone && formatPhone(profile.phone).length === 12 ? ' — formatted: ' + displayPhone(profile.phone) : ''}`}>
                    {errors.phone && <div style={{ color: '#ef4444', fontSize: 11, marginBottom: 4 }}>{errors.phone}</div>}
                    <Input value={profile.phone} onChange={e => { setErrors(p=>({...p,phone:''})); setProfile(p => ({...p, phone: e.target.value})); }} placeholder="+254 7XX XXX XXX" />
                  </Field>
                </div>
                <div style={{ paddingLeft: 24, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                  <Field label="Location"><Input value={profile.location} onChange={e => setProfile(p => ({...p, location: e.target.value}))} placeholder="City, Kenya" /></Field>
                  <Field label="Bio / About" hint="Shown on your dealer profile"><Input value={profile.bio} onChange={e => setProfile(p => ({...p, bio: e.target.value}))} placeholder="Tell buyers about your dealership…" rows={3} /></Field>
                </div>
              </div>
            </div>
          )}

          {/* ── BUSINESS ── */}
          {tab === 'business' && (
            <div>
              <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Business Details</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Your dealership identity and registration info</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                <div style={{ paddingRight: 24 }}>
                  <Field label="Business Name">{errors.businessName && <div style={{ color: '#ef4444', fontSize: 11, marginBottom: 4 }}>{errors.businessName}</div>}<Input value={business.businessName} onChange={e => { setErrors(p=>({...p,businessName:''})); setBusiness(p => ({...p, businessName: e.target.value})); }} placeholder="Dealer Name Ltd." /></Field>
                  <Field label="M-Pesa Paybill / Till"><Input value={business.mpesaBusiness} onChange={e => setBusiness(p => ({...p, mpesaBusiness: e.target.value}))} placeholder="Paybill or Till No." /></Field>
                  <Field label="M-Pesa Business Name"><Input value={business.mpesaBusinessName} onChange={e => setBusiness(p => ({...p, mpesaBusinessName: e.target.value}))} placeholder="Name as on M-Pesa" /></Field>
                </div>
                <div style={{ paddingLeft: 24, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                  <Field label="Bank Name"><Input value={business.bankName} onChange={e => setBusiness(p => ({...p, bankName: e.target.value}))} placeholder="e.g. Equity Bank" /></Field>
                  <Field label="Bank Account Number"><Input value={business.bankAccount} onChange={e => setBusiness(p => ({...p, bankAccount: e.target.value}))} placeholder="Account number" /></Field>
                  <Field label="Branch"><Input value={business.bankBranch} onChange={e => setBusiness(p => ({...p, bankBranch: e.target.value}))} placeholder="Branch name" /></Field>
                </div>
              </div>
            </div>
          )}

          {/* ── PAYMENTS ── */}
          {tab === 'payments' && (
            <div>
              <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Payment & Commission</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Your platform commission rate and payment methods</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 16, marginBottom: 28 }}>
                {[
                  { label: 'Commission Rate',    value: `${user?.commission ?? 5}%`,     color: '#ef4444' },
                  { label: 'Waiver',             value: `${user?.waiver || 0}%`,          color: '#22c55e' },
                  { label: 'Balance',            value: `KES ${Number(user?.commissionBalance||0).toLocaleString()}`, color: 'var(--gold)' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 20px' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{item.label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.5rem', color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '20px', fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
                🏪 <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Dealers do not pay per listing.</strong> Your listing allowance is set by your active package plan. Contact <a href="mailto:plans@kayad.space" style={{ color: 'var(--gold)', textDecoration: 'none' }}>plans@kayad.space</a> to upgrade your plan or request a custom enterprise arrangement.
              </div>
            </div>
          )}

          {/* ── PRIVACY ── */}
          {tab === 'privacy' && (
            <div>
              <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Visibility & Privacy</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Control what buyers can see on your profile</div>
              </div>
              <Toggle checked={privacy.showPhone}           onChange={v => setPrivacy(p=>({...p,showPhone:v}))}           label="Show Phone Number"       desc="Buyers can see your contact number" />
              <Toggle checked={privacy.showEmail}           onChange={v => setPrivacy(p=>({...p,showEmail:v}))}           label="Show Email Address"      desc="Buyers can see your email" />
              <Toggle checked={privacy.showLocation}        onChange={v => setPrivacy(p=>({...p,showLocation:v}))}        label="Show Location"           desc="Display your city on your profile" />
              <Toggle checked={privacy.chatEnabled}         onChange={v => setPrivacy(p=>({...p,chatEnabled:v}))}         label="Enable Chat"             desc="Allow buyers to send you messages" />
              <Toggle checked={privacy.autoApproveReviews}  onChange={v => setPrivacy(p=>({...p,autoApproveReviews:v}))}  label="Auto-approve Reviews"    desc="Reviews publish immediately without your approval" />
            </div>
          )}

          {/* ── SECURITY ── */}
          {tab === 'security' && (
            <div>
              <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Security</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Update your password and manage account security</div>
              </div>
              <div style={{ maxWidth: 420 }}>
                <Field label="Current Password">
                  <div style={{ position: 'relative' }}>
                    <Input type={showPw ? 'text' : 'password'} value={passwords.current} onChange={e => setPasswords(p=>({...p,current:e.target.value}))} placeholder="Enter current password" />
                    <button onClick={() => setShowPw(v=>!v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Field>
                <Field label="New Password" hint="At least 8 characters"><Input type="password" value={passwords.next} onChange={e => setPasswords(p=>({...p,next:e.target.value}))} placeholder="New password" /></Field>
                <Field label="Confirm New Password"><Input type="password" value={passwords.confirm} onChange={e => setPasswords(p=>({...p,confirm:e.target.value}))} placeholder="Confirm password" /></Field>
                <button onClick={changePassword} disabled={saving || !passwords.current || !passwords.next} style={{
                  padding: '12px 28px', background: passwords.current && passwords.next ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                  border: 'none', borderRadius: 10, color: passwords.current && passwords.next ? '#000' : 'rgba(255,255,255,0.25)',
                  fontSize: 13, fontWeight: 900, cursor: passwords.current && passwords.next ? 'pointer' : 'default',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {saving ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SAVE BAR */}
        {tab !== 'security' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button onClick={save} disabled={saving} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '13px 28px', background: 'var(--gold)', border: 'none', borderRadius: 10,
              color: '#000', fontSize: 13, fontWeight: 900, cursor: saving ? 'wait' : 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              boxShadow: '0 4px 20px rgba(212,196,168,0.2)',
            }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
