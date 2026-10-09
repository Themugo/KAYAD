import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, Mail } from 'lucide-react';
import PremiumAuthShell from './auth/PremiumAuthShell';
import { PasswordField, TextField } from './onboarding/fields';
import {
  AFFILIATION_PATH, PUBLIC_ROLES, roleById, roleForIntent, type PublicRoleId,
} from './onboarding/roles';
import { parseList, validateAccount, validateProfessional, type FieldErrors } from './onboarding/validation';
import { AuthApiError, resendVerification } from '../services/authApi';
import { useAuth } from '../context/AuthContext';
import { inspectorAPI } from '../api/api';
import { buildAuthPath, readAuthContext, rememberAuthIntent } from '../utils/authIntent';

type Props = {
  onComplete?: (user: any) => void;
  onClose?: () => void;
};

type Mode = 'independent' | 'employed';
type Outcome =
  | { kind: 'account'; email: string }
  | { kind: 'application' }
  | { kind: 'exists' }
  | { kind: 'pending-application' }
  | { kind: 'unknown' };

const emptyForm = {
  name: '', email: '', phone: '', password: '', businessName: '', location: '',
  idNumber: '', yearsOfExperience: '', specialties: '', preferredRegions: '', toolsAvailable: '',
};

/** True when the request may or may not have reached the server. */
const outcomeUnknown = (err: unknown) => {
  if (err instanceof AuthApiError) return err.kind === 'network' || err.status === 408 || err.status === 502 || err.status === 503 || err.status === 504;
  const e = err as { response?: { status?: number }; code?: string } | null;
  return !!e && !e.response;
};
const statusOf = (err: unknown): number | undefined =>
  err instanceof AuthApiError ? err.status : (err as { response?: { status?: number } } | null)?.response?.status;
const messageOf = (err: unknown): string => {
  const data = (err as { response?: { data?: { message?: string } } } | null)?.response?.data;
  if (data?.message) return data.message;
  return err instanceof Error && err.message ? err.message : 'We could not complete that. Please try again.';
};

