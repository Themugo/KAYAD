import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as dealerApi from '../../../services/dealerPlatformApi';
import { communicationsAPI, dealerAPI } from '../../../api/api';
import { Bell, Building2, Landmark, Users, CreditCard } from 'lucide-react';

/**
 * Phase 14.4 dealer settings: organisation profile (existing
 * GET/PUT /dealer-platform/profile/:dealerId, self-only on the server) and a
 * read-only verification status card (GET /verification/status). Only fields
 * the contract exposes are shown: businessName, location, bio, phone. The GET
 * response returns phone ONLY to the signed-in owner (Phase 14.5), so it is prefilled here;
 * it is sent only when changed. A changed number resets phone verification on the server.
 */

interface ProfileForm { businessName: string; location: string; bio: string; phone: string }
const EMPTY: ProfileForm = { businessName: '', location: '', bio: '', phone: '' };

const STAGE_LABELS: Record<string, string> = {
  email_unverified: 'Email not verified',
  application_not_submitted: 'Application not submitted',
  pending_approval: 'Pending KAYAD review',
  approved: 'Approved',
  rejected: 'Not approved',
  suspended: 'Suspended',
  unknown: 'Status unavailable',
};

const inputCls = 'w-full px-3 py-2 border border-[#B9D3CF] rounded-lg text-sm text-[#0A3340] bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0A3340]';

