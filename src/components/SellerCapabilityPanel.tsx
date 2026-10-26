import React, { useState } from 'react';
import { ClipboardCheck, ShieldCheck, ShieldAlert, Clock, LayoutDashboard } from 'lucide-react';
import { applyForPrivateSelling, type SellerCapability } from '../services/privateSellerCapabilityApi';

type Props = {
  capability: SellerCapability | null;
  loading: boolean;
  error: string;
  onReload: () => void;
  onOpenWorkspace: () => void;
};

const errorText = (e: unknown) => {
  const msg = (e as { message?: string })?.message;
  return msg && msg.length < 200 ? msg : 'The application could not be submitted. Please try again.';
};

/** Seller section of the single personal dashboard. Shows the REAL seller state; buyer sections are never replaced by it. */
export default function SellerCapabilityPanel({ capability, loading, error, onReload, onOpenWorkspace }: Props) {
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (busy) return;
    setBusy(true); setFormError('');
    try { await applyForPrivateSelling({ contactPhone: phone, intendedUse: note || undefined, acceptTerms: true }); onReload(); }
    catch (e) { setFormError(errorText(e)); }
    finally { setBusy(false); }
  };

  const shell = (children: React.ReactNode, tone = 'border-[#D7E7E4] bg-white') => (
    <section aria-labelledby="seller-capability-heading" data-testid="seller-capability-panel" className={`rounded-2xl border p-5 ${tone}`}>
      <h2 id="seller-capability-heading" className="text-sm font-black text-[#0A3340]">Private selling</h2>
      {children}
    </section>
  );

  if (loading && !capability) return shell(<p role="status" className="mt-2 text-xs text-[#64748B]">Loading your seller status…</p>);
  if (error && !capability) return shell(<div role="alert" className="mt-2 text-xs text-[#0A3340]">{error} <button type="button" onClick={onReload} className="font-bold underline">Retry</button></div>);
  if (!capability || capability.status === 'not_applicable') return null;

  const { status } = capability;
  const reason = capability.application?.reviewReason;

  if (status === 'approved') {
    return shell(<div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 text-xs text-[#0A3340]"><ShieldCheck size={16} aria-hidden="true" /> Your private-seller access is approved. You can list and manage your own vehicles from this same account.</p>
      <button type="button" onClick={onOpenWorkspace} className="inline-flex items-center gap-2 rounded-xl bg-[#0A3340] px-3 py-2 text-xs font-bold text-white"><LayoutDashboard size={14} aria-hidden="true" /> Open seller workspace</button>
    </div>);
  }
  if (status === 'pending') {
    return shell(<p className="mt-2 flex items-center gap-2 text-xs text-[#0A3340]" role="status"><Clock size={16} aria-hidden="true" /> Your application is pending review. You can keep buying and bidding as normal; selling tools unlock after approval.</p>);
  }
  if (status === 'suspended' || status === 'revoked') {
    return shell(<p className="mt-2 flex items-start gap-2 text-xs text-[#0A3340]" role="status"><ShieldAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> Your private-seller access is {status}. Selling actions are unavailable; your buyer account is not affected. Public listings that were live when this status changed are hidden until an authorized administrator restores approval; records and ownership are preserved.{reason ? ` Reason: ${reason}` : ''}</p>, 'border-[#F2D6A2] bg-[#FFFAF0]');
  }

  // Phase 13I: the server decides who may apply (`canApply`: personal `user` accounts that are 'none' or 'rejected'). A legacy
  // individual_seller whose application was rejected must NOT be shown a form the server will refuse; a status of 'none' with
  // canApply=false (account type that cannot apply) shows nothing.
  if (!capability.canApply) {
    if (status !== 'rejected') return null;
    return shell(<p className="mt-2 flex items-start gap-2 text-xs text-[#0A3340]" role="status"><ShieldAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> Your seller application was not approved.{reason ? ` Reason: ${reason}` : ''} This account cannot reapply online; contact support and an administrator can review it again. Buying is unaffected.</p>, 'border-[#F2D6A2] bg-[#FFFAF0]');
  }

  // none | rejected -> application form
  return shell(<>
    {status === 'rejected' && <p className="mt-2 flex items-start gap-2 text-xs text-[#0A3340]" role="status"><ShieldAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> Your last application was not approved.{reason ? ` Reason: ${reason}` : ''} You can apply again; buying is unaffected.</p>}
    <p className="mt-2 text-xs text-[#64748B]">Want to sell a vehicle? Apply with this same account – no second account needed.</p>
    <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2" noValidate>
      <label className="text-xs font-bold text-[#0A3340]">Contact phone
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" required className="mt-1 w-full rounded-xl border border-[#D7E7E4] px-3 py-2 text-sm font-normal" placeholder="+254712345678" />
      </label>
      <label className="text-xs font-bold text-[#0A3340]">What will you sell? (optional)
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="mt-1 w-full rounded-xl border border-[#D7E7E4] px-3 py-2 text-sm font-normal" />
      </label>
      <label className="flex items-start gap-2 text-xs text-[#0A3340] sm:col-span-2"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5" /> I confirm the vehicles I list are mine to sell and accept the KAYAD seller terms.</label>
      {formError && <p role="alert" className="text-xs font-bold text-rose-700 sm:col-span-2">{formError}</p>}
      <div className="sm:col-span-2"><button type="submit" disabled={busy || !terms || phone.trim().length < 9} className="inline-flex items-center gap-2 rounded-xl bg-[#0A3340] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><ClipboardCheck size={14} aria-hidden="true" /> {busy ? 'Submitting…' : 'Apply to sell'}</button></div>
    </form>
  </>);
}