export default function OnboardingFlow({ onComplete, onClose }: Props) {
  const { register: authRegister } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const ctx = useMemo(() => readAuthContext(location), [location]);
  const presetRole = roleForIntent(ctx.intent);

  const [roleId, setRoleId] = useState<PublicRoleId | null>(presetRole);
  const [mode, setMode] = useState<Mode | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const inFlight = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  const role = roleId ? roleById(roleId) : null;
  const independent = role?.id === 'professional' && mode === 'independent';
  const needsMode = role?.id === 'professional' && mode === null;
  const set = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  useEffect(() => { headingRef.current?.focus(); }, [roleId, mode, outcome]);

  // Where to send the person once they have verified and signed in.
  const destination = role?.id === 'professional' && mode === 'employed' ? AFFILIATION_PATH : (role?.afterSignIn || ctx.next);

  const choose = (id: PublicRoleId) => { setRoleId(id); setMode(null); setErrors({}); setServerError(''); };

  const focusFirstError = (found: FieldErrors) => {
    const first = Object.keys(found)[0];
    window.setTimeout(() => refs.current[first]?.focus(), 0);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current || !role) return;
    setServerError('');
    const found = independent
      ? validateProfessional(form)
      : validateAccount(form, role.backendRole || 'user');
    setErrors(found);
    if (Object.keys(found).length) { focusFirstError(found); return; }

    inFlight.current = true;
    setSubmitting(true);
    try {
      if (independent) {
        await inspectorAPI.apply({
          fullName: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), idNumber: form.idNumber.trim(),
          location: form.location.trim(), yearsOfExperience: Number(form.yearsOfExperience),
          specialties: parseList(form.specialties), preferredRegions: parseList(form.preferredRegions),
          toolsAvailable: form.toolsAvailable.trim() || undefined,
        });
        setOutcome({ kind: 'application' });
        return;
      }
      const backendRole = role.backendRole || 'user';
      const body = {
        name: form.name.trim(), email: form.email.trim(), password: form.password, role: backendRole,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(backendRole !== 'user' && form.businessName.trim() ? { businessName: form.businessName.trim() } : {}),
        ...(backendRole !== 'user' && form.location.trim() ? { location: form.location.trim() } : {}),
      };
      const result = await authRegister(body);
      // Registration is account creation, not sign-in: the backend issues no session until
      // the email is verified and the person signs in explicitly. Remember only the
      // (non-sensitive) purpose so it survives the verification round trip.
      rememberAuthIntent({ next: destination, intent: role.intent });
      setOutcome({ kind: 'account', email: form.email.trim() });
      setForm((p) => ({ ...p, password: '' }));
      onComplete?.(result?.user);
    } catch (err) {
      const status = statusOf(err);
      if (status === 409 && !independent) setOutcome({ kind: 'exists' });
      else if (independent && status === 400 && /pending application/i.test(messageOf(err))) setOutcome({ kind: 'pending-application' });
      else if (outcomeUnknown(err)) setOutcome({ kind: 'unknown' });
      else if (status === 429) setServerError('Too many attempts. Please wait a few minutes and try again.');
      else setServerError(messageOf(err));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const doResend = async () => {
    if (!form.email.trim() || resend === 'sending') return;
    setResend('sending');
    try { await resendVerification({ email: form.email.trim() }); setResend('sent'); } catch { setResend('failed'); }
  };

  const signInPath = buildAuthPath('login', { next: destination, intent: role?.intent });

  /* ---------- outcome screens ---------- */
  if (outcome) {
    const common = { mode: 'register' as const };
    if (outcome.kind === 'account') {
      const nextStep = role?.id === 'dealer'
        ? 'After you sign in you will be taken to business verification. Dealer tools stay locked until KAYAD approves it.'
        : role?.id === 'seller'
          ? 'You can sign in once verified, but you cannot list a vehicle until KAYAD approves your seller account.'
          : role?.id === 'service_business'
            ? 'After you sign in you will go straight to the provider application. KAYAD reviews it; nothing is published until it is approved.'
            : role?.id === 'professional'
              ? 'After you sign in you can ask your garage or inspection company to confirm you as staff. They must accept, and KAYAD verifies qualifications separately.'
              : 'After you sign in you can start browsing, saving and bidding.';
      return (
        <PremiumAuthShell {...common} eyebrow="Account created" title="Check your email." description={`We sent a verification link to ${outcome.email}. You must verify before you can sign in.`}>
          <div className="space-y-5" role="status">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="m-0">{nextStep}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to={signInPath} className="kayad-auth-submit inline-flex items-center justify-center px-6 no-underline">Go to sign in</Link>
              <button type="button" className="kayad-auth-secondary-action px-5" onClick={doResend} disabled={resend === 'sending'}>
                {resend === 'sending' ? 'Sending…' : 'Resend verification email'}
              </button>
            </div>
            {resend === 'sent' && <p className="kayad-auth-notice m-0" role="status">If that account exists and is not yet verified, a new link is on its way.</p>}
            {resend === 'failed' && <p className="kayad-auth-error m-0" role="alert">We could not send that just now. Please try again in a minute.</p>}
            <p className="m-0 text-xs text-slate-500">Can’t find it? Check spam. The link works for 24 hours.</p>
          </div>
        </PremiumAuthShell>
      );
    }
    if (outcome.kind === 'application') {
      return (
        <PremiumAuthShell {...common} eyebrow="Application received" title="Your application is with KAYAD." description="This is an application, not an account yet.">
          <div className="space-y-4" role="status">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="m-0">KAYAD reviews applications by hand. If yours is approved we email {form.email.trim() || 'you'} a link to set your password (valid for 72 hours); then you can sign in. Nothing is activated until then.</p>
            </div>
            <p className="m-0 text-xs text-slate-500">If you work for a garage or inspection company that is already on KAYAD, you do not need to apply on your own: create an account and ask the business to confirm you.</p>
            <Link to="/" className="kayad-auth-secondary-action px-5 no-underline">Back to KAYAD</Link>
          </div>
        </PremiumAuthShell>
      );
    }
    if (outcome.kind === 'pending-application') {
      return (
        <PremiumAuthShell {...common} eyebrow="Already applied" title="You already have an application waiting." description="KAYAD has an application for this email address that is still being reviewed.">
          <div className="space-y-4" role="status">
            <p className="m-0 text-sm text-slate-600">You do not need to apply again. If approved, an email with a link to set your password will be sent to that address.</p>
            <Link to="/" className="kayad-auth-secondary-action px-5 no-underline">Back to KAYAD</Link>
          </div>
        </PremiumAuthShell>
      );
    }
    if (outcome.kind === 'exists') {
      return (
        <PremiumAuthShell {...common} eyebrow="Existing account" title="This email already has an account." description="You can use it: sign in, finish verifying, or reset the password.">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Link to={buildAuthPath('login', { next: destination, intent: role?.intent })} state={{ email: form.email.trim() }} className="kayad-auth-submit inline-flex items-center justify-center px-6 no-underline">Sign in</Link>
              <Link to="/forgot-password" className="kayad-auth-secondary-action px-5 no-underline">Reset password</Link>
              <button type="button" className="kayad-auth-secondary-action px-5" onClick={doResend} disabled={resend === 'sending'}>{resend === 'sending' ? 'Sending…' : 'Resend verification email'}</button>
            </div>
            {resend === 'sent' && <p className="kayad-auth-notice m-0" role="status">If that account exists and is not yet verified, a new link is on its way.</p>}
            {resend === 'failed' && <p className="kayad-auth-error m-0" role="alert">We could not send that just now. Please try again in a minute.</p>}
            {role && role.route !== 'account' && <p className="m-0 text-xs text-slate-500">Signing in with your existing account is how you continue as {role.title.toLowerCase()}; you do not need a second account.</p>}
            <button type="button" className="inline-flex min-h-[44px] items-center text-xs font-bold text-[#176B87] underline" onClick={() => setOutcome(null)}>Use a different email</button>
          </div>
        </PremiumAuthShell>
      );
    }
    return (
      <PremiumAuthShell {...common} eyebrow="Connection problem" title="We couldn’t confirm that went through." description="Your connection dropped before we heard back, so we don’t know whether your details were received.">
        <div className="space-y-4" role="alert">
          <p className="m-0 text-sm text-slate-700">Nothing is duplicated if you try again: KAYAD refuses a second account or application for the same email. If you already received a verification email, you are done - just sign in.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="kayad-auth-submit px-6" onClick={() => setOutcome(null)}>Go back and try again</button>
            <Link to={buildAuthPath('login', { next: destination })} state={{ email: form.email.trim() }} className="kayad-auth-secondary-action px-5 no-underline">I may already have an account</Link>
          </div>
        </div>
      </PremiumAuthShell>
    );
  }

  /* ---------- step 1: choose how you will use KAYAD ---------- */
  const rail = role ? { title: `What happens next: ${role.title.toLowerCase()}`, steps: role.steps, note: 'Staff and administrator accounts are provisioned by KAYAD and cannot be created here.' } : {
    title: 'How KAYAD accounts work',
    steps: [
      { title: 'Everyone starts with an email', body: 'Every account must verify its email before it can sign in.' },
      { title: 'Selling and services need approval', body: 'Sellers, dealers and service businesses are reviewed by KAYAD before they can list or be booked.' },
      { title: 'You can add roles later', body: 'A buyer account can become a seller or apply as a provider without a new account.' },
    ],
    note: 'Staff and administrator accounts are provisioned by KAYAD and cannot be created here.',
  };

  if (!role) {
    return (
      <PremiumAuthShell mode="register" eyebrow="Create your account" title="How will you use KAYAD?" description="Pick the one that fits. It sets what we ask for and what happens next." rail={rail}>
        <div role="radiogroup" aria-label="How you will use KAYAD" className="grid gap-3">
          {PUBLIC_ROLES.map((r, i) => (
            <button
              key={r.id} type="button" role="radio" aria-checked={false} className="kayad-role-card" tabIndex={i === 0 ? 0 : -1}
              onClick={() => choose(r.id)}
              onKeyDown={(e) => {
                const items = Array.from((e.currentTarget.parentElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[role=radio]'));
                const idx = items.indexOf(e.currentTarget);
                const move = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
                if (move) { e.preventDefault(); const t = items[(idx + move + items.length) % items.length]; t.focus(); items.forEach((n) => n.tabIndex = n === t ? 0 : -1); }
              }}
            >
              <strong>{r.title}</strong>
              <span>{r.summary}</span>
              <em>{r.outcome}</em>
            </button>
          ))}
        </div>
        <p className="mt-5 text-xs text-slate-500">Already have an account? <Link to={buildAuthPath('login', ctx)} className="font-black text-[#176B87] underline">Sign in</Link></p>
        {onClose && <button type="button" onClick={onClose} className="mt-3 inline-flex min-h-[44px] items-center px-2 text-xs font-bold text-slate-500 underline">Not now</button>}
      </PremiumAuthShell>
    );
  }

  /* ---------- step 2: details ---------- */
  const isDealer = role.backendRole === 'dealer';
  const isSeller = role.backendRole === 'individual_seller';
  const submitLabel = independent ? 'Send application' : role.id === 'service_business' ? 'Create account and continue' : 'Create account';
  const errorKeys = Object.keys(errors);

  return (
    <PremiumAuthShell mode="register" eyebrow={role.title} title={independent ? 'Apply as an independent inspector.' : 'Create your account.'} description={independent ? 'KAYAD reviews every application. You will not get an account until it is approved.' : role.summary} rail={rail}>
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">{role.title} details</h2>
      <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <span><strong className="text-[#0A3340]">{role.title}</strong> · {role.outcome}</span>
        <button type="button" className="inline-flex min-h-[44px] items-center px-2 font-black text-[#176B87] underline" onClick={() => { setRoleId(null); setMode(null); setErrors({}); setServerError(''); }}>Change</button>
      </div>

      {role.id === 'professional' && (
        <fieldset className="mb-5 grid gap-3">
          <legend className="mb-2 text-sm font-black text-[#0A3340]">How do you work?</legend>
          {([
            ['independent', 'On my own', 'Apply to be reviewed as an independent inspector. You send ID and experience; KAYAD decides.'],
            ['employed', 'For a garage or inspection company', 'Create an account, then ask the business to confirm you as staff. No separate KAYAD application.'],
          ] as const).map(([value, title, body]) => (
            <label key={value} className="kayad-role-card cursor-pointer" aria-checked={mode === value}>
              <span className="flex items-center gap-2"><input type="radio" name="professional-mode" value={value} checked={mode === value} onChange={() => { setMode(value); setErrors({}); setServerError(''); }} /><strong>{title}</strong></span>
              <span>{body}</span>
            </label>
          ))}
        </fieldset>
      )}

      {!needsMode && (
        <form onSubmit={submit} noValidate className="kayad-auth-form" aria-busy={submitting}>
          {errorKeys.length > 0 && (
            <div className="kayad-auth-error" role="alert">
              <strong>Please fix {errorKeys.length === 1 ? 'one thing' : `${errorKeys.length} things`} to continue.</strong>
              <ul className="m-0 mt-1 list-disc pl-5">{errorKeys.map((k) => <li key={k}>{errors[k]}</li>)}</ul>
            </div>
          )}
          {serverError && <div className="kayad-auth-error" role="alert">{serverError}</div>}

          <TextField ref={(el) => { refs.current.name = el; }} label="Full name" value={form.name} onChange={set('name')} autoComplete="name" error={errors.name} disabled={submitting} />
          <TextField ref={(el) => { refs.current.email = el; }} label="Email" type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" error={errors.email} disabled={submitting} />
          <TextField ref={(el) => { refs.current.phone = el; }} label="Phone" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" optional={!isDealer && !isSeller && !independent} hint={isDealer || isSeller ? 'KAYAD uses this to reach you about your approval.' : undefined} error={errors.phone} disabled={submitting} />

          {isDealer && (
            <>
              <TextField ref={(el) => { refs.current.businessName = el; }} label="Dealership business name" value={form.businessName} onChange={set('businessName')} autoComplete="organization" error={errors.businessName} disabled={submitting} />
              <TextField ref={(el) => { refs.current.location = el; }} label="City or location" value={form.location} onChange={set('location')} autoComplete="address-level2" error={errors.location} disabled={submitting} />
            </>
          )}
          {isSeller && (
            <>
              <TextField label="Trading name" optional value={form.businessName} onChange={set('businessName')} autoComplete="organization" disabled={submitting} />
              <TextField label="City or location" optional value={form.location} onChange={set('location')} autoComplete="address-level2" disabled={submitting} />
            </>
          )}

          {independent && (
            <>
              <TextField ref={(el) => { refs.current.idNumber = el; }} label="National ID or passport number" value={form.idNumber} onChange={set('idNumber')} autoComplete="off" hint="Used by KAYAD to verify you. It is sent securely and is not stored in your browser." error={errors.idNumber} disabled={submitting} />
              <TextField ref={(el) => { refs.current.location = el; }} label="City or town" value={form.location} onChange={set('location')} autoComplete="address-level2" error={errors.location} disabled={submitting} />
              <TextField ref={(el) => { refs.current.yearsOfExperience = el; }} label="Years of experience" type="number" inputMode="numeric" min={0} max={80} value={form.yearsOfExperience} onChange={set('yearsOfExperience')} error={errors.yearsOfExperience} disabled={submitting} />
              <TextField ref={(el) => { refs.current.specialties = el; }} label="Specialties" value={form.specialties} onChange={set('specialties')} placeholder="e.g. engine diagnostics, pre-purchase inspection" hint="Separate with commas. These are your claims; KAYAD verifies them." error={errors.specialties} disabled={submitting} />
              <TextField label="Regions you cover" optional value={form.preferredRegions} onChange={set('preferredRegions')} placeholder="e.g. Nairobi, Kiambu" disabled={submitting} />
              <TextField label="Tools or equipment" optional value={form.toolsAvailable} onChange={set('toolsAvailable')} disabled={submitting} />
            </>
          )}

          {!independent && (
            <PasswordField ref={(el) => { refs.current.password = el; }} label="Password" value={form.password} onChange={set('password')} autoComplete="new-password" showRules error={errors.password} disabled={submitting} />
          )}

          <button type="submit" className="kayad-auth-submit" disabled={submitting}>{submitting ? <><span className="kayad-auth-spinner" aria-hidden="true" /> Working…</> : submitLabel}</button>
          <p className="m-0 text-[11px] text-slate-500"><Mail className="mr-1 inline h-3 w-3" aria-hidden="true" />{independent ? 'We will only use these details to review your application.' : 'We will email you a link to confirm your address.'}</p>
        </form>
      )}
    </PremiumAuthShell>
  );
}
