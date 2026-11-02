import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { dealerAPI } from '../../../api/api';

/**
 * Dealer Hub > System Management > Banking.
 * Banking is no longer collected during onboarding; dealers add or change their payout details here whenever they are ready.
 * Backed by GET/PUT /api/dealer/settlement (stored in dealers.payment_details). Empty field = clear it.
 */
interface BankingForm { bankName: string; accountName: string; accountNumber: string; paybillNumber: string; mpesaPhone: string }
const EMPTY: BankingForm = { bankName: '', accountName: '', accountNumber: '', paybillNumber: '', mpesaPhone: '' };
const KEYS = Object.keys(EMPTY) as (keyof BankingForm)[];

const inputCls = 'w-full px-3 py-2 border border-[#B9D3CF] rounded-lg text-sm text-[#0A3340] bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0A3340]';

export default function DealerBankingPanel() {
  const [form, setForm] = useState<BankingForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof BankingForm, string>>>({});
  const savingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    dealerAPI.getSettlement()
      .then((body: any) => {
        if (cancelled) return;
        const pd = body?.settlement?.paymentDetails || {};
        setForm({ ...EMPTY, ...Object.fromEntries(KEYS.map((k) => [k, typeof pd[k] === 'string' ? pd[k] : ''])) } as BankingForm);
      })
      .catch(() => { if (!cancelled) setLoadError('Could not load your banking details. Please try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [retry]);

  const set = (k: keyof BankingForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
    setSaveError(null);
    setFieldErrors((fe) => ({ ...fe, [k]: undefined }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    const errs: Partial<Record<keyof BankingForm, string>> = {};
    const bankParts = [form.bankName, form.accountName, form.accountNumber].map((v) => v.trim());
    if (bankParts.some(Boolean) && !bankParts.every(Boolean)) {
      if (!bankParts[0]) errs.bankName = 'Bank name is required with the account details';
      if (!bankParts[1]) errs.accountName = 'Account name is required with the account details';
      if (!bankParts[2]) errs.accountNumber = 'Account number is required with the account details';
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const paymentDetails = Object.fromEntries(KEYS.map((k) => [k, form[k].trim()]));
      await dealerAPI.updateSettlement({ paymentDetails });
      setSaved(true);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.errors && typeof data.errors === 'object') setFieldErrors(data.errors);
      setSaveError(data?.message || 'Could not save your banking details. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#176B87] animate-spin" aria-label="Loading banking details" /></div>;
  if (loadError) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[#64748B] mb-3" role="alert">{loadError}</p>
        <button type="button" onClick={() => setRetry((n) => n + 1)} className="text-xs font-bold text-[#176B87]">Try Again</button>
      </div>
    );
  }

  const field = (k: keyof BankingForm, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`banking-${k}`} className="block text-sm font-medium text-[#0A3340] mb-1">{label}</label>
      <input id={`banking-${k}`} className={inputCls} value={form[k]} onChange={set(k)} aria-invalid={!!fieldErrors[k]} aria-describedby={fieldErrors[k] ? `banking-${k}-err` : undefined} {...props} />
      {fieldErrors[k] && <p id={`banking-${k}-err`} className="text-xs text-red-600 mt-1">{fieldErrors[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-6" noValidate>
      <p className="text-sm text-[#64748B]">Where KAYAD sends your payouts. All fields are optional and you can change them at any time.</p>
      <fieldset className="space-y-3">
        <legend className="text-xs font-bold uppercase tracking-wide text-[#176B87] mb-2">Bank account</legend>
        {field('bankName', 'Bank name', { placeholder: 'e.g. Equity Bank', autoComplete: 'off' })}
        {field('accountName', 'Account name', { autoComplete: 'off' })}
        {field('accountNumber', 'Account number', { inputMode: 'numeric', autoComplete: 'off' })}
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-xs font-bold uppercase tracking-wide text-[#176B87] mb-2">M-Pesa</legend>
        {field('paybillNumber', 'Paybill / Till number', { inputMode: 'numeric', placeholder: 'e.g. 123456', autoComplete: 'off' })}
        {field('mpesaPhone', 'M-Pesa phone number', { inputMode: 'tel', placeholder: 'e.g. 0712 345 678', autoComplete: 'off' })}
      </fieldset>
      {saveError && <p role="alert" className="flex items-start gap-2 text-sm text-red-700"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />{saveError}</p>}
      {saved && <p role="status" className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="w-4 h-4" aria-hidden="true" />Banking details saved.</p>}
      <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#176B87] px-5 text-sm font-medium text-white hover:bg-[#12576D] disabled:opacity-60">
        {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}Save banking details
      </button>
    </form>
  );
}
