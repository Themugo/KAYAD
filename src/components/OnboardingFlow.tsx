import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, Mail } from 'lucide-react';
import PremiumAuthShell from './auth/PremiumAuthShell';
import { PasswordField, TextField } from './onboarding/fields';
import {
  AFFILIATION_PATH, PUBLIC_ROLES, roleById, roleForIntent, providerApplicationPath, type PublicRoleId,
} from './onboarding/roles';
import { validateAccount, type FieldErrors } from './onboarding/validation';
import { AuthApiError, newRegistrationIdempotencyKey, resendVerification } from '../services/authApi';
import { useAuth } from '../context/AuthContext';
import { previewTeamInvitation } from '../services/dealerPlatformApi';
import { buildAuthPath, readAuthContext, rememberAuthIntent } from '../utils/authIntent';

type Props = {
  onComplete?: (user: any) => void;
  onClose?: () => void;
};

type Mode = 'independent' | 'employed';
type Outcome =
  | { kind: 'account'; email: string }
  | { kind: 'application' }
  | { kind: 'exists'; afterUncertainty?: boolean }
  | { kind: 'unavailable' }
  | { kind: 'pending-application' }
  | { kind: 'unknown' };

/** A dealership team invitation travels as the validated `next` path (/dealer/setup?invite=<64 hex>). Returns the token or null. */
const inviteTokenFromNext = (next: string | null): string | null => {
  const m = /^\/dealer\/setup\?(?:[^#]*&)?invite=([0-9a-fA-F]{64})(?:&|#|$)/.exec(next || '');
  return m ? m[1] : null;
};
type InviteInfo = { status: 'loading' } | { status: 'unavailable' } | { status: 'ok'; state: string; dealershipName?: string; roleLabel?: string; invitedEmail?: string; accountStatus?: string };

const emptyForm = {
  name: '', email: '', phone: '', password: '', businessName: '', location: '',
  idNumber: '', yearsOfExperience: '', specialties: '', preferredRegions: '', toolsAvailable: '',
};

/** True when the request may or may not have reached the server.
 * A 503 that carries a backend machine code (e.g. DATABASE_MIGRATION_REQUIRED,
 * ONBOARDING_POLICY_UNAVAILABLE) was produced by the KAYAD API itself *before*
 * anything was written, so that outcome is known: nothing was created. Only a
 * bare gateway/proxy 502/503/504, a 408, or no response at all is uncertain. */
const outcomeUnknown = (err: unknown) => {
  if (err instanceof AuthApiError) {
    if (err.kind === 'network' || err.status === 408 || err.status === 502 || err.status === 504) return true;
    return err.status === 503 && !err.code;
  }
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
  const inviteToken = useMemo(() => inviteTokenFromNext(ctx.next), [ctx.next]);
  // An invitation always creates an ORDINARY PERSONAL account (role `user`): the chooser is skipped and the dealership/staff paths are not offered.
  const presetRole = inviteToken ? 'buyer' : roleForIntent(ctx.intent);
  const [invite, setInvite] = useState<InviteInfo | null>(inviteToken ? { status: 'loading' } : null);

  const [roleId, setRoleId] = useState<PublicRoleId | null>(presetRole);
  const [mode, setMode] = useState<Mode | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const inFlight = useRef(false);
  // One key per logical registration attempt. It survives an unknown outcome (lost response) so the server can recognise a
  // retry as the SAME attempt and answer with the original success; it is dropped as soon as the outcome is known.
  const idempotencyKey = useRef<string | null>(null);
  // Set when an earlier attempt ended with an unknown outcome. The 409 screen then adds a hedged hint. It never claims the
  // first request reached the server: only the server's replay answer can prove that.
  const earlierUncertain = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  const role = roleId ? roleById(roleId) : null;
  const needsMode = role?.id === 'professional' && mode === null;
  const set = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  useEffect(() => { headingRef.current?.focus(); }, [roleId, mode, outcome]);

  // Ask the server what the invitation is (read-only, public). The invited e-mail is then filled in and locked; the server still compares the
  // signed-in account to the invitation on accept, so this is convenience, never authority.
  useEffect(() => {
    if (!inviteToken) return undefined;
    let cancelled = false;
    previewTeamInvitation(inviteToken)
      .then((res: { data?: Record<string, unknown> }) => {
        if (cancelled) return;
        const d = (res?.data || {}) as Record<string, string>;
        setInvite({ status: 'ok', state: d.state, dealershipName: d.dealershipName, roleLabel: d.roleLabel, invitedEmail: d.invitedEmail, accountStatus: d.accountStatus });
        if (d.state === 'valid' && d.invitedEmail) setForm((p) => ({ ...p, email: d.invitedEmail }));
      })
      .catch(() => { if (!cancelled) setInvite({ status: 'unavailable' }); });
    return () => { cancelled = true; };
  }, [inviteToken]);
  const inviteLocked = invite?.status === 'ok' && invite.state === 'valid' && !!invite.invitedEmail;

  // Where to send the person once they have verified and signed in.
  const destination = role?.id === 'professional' && mode === 'employed' ? AFFILIATION_PATH : (role?.id === 'professional' && mode === 'independent' ? providerApplicationPath('individual_inspector') : (role?.afterSignIn || ctx.next));

  const choose = (id: PublicRoleId) => { setRoleId(id); setMode(null); setErrors({}); setServerError(''); };

  const focusFirstError = (found: FieldErrors) => {
    const first = Object.keys(found)[0];
    window.setTimeout(() => refs.current[first]?.focus(), 0);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current || !role) return;
    setServerError('');
    const found = validateAccount(form, role.backendRole || 'user');
    setErrors(found);
    if (Object.keys(found).length) { focusFirstError(found); return; }

    inFlight.current = true;
    setSubmitting(true);
    try {
      const backendRole = role.backendRole || 'user';
      const body = {
        name: form.name.trim(), email: form.email.trim(), password: form.password, role: backendRole,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(backendRole !== 'user' && form.businessName.trim() ? { businessName: form.businessName.trim() } : {}),
        ...(backendRole !== 'user' && form.location.trim() ? { location: form.location.trim() } : {}),
      };
      if (!idempotencyKey.current) idempotencyKey.current = newRegistrationIdempotencyKey();
      const result = await authRegister(body, { idempotencyKey: idempotencyKey.current });
      idempotencyKey.current = null;
      earlierUncertain.current = false;
      // Registration is account creation, not sign-in: the backend issues no session until
      // the email is verified and the person signs in explicitly. Remember only the
      // (non-sensitive) purpose so it survives the verification round trip.
      rememberAuthIntent({ next: destination, intent: role.intent });
      setOutcome({ kind: 'account', email: form.email.trim() });
      setForm((p) => ({ ...p, password: '' }));
      onComplete?.(result?.user);
    } catch (err) {
      const status = statusOf(err);
      if (!outcomeUnknown(err)) idempotencyKey.current = null;
      if (status === 409) setOutcome({ kind: 'exists', afterUncertainty: earlierUncertain.current });
      else if (status === 503 && err instanceof AuthApiError && err.code) setOutcome({ kind: 'unavailable' });
      else if (outcomeUnknown(err)) { earlierUncertain.current = true; setOutcome({ kind: 'unknown' }); }
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
        ? 'After you sign in, complete business verification. Once you submit the required details, you can publish and manage your own vehicle listings while verification is processed; sensitive dealer features require approval.'
        : (role?.id === 'garage_business' || role?.id === 'inspection_company')
            ? 'After you sign in you will go straight to the provider application. KAYARD KE reviews it; nothing is published until it is approved.'
            : role?.id === 'professional'
              ? mode === 'independent' ? 'After you sign in, submit your inspector or mechanic credentials from the professional application. KAYARD KE reviews them and adds approved access to this same account.' : 'After you sign in, ask your garage or inspection company to confirm you as staff. They must accept, and KAYARD KE verifies qualifications separately.'
              : 'After email verification you can browse, save, bid and sell your own vehicle for free from this account. No package selection, seller application or administrator approval is required.';
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
            <p className="m-0 text-xs text-[#64748B]">Can’t find it? Check spam. The link works for 24 hours.</p>
          </div>
        </PremiumAuthShell>
      );
    }
    if (outcome.kind === 'application') {
      return (
        <PremiumAuthShell {...common} eyebrow="Application received" title="Your application is with KAYARD KE." description="This is an application, not an account yet.">
          <div className="space-y-4" role="status">
            <div className="flex items-start gap-3 rounded-2xl border border-[#BDE5DE] bg-[#F3FAF9] p-4 text-sm text-[#0A3340]">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="m-0">KAYARD KE reviews applications by hand. If yours is approved we email {form.email.trim() || 'you'} a link to set your password (valid for 72 hours); then you can sign in. Nothing is activated until then.</p>
            </div>
            <p className="m-0 text-xs text-[#64748B]">If you work for a garage or inspection company that is already on KAYARD KE, you do not need to apply on your own: create an account and ask the business to confirm you.</p>
            <Link to="/" className="kayad-auth-secondary-action px-5 no-underline">Back to KAYARD KE</Link>
          </div>
        </PremiumAuthShell>
      );
    }
    if (outcome.kind === 'pending-application') {
      return (
        <PremiumAuthShell {...common} eyebrow="Already applied" title="You already have an application waiting." description="KAYARD KE has an application for this email address that is still being reviewed.">
          <div className="space-y-4" role="status">
            <p className="m-0 text-sm text-[#64748B]">You do not need to apply again. If approved, an email with a link to set your password will be sent to that address.</p>
            <Link to="/" className="kayad-auth-secondary-action px-5 no-underline">Back to KAYARD KE</Link>
          </div>
        </PremiumAuthShell>
      );
    }
    if (outcome.kind === 'exists') {
      return (
        <PremiumAuthShell {...common} eyebrow="Existing account" title="This email already has an account." description="You can use it: sign in, finish verifying, or reset the password.">
          <div className="space-y-4">
            {outcome.afterUncertainty && <p className="m-0 text-sm text-[#12576D]" role="status">Your connection dropped on an earlier try, so we cannot tell whether this account is one you just created. If it is yours, sign in or resend the verification email; if not, use a different email.</p>}
            <div className="flex flex-wrap gap-3">
              <Link to={buildAuthPath('login', { next: destination, intent: role?.intent })} state={{ email: form.email.trim() }} className="kayad-auth-submit inline-flex items-center justify-center px-6 no-underline">Sign in</Link>
              <Link to="/forgot-password" className="kayad-auth-secondary-action px-5 no-underline">Reset password</Link>
              <button type="button" className="kayad-auth-secondary-action px-5" onClick={doResend} disabled={resend === 'sending'}>{resend === 'sending' ? 'Sending…' : 'Resend verification email'}</button>
            </div>
            {resend === 'sent' && <p className="kayad-auth-notice m-0" role="status">If that account exists and is not yet verified, a new link is on its way.</p>}
            {resend === 'failed' && <p className="kayad-auth-error m-0" role="alert">We could not send that just now. Please try again in a minute.</p>}
            {role && role.route !== 'account' && <p className="m-0 text-xs text-[#64748B]">Signing in with your existing account is how you continue as {role.title.toLowerCase()}; you do not need a second account.</p>}
            <button type="button" className="inline-flex min-h-[44px] items-center text-xs font-bold text-[#176B87] underline" onClick={() => setOutcome(null)}>Use a different email</button>
          </div>
        </PremiumAuthShell>
      );
    }
    if (outcome.kind === 'unavailable') {
      return (
        <PremiumAuthShell {...common} eyebrow="Temporarily unavailable" title="We couldn’t create your account right now." description="KAYARD KE answered, but registration is paused for a moment. Nothing was created.">
          <div className="space-y-4" role="alert">
            <p className="m-0 text-sm text-[#12576D]">Your details are still in the form. Please try again in a few minutes.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="kayad-auth-submit px-6" onClick={() => setOutcome(null)}>Go back and try again</button>
              <Link to="/" className="kayad-auth-secondary-action px-5 no-underline">Back to KAYARD KE</Link>
            </div>
          </div>
        </PremiumAuthShell>
      );
    }
    return (
      <PremiumAuthShell {...common} eyebrow="Connection problem" title="We couldn’t confirm that went through." description="Your connection dropped before we heard back, so we don’t know whether your details were received.">
        <div className="space-y-4" role="alert">
          <p className="m-0 text-sm text-[#12576D]">Nothing is duplicated if you try again: KAYARD KE refuses a second account or application for the same email. If you already received a verification email, you are done - just sign in.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="kayad-auth-submit px-6" onClick={() => setOutcome(null)}>Go back and try again</button>
            <Link to={buildAuthPath('login', { next: destination, intent: role?.intent })} state={{ email: form.email.trim() }} className="kayad-auth-secondary-action px-5 no-underline">I may already have an account</Link>
          </div>
        </div>
      </PremiumAuthShell>
    );
  }

  /* ---------- step 1: choose how you will use KAYAD ---------- */
  const rail = role ? { title: `What happens next: ${role.title.toLowerCase()}`, steps: role.steps, note: 'Staff and administrator accounts are provisioned by KAYARD KE and cannot be created here.' } : {
    title: 'How KAYARD KE accounts work',
    steps: [
      { title: 'Everyone starts with an email', body: 'Every account must verify its email before it can sign in.' },
      { title: 'Private selling is free and immediate', body: 'Every verified personal account can list a private vehicle without a package, seller application or administrator approval.' },
      { title: 'Business and professional access stays separate', body: 'Dealer verification, garage and inspection-company reviews, and professional qualifications retain their own approval processes.' },
    ],
    note: 'Staff and administrator accounts are provisioned by KAYARD KE and cannot be created here.',
  };

  if (!role) {
    return (
      <PremiumAuthShell mode="register" eyebrow="Create your account" title="Choose your KAYARD KE account" description="One personal account lets you buy and sell vehicles. Dealerships, garages, inspection companies and professionals apply for additional verified access." rail={rail}>
        <div role="radiogroup" aria-label="How you will use KAYARD KE" className="grid gap-3">
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
        <p className="mt-5 text-xs text-[#64748B]">Already have an account? <Link to={buildAuthPath('login', ctx)} className="font-black text-[#176B87] underline">Sign in</Link></p>
        {onClose && <button type="button" onClick={onClose} className="mt-3 inline-flex min-h-[44px] items-center px-2 text-xs font-bold text-[#64748B] underline">Not now</button>}
      </PremiumAuthShell>
    );
  }

  /* ---------- step 2: details ---------- */
  const isDealer = role.backendRole === 'dealer';
    const submitLabel = (role.id === 'garage_business' || role.id === 'inspection_company') ? 'Create account and continue' : 'Create account';
  const errorKeys = Object.keys(errors);

  return (
    <PremiumAuthShell mode="register" eyebrow={role.title} title='Create your account.' description={role.summary} rail={rail}>
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">{role.title} details</h2>
      <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-[#F6FAF9] px-4 py-3 text-xs text-[#64748B]">
        <span><strong className="text-[#0A3340]">{role.title}</strong> · {role.outcome}</span>
        {!inviteToken && <button type="button" className="inline-flex min-h-[44px] items-center px-2 font-black text-[#176B87] underline" onClick={() => { setRoleId(null); setMode(null); setErrors({}); setServerError(''); }}>Change</button>}
      </div>
      {inviteToken && invite?.status === 'loading' && <p className="mb-5 text-sm text-[#475569]" role="status" data-testid="register-invite-loading">Checking your invitation…</p>}
      {inviteToken && invite?.status === 'ok' && invite.state === 'valid' && (
        <div className="mb-5 rounded-xl border border-[#B8DDD8] bg-[#EEF8F6] p-4 text-sm text-[#0A3340]" role="status" data-testid="register-invite-banner">
          <strong>{invite.dealershipName}</strong> invited you to join their team as <strong>{String(invite.roleLabel || 'team member').replace(/_/g, ' ')}</strong>.
          <span className="mt-1 block text-xs text-[#475569]">Create your free personal account with the invited address. After you verify your e-mail and sign in, you will come back to the invitation to accept it.</span>
          {invite.accountStatus === 'personal' && <span className="mt-2 block text-xs text-[#7A2E0E]">This address already has an account. <Link to={buildAuthPath('login', { next: ctx.next })} className="font-black underline">Sign in instead</Link>.</span>}
        </div>
      )}
      {inviteToken && invite?.status === 'ok' && invite.state !== 'valid' && (
        <div className="mb-5 rounded-xl border border-[#FEDF89] bg-[#FFFAEB] p-4 text-sm text-[#7A2E0E]" role="alert" data-testid="register-invite-unusable">
          This invitation can no longer be used ({({ expired: 'it expired', cancelled: 'it was cancelled', accepted: 'it was already accepted', not_recognised: 'the link was replaced or is not recognised' } as Record<string, string>)[invite.state] || 'it is not valid'}). You can still create an account, then ask the dealership to send a new invitation.
        </div>
      )}
      {inviteToken && invite?.status === 'unavailable' && <p className="mb-5 text-sm text-[#7A2E0E]" role="alert" data-testid="register-invite-unavailable">We could not check the invitation just now. You can still register; your invitation link will bring you back to it afterwards.</p>}

      {role.id === 'professional' && (
        <fieldset className="mb-5 grid gap-3">
          <legend className="mb-2 text-sm font-black text-[#0A3340]">How do you work?</legend>
          {([
            ['independent', 'On my own', 'Create your personal account first, then submit inspector or mechanic credentials for KAYARD KE review.'],
            ['employed', 'For a garage or inspection company', 'Create an account, then ask the business to confirm you as staff. No separate KAYARD KE application.'],
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
          <TextField ref={(el) => { refs.current.email = el; }} label="Email" type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" error={errors.email} disabled={submitting} readOnly={inviteLocked} aria-readonly={inviteLocked || undefined} hint={inviteLocked ? 'Locked to the address the invitation was sent to.' : undefined} data-testid="register-email" />
          <TextField ref={(el) => { refs.current.phone = el; }} label="Phone" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" optional={!isDealer} hint={isDealer ? 'KAYARD KE uses this to reach you about your approval.' : undefined} error={errors.phone} disabled={submitting} />

          {isDealer && (
            <>
              <TextField ref={(el) => { refs.current.businessName = el; }} label="Dealership business name" value={form.businessName} onChange={set('businessName')} autoComplete="organization" error={errors.businessName} disabled={submitting} />
              <TextField ref={(el) => { refs.current.location = el; }} label="City or location" value={form.location} onChange={set('location')} autoComplete="address-level2" error={errors.location} disabled={submitting} />
            </>
          )}


          {(
            <PasswordField ref={(el) => { refs.current.password = el; }} label="Password" value={form.password} onChange={set('password')} autoComplete="new-password" showRules error={errors.password} disabled={submitting} />
          )}

          <p className="m-0 text-[11px] text-[#64748B]" data-testid="onboarding-consent">By continuing you agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#12576D] underline">Terms of Service</a> and the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#12576D] underline">Privacy Policy</a>.</p>
          <button type="submit" className="kayad-auth-submit" disabled={submitting}>{submitting ? <><span className="kayad-auth-spinner" aria-hidden="true" /> Working…</> : submitLabel}</button>
          <p className="m-0 text-[11px] text-[#64748B]"><Mail className="mr-1 inline h-3 w-3" aria-hidden="true" />We will email you a link to confirm your address.</p>
        </form>
      )}
    </PremiumAuthShell>
  );
}
