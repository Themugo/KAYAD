import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as dealerApi from '../../../services/dealerPlatformApi';

/**
 * Phase 14.4 dealer settings: organisation profile (existing
 * GET/PUT /dealer-platform/profile/:dealerId, self-only on the server) and a
 * read-only verification status card (GET /verification/status). Only fields
 * the contract exposes are shown: businessName, location, bio, phone. The GET
 * response does not return phone, so it is write-only here (blank = unchanged).
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

export default function DealerSettingsPanel({ userId }: { userId: string }) {
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
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
        setForm({ businessName: d.businessName || '', location: d.location || '', bio: d.bio || '', phone: '' });
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
    if (form.phone.trim() && !/^[+\d][\d\s()-]{6,20}$/.test(form.phone.trim())) found.phone = 'Enter a valid phone number.';
    setErrors(found);
    if (Object.keys(found).length) { document.getElementById(`settings-${Object.keys(found)[0]}`)?.focus(); return; }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const body: Record<string, string> = { businessName: form.businessName.trim(), location: form.location.trim(), bio: form.bio.trim() };
      if (form.phone.trim()) body.phone = form.phone.trim();
      const res: any = await dealerApi.updateDealerProfile(userId, body);
      if (res?.success === false) { setSaveError(res.message || 'Could not save your changes.'); return; }
      const d = res?.data;
      if (d) setForm({ businessName: d.businessName || '', location: d.location || '', bio: d.bio || '', phone: '' });
      setDirty(false);
      setSaved(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      setSaveError(status === 403 ? (msg || 'You can only update your own dealership profile.') : status === 401 ? 'Your session has expired. Please sign in again.' : (msg || 'Could not save your changes. Please try again.'));
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
            {saved && <p role="status" className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900"><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Profile saved.</p>}
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
              <p className="text-xs text-[#475569] mt-1">Leave blank to keep your current number.</p>
              {fieldErr('phone')}
            </div>
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
