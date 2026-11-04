import React, { useEffect, useState } from 'react';
import { walletAPI } from '../../../api/api';

/** Dealer's own paybill/till used for auction bid commitments. Pending until KAYAD verifies it; credentials are write-only. */
export default function DealerCollectionAccountPanel() {
  const [account, setAccount] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ kind: 'paybill', shortcode: '', tillNumber: '', consumerKey: '', consumerSecret: '', passkey: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { walletAPI.dealerAccount().then((d: any) => setAccount(d.account)).catch(() => {}).finally(() => setLoaded(true)); }, []);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (saving) return; setSaving(true); setMsg(null);
    try { const d: any = await walletAPI.saveDealerAccount(form); setAccount(d.account); setForm((f) => ({ ...f, consumerKey: '', consumerSecret: '', passkey: '' })); setMsg('Saved. KAYAD will verify it before bidders can pay into it.'); }
    catch (err: any) { setMsg(err?.response?.data?.message || 'Could not save.'); } finally { setSaving(false); }
  };
  const cls = 'mt-1 block min-h-11 w-full rounded-lg border border-[#B9D3CF] px-3 text-sm';
  return (
    <section aria-label="Auction commitment account" className="mt-6 space-y-3">
      <h3 className="text-base font-semibold text-[#0A3340]">Auction commitment account</h3>
      <p className="text-sm text-[#64748B]">Bidders&rsquo; commitment fees go straight to this paybill or till once KAYAD verifies it. Until then, KAYAD holds them. Private sellers cannot use this.</p>
      {loaded && account && <p className="text-sm" data-testid="dealer-account-status">Current: {account.kind} {account.shortcode} — <strong>{account.status}</strong></p>}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Type<select className={cls} value={form.kind} onChange={set('kind')}><option value="paybill">Paybill</option><option value="till">Till (Buy Goods)</option></select></label>
        <label className="text-sm">{form.kind === 'till' ? 'Head-office shortcode' : 'Paybill number'}<input className={cls} inputMode="numeric" value={form.shortcode} onChange={set('shortcode')} required /></label>
        {form.kind === 'till' && <label className="text-sm">Till number<input className={cls} inputMode="numeric" value={form.tillNumber} onChange={set('tillNumber')} required /></label>}
        <label className="text-sm">Daraja consumer key<input className={cls} type="password" autoComplete="off" value={form.consumerKey} onChange={set('consumerKey')} required /></label>
        <label className="text-sm">Daraja consumer secret<input className={cls} type="password" autoComplete="off" value={form.consumerSecret} onChange={set('consumerSecret')} required /></label>
        <label className="text-sm">Daraja passkey<input className={cls} type="password" autoComplete="off" value={form.passkey} onChange={set('passkey')} required /></label>
        <div className="sm:col-span-2"><button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-[#176B87] px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save for verification'}</button></div>
      </form>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </section>
  );
}