function ProfileSection({ userId }: { userId: string }) {
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedPhone, setSavedPhone] = useState('');
  const [phoneNotice, setPhoneNotice] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const savingRef = useRef(false);

  const [verification, setVerification] = useState<{ stage: string; status?: string } | null>(null);
  const [verificationError, setVerificationError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    dealerApi.getDealerProfile(userId)
      .then((body: any) => {
        if (cancelled) return;
        const d = body?.data;
        if (!d) { setLoadError('Could not load your dealership profile. Please try again.'); return; }
        setForm({ businessName: d.businessName || '', location: d.location || '', bio: d.bio || '', phone: d.phone || '' });
        setSavedPhone(d.phone || '');
        setDirty(false);
      })
      .catch(() => { if (!cancelled) setLoadError('Could not load your dealership profile. Please try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, retry]);

  useEffect(() => {
    let cancelled = false;
    dealerApi.getVerificationStatus()
      .then((body: any) => {
        if (cancelled) return;
        const stage = body?.onboardingStage || body?.data?.onboardingStage || (body?.verificationStatus === 'none' ? 'application_not_submitted' : 'unknown');
        setVerification({ stage, status: body?.verification?.status || body?.data?.verification?.status });
      })
      .catch(() => { if (!cancelled) setVerificationError(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const set = (k: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setDirty(true);
    setSaved(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    const found: Partial<Record<keyof ProfileForm, string>> = {};
    if (!form.businessName.trim()) found.businessName = 'Business name is required.';
    if (form.bio.length > 2000) found.bio = 'Bio must be 2000 characters or fewer.';
    const phoneChanged = form.phone.trim() !== savedPhone;
    if (phoneChanged && !/^(\+?254|0)[17]\d{8}$/.test(form.phone.replace(/\s+/g, ''))) found.phone = 'Enter a valid Kenyan mobile number, e.g. 0712 345 678.';
    setErrors(found);
    if (Object.keys(found).length) { document.getElementById(`settings-${Object.keys(found)[0]}`)?.focus(); return; }
    if (phoneChanged && !currentPassword) { setSaveError('Enter your current password to change your phone number.'); document.getElementById('settings-current-password')?.focus(); return; }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const body: Record<string, string> = { businessName: form.businessName.trim(), location: form.location.trim(), bio: form.bio.trim() };
      if (phoneChanged) { body.phone = form.phone.trim(); body.currentPassword = currentPassword; }
      const res: any = await dealerApi.updateDealerProfile(userId, body);
      if (res?.success === false) { setSaveError(res.message || 'Could not save your changes.'); return; }
      const d = res?.data;
      if (d) { setForm({ businessName: d.businessName || '', location: d.location || '', bio: d.bio || '', phone: d.phone || '' }); setSavedPhone(d.phone || ''); }
      setPhoneNotice(phoneChanged);
      setCurrentPassword('');
      setDirty(false);
      setSaved(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      const serverFields = err?.response?.data?.errors;
      if (status === 400 && serverFields && typeof serverFields === 'object') setErrors(serverFields);
      setSaveError(status === 429 ? 'Too many attempts. Please wait a few minutes and try again.' : status === 403 ? (msg || 'You can only update your own dealership profile.') : status === 401 ? 'Your session has expired. Please sign in again.' : (msg || 'Could not save your changes. Please try again.'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const aria = (k: keyof ProfileForm) => ({ 'aria-invalid': errors[k] ? true : undefined, 'aria-describedby': errors[k] ? `settings-${k}-error` : undefined });
  const fieldErr = (k: keyof ProfileForm) => errors[k] ? <p id={`settings-${k}-error`} role="alert" className="text-xs text-[#B42318] mt-1">{errors[k]}</p> : null;

  return (
    <div className="space-y-6">
      <section aria-labelledby="verification-heading" className="p-4 rounded-xl bg-[#F3FAF9] border border-[#D7E7E4]">
        <h3 id="verification-heading" className="text-base font-bold text-[#0A3340] mb-1">Verification status</h3>
        {verificationError ? (
          <p className="text-sm text-[#475569]">Verification status is unavailable right now.</p>
        ) : !verification ? (
          <p className="text-sm text-[#475569]">Checking verification status…</p>
        ) : (
          <p className="text-sm text-[#0A3340]" data-testid="verification-stage">{STAGE_LABELS[verification.stage] || STAGE_LABELS.unknown}</p>
        )}
        <p className="text-xs text-[#475569] mt-1">Approval is decided by KAYAD staff. This card is read-only.</p>
      </section>

      <section aria-labelledby="profile-heading">
        <h3 id="profile-heading" className="text-xl font-bold text-[#0A3340] mb-4">Dealership profile</h3>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#176B87] animate-spin" aria-label="Loading profile" /></div>
        ) : loadError ? (
          <div className="py-8 text-center"><p className="text-sm text-[#475569] mb-3">{loadError}</p><button type="button" onClick={() => setRetry((n) => n + 1)} className="text-xs font-bold text-[#176B87]">Try Again</button></div>
        ) : (
          <form onSubmit={submit} noValidate aria-label="Dealership profile" className="space-y-4 max-w-xl">
            {saveError && <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-[#FEF3F2] border border-[#FDA29B] text-sm text-[#7A271A]"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" /><span>{saveError}</span></div>}
            {saved && <p role="status" className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900"><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Profile saved.{phoneNotice ? ' Your new phone number needs to be verified again.' : ''}</p>}
            <p className="text-xs text-[#475569]">Fields marked <span aria-hidden="true" className="text-[#B42318]">*</span><span className="sr-only">with an asterisk</span> are required. Verification status above is read-only.</p>
            {dirty && !saved && <p className="text-xs text-[#475569]" data-testid="unsaved-indicator">You have unsaved changes.</p>}
            <div>
              <label htmlFor="settings-businessName" className="block text-sm font-medium text-[#0A3340] mb-1">Business name <span aria-hidden="true" className="text-[#B42318]">*</span></label>
              <input id="settings-businessName" className={inputCls} value={form.businessName} onChange={set('businessName')} disabled={saving} {...aria('businessName')} />
              {fieldErr('businessName')}
            </div>
            <div>
              <label htmlFor="settings-location" className="block text-sm font-medium text-[#0A3340] mb-1">Location</label>
              <input id="settings-location" className={inputCls} value={form.location} onChange={set('location')} disabled={saving} />
            </div>
            <div>
              <label htmlFor="settings-phone" className="block text-sm font-medium text-[#0A3340] mb-1">Contact phone</label>
              <input id="settings-phone" type="tel" className={inputCls} value={form.phone} onChange={set('phone')} disabled={saving} {...aria('phone')} />
              <p className="text-xs text-[#475569] mt-1">This is your account phone number. Changing it requires verifying the new number again.</p>
              {fieldErr('phone')}
            </div>
            {form.phone.trim() !== savedPhone && (
              <div>
                <label htmlFor="settings-current-password" className="block text-sm font-medium text-[#0A3340] mb-1">Current password</label>
                <input id="settings-current-password" type="password" autoComplete="current-password" className={inputCls} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={saving} />
                <p className="text-xs text-[#475569] mt-1">Required to confirm a change to your phone number.</p>
              </div>
            )}
            <div>
              <label htmlFor="settings-bio" className="block text-sm font-medium text-[#0A3340] mb-1">About your dealership</label>
              <textarea id="settings-bio" rows={4} className={inputCls} value={form.bio} onChange={set('bio')} disabled={saving} {...aria('bio')} />
              {fieldErr('bio')}
            </div>
            <button type="submit" disabled={saving} aria-busy={saving} className="px-4 py-2 rounded-xl bg-[#176B87] text-white font-medium hover:bg-[#12576D] disabled:opacity-60 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]">
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}


// ---------------------------------------------------------------------------------------------------------------------------------
// Settings centre: one place for everything that configures the dealership. Each tab uses an existing, real contract.
// ---------------------------------------------------------------------------------------------------------------------------------
type Tab = 'profile' | 'notifications' | 'plan' | 'team' | 'banking';
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'plan', label: 'Plan & limits', icon: CreditCard },
  { id: 'team', label: 'Team & roles', icon: Users },
  { id: 'banking', label: 'Banking', icon: Landmark },
];
const readTab = (): Tab => {
  try { const v = new URLSearchParams(window.location.search).get('tab'); return TABS.some((t) => t.id === v) ? (v as Tab) : 'profile'; } catch { return 'profile'; }
};
const writeTab = (tab: Tab) => {
  try {
    const url = new URL(window.location.href);
    if (tab === 'profile') url.searchParams.delete('tab'); else url.searchParams.set('tab', tab);
    if (url.search !== window.location.search) window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch { /* history unavailable */ }
};

interface Prefs { emailTransactional?: boolean; smsTransactional?: boolean; whatsappTransactional?: boolean; emailMarketing?: boolean; smsMarketing?: boolean; whatsappMarketing?: boolean; quietHoursStart?: string | null; quietHoursEnd?: string | null; timezone?: string }
const hhmm = (v?: string | null) => (v ? String(v).slice(0, 5) : '');

function NotificationsSection() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [draft, setDraft] = useState<Prefs>({});
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setState('loading');
    communicationsAPI.preferences()
      .then((r: any) => { if (!live) return; const d = r?.data || r; if (!d || typeof d !== 'object') { setState('error'); return; } setPrefs(d); setDraft({}); setState('ready'); })
      .catch(() => { if (live) setState('error'); });
    return () => { live = false; };
  }, [retry]);

  const val = <K extends keyof Prefs>(k: K): Prefs[K] => (k in draft ? draft[k] : prefs?.[k]);
  const toggle = (k: keyof Prefs) => (e: React.ChangeEvent<HTMLInputElement>) => { setDraft((d) => ({ ...d, [k]: e.target.checked })); setSaved(false); };
  const dirty = Object.keys(draft).length > 0;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !dirty) return;
    const qs = val('quietHoursStart'); const qe = val('quietHoursEnd');
    if ((qs && !qe) || (!qs && qe)) { setSaveError('Set both a start and an end time for quiet hours, or clear both.'); return; }
    setSaving(true); setSaveError(null); setSaved(false);
    try {
      const r: any = await communicationsAPI.updatePreferences(draft);
      const d = r?.data || r;
      if (r?.success === false) throw new Error(r.message);
      setPrefs((p) => ({ ...(p || {}), ...(d && typeof d === 'object' ? d : draft) }));
      setDraft({}); setSaved(true);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Could not save your notification settings. Please try again.');
    } finally { setSaving(false); }
  };

  if (state === 'loading') return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#176B87] animate-spin" aria-label="Loading notification settings" /></div>;
  if (state === 'error') return <div className="py-8 text-center"><p role="alert" className="text-sm text-[#475569] mb-3">Could not load your notification settings.</p><button type="button" onClick={() => setRetry((n) => n + 1)} className="text-xs font-bold text-[#176B87]">Try Again</button></div>;

  const row = (label: string, hint: string, tKey: keyof Prefs, mKey: keyof Prefs) => (
    <tr className="border-t border-[#D7E7E4]">
      <th scope="row" className="py-3 pr-4 text-left align-top"><span className="block text-sm font-medium text-[#0A3340]">{label}</span><span className="block text-xs text-[#475569]">{hint}</span></th>
      <td className="py-3 px-3 text-center"><input type="checkbox" aria-label={`${label}: account and deal updates`} checked={val(tKey) !== false} onChange={toggle(tKey)} disabled={saving} /></td>
      <td className="py-3 px-3 text-center"><input type="checkbox" aria-label={`${label}: offers and marketing`} checked={val(mKey) !== false} onChange={toggle(mKey)} disabled={saving} /></td>
    </tr>
  );

  return (
    <form onSubmit={save} noValidate aria-label="Notification settings" className="space-y-5 max-w-2xl">
      <p className="text-sm text-[#475569]">Choose how KAYAD reaches you. Security codes and essential account notices are always sent.</p>
      {saveError && <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-[#FEF3F2] border border-[#FDA29B] text-sm text-[#7A271A]"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />{saveError}</div>}
      {saved && <p role="status" className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900"><CheckCircle2 className="w-4 h-4" aria-hidden="true" />Notification settings saved.</p>}
      <table className="w-full">
        <thead><tr><th className="text-left text-xs uppercase tracking-wide text-[#64748B] pb-2">Channel</th><th className="text-xs uppercase tracking-wide text-[#64748B] pb-2">Account &amp; deals</th><th className="text-xs uppercase tracking-wide text-[#64748B] pb-2">Offers &amp; marketing</th></tr></thead>
        <tbody>
          {row('Email', 'Sent to your account email address', 'emailTransactional', 'emailMarketing')}
          {row('SMS', 'Sent to your account phone number', 'smsTransactional', 'smsMarketing')}
          {row('WhatsApp', 'Sent to your account phone number', 'whatsappTransactional', 'whatsappMarketing')}
        </tbody>
      </table>
      <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <legend className="text-sm font-medium text-[#0A3340] mb-1">Quiet hours (non-urgent messages wait until they end)</legend>
        <div>
          <label htmlFor="quiet-start" className="block text-xs font-medium text-[#0A3340] mb-1">From</label>
          <input id="quiet-start" type="time" className={inputCls} value={hhmm(val('quietHoursStart'))} onChange={(e) => { setDraft((d) => ({ ...d, quietHoursStart: e.target.value || null })); setSaved(false); }} disabled={saving} />
        </div>
        <div>
          <label htmlFor="quiet-end" className="block text-xs font-medium text-[#0A3340] mb-1">Until</label>
          <input id="quiet-end" type="time" className={inputCls} value={hhmm(val('quietHoursEnd'))} onChange={(e) => { setDraft((d) => ({ ...d, quietHoursEnd: e.target.value || null })); setSaved(false); }} disabled={saving} />
        </div>
        <div>
          <label htmlFor="quiet-tz" className="block text-xs font-medium text-[#0A3340] mb-1">Time zone</label>
          <select id="quiet-tz" className={inputCls} value={String(val('timezone') || 'Africa/Nairobi')} onChange={(e) => { setDraft((d) => ({ ...d, timezone: e.target.value })); setSaved(false); }} disabled={saving}>
            {Array.from(new Set(['Africa/Nairobi', 'Africa/Kampala', 'Africa/Dar_es_Salaam', 'UTC', String(val('timezone') || 'Africa/Nairobi')])).map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
      </fieldset>
      <button type="submit" disabled={saving || !dirty} className="px-4 py-2 rounded-xl bg-[#176B87] text-white font-medium hover:bg-[#12576D] disabled:opacity-60 flex items-center gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}{saving ? 'Saving…' : 'Save notification settings'}
      </button>
    </form>
  );
}

function PlanSection() {
  const [ent, setEnt] = useState<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setState('loading');
    dealerAPI.getSubscription()
      .then((r: any) => { if (!live) return; setEnt(r?.entitlement || null); setState(r?.entitlement ? 'ready' : 'error'); })
      .catch(() => { if (live) setState('error'); });
    return () => { live = false; };
  }, [retry]);
  if (state === 'loading') return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#176B87] animate-spin" aria-label="Loading plan" /></div>;
  if (state === 'error') return <div className="py-8 text-center"><p role="alert" className="text-sm text-[#475569] mb-3">Could not load your plan details.</p><button type="button" onClick={() => setRetry((n) => n + 1)} className="text-xs font-bold text-[#176B87]">Try Again</button></div>;
  const has = ent.status === 'active' || ent.status === 'cancelled';
  const used = Number(ent.listingsUsed || 0); const max = Number(ent.listingMax || 0);
  const pct = ent.unlimitedListings || !max ? 0 : Math.min(100, Math.round((used / max) * 100));
  const date = (iso?: string) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; };
  return (
    <div className="space-y-4 max-w-xl">
      {has ? (
        <>
          <div className="p-4 rounded-xl bg-[#F3FAF9] border border-[#D7E7E4]">
            <p className="text-xs uppercase tracking-wide text-[#64748B]">Current plan</p>
            <p className="text-xl font-bold text-[#0A3340]">{ent.planName || 'Active plan'}</p>
            <p className="text-sm text-[#475569]">{ent.status === 'cancelled' ? 'Will not renew; active until' : 'Active until'} {date(ent.expiresAt)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-[#0A3340] mb-1">Listings used: {used}{ent.unlimitedListings ? ' (unlimited)' : ` of ${max}`}</p>
            {!ent.unlimitedListings && max > 0 && <div className="h-2 rounded-full bg-[#EEF7F5] overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={used} aria-label="Listings used"><div className="h-full bg-[#176B87]" style={{ width: `${pct}%` }} /></div>}
            {ent.locked && <p role="alert" className="mt-2 text-sm text-[#7A271A]">New listings are currently locked on your account. Contact KAYAD support.</p>}
          </div>
        </>
      ) : (
        <div role="alert" className="p-4 rounded-xl bg-[#FEF3F2] border border-[#FDA29B]">
          <p className="font-semibold text-[#7A271A]">No active listing plan</p>
          <p className="text-sm text-[#7A271A]">You cannot publish vehicles until a plan is active. Contact KAYAD support to have a plan activated.</p>
        </div>
      )}
      <p className="text-xs text-[#475569]">Plans are managed by KAYAD. This page is read-only.</p>
    </div>
  );
}

export default function DealerSettingsPanel({ userId, onOpenSection }: { userId: string; onOpenSection?: (section: string) => void }) {
  const [tab, setTabState] = useState<Tab>(readTab);
  const setTab = (t: Tab) => { setTabState(t); writeTab(t); };
  useEffect(() => {
    const onPop = () => setTabState(readTab());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const link = (target: string, title: string, body: string, cta: string) => (
    <div className="p-4 rounded-xl bg-[#F3FAF9] border border-[#D7E7E4] max-w-xl">
      <h3 className="text-base font-bold text-[#0A3340] mb-1">{title}</h3>
      <p className="text-sm text-[#475569] mb-3">{body}</p>
      <button type="button" onClick={() => onOpenSection?.(target)} disabled={!onOpenSection} className="px-4 py-2 rounded-xl bg-[#176B87] text-white text-sm font-medium hover:bg-[#12576D] disabled:opacity-60">{cta}</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-2 border-b border-[#D7E7E4] pb-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" role="tab" id={`settings-tab-${t.id}`} aria-selected={tab === t.id} aria-controls="settings-tabpanel" onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340] ${tab === t.id ? 'bg-[#176B87] text-white' : 'text-[#176B87] border border-[#B9D3CF] hover:bg-[#F3FAF9]'}`}>
              <Icon className="w-4 h-4" aria-hidden="true" />{t.label}
            </button>
          );
        })}
      </div>
      <div id="settings-tabpanel" role="tabpanel" aria-labelledby={`settings-tab-${tab}`}>
        {tab === 'profile' && <ProfileSection userId={userId} />}
        {tab === 'notifications' && <NotificationsSection />}
        {tab === 'plan' && <PlanSection />}
        {tab === 'team' && link('team', 'Team & roles', 'Invite people by email, choose what each role can do, and suspend or remove members.', 'Open Team')}
        {tab === 'banking' && link('banking', 'Banking & payouts', 'Where your payouts are sent: bank account and M-Pesa details.', 'Open Banking')}
      </div>
    </div>
  );
}
