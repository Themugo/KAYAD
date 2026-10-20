import React, { useCallback, useEffect, useRef, useState } from 'react';

/** Server message if there is one, otherwise a plain sentence. Never shows stack traces or raw error objects. */
export const reason = (e: any): string => e?.response?.data?.message || (typeof e?.message === 'string' && e.message.length < 200 ? e.message : '') || 'The request could not be completed.';
export const httpStatus = (e: any): number | undefined => e?.response?.status;

export function useLoader<T>(fn: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const seq = useRef(0);
  const run = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true); setError(null);
    try { const d = await fn(); if (mine === seq.current) setData(d); }
    catch (e) { if (mine === seq.current) setError(e); }
    finally { if (mine === seq.current) setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { void run(); }, [run]);
  return { data, loading, error, reload: run };
}

export const Loading: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <p role="status" className="rounded-xl border border-[#D7E7E4] bg-white p-6 text-sm text-[#64748B]">{label}</p>
);
export const ErrorBox: React.FC<{ error: any; what: string; onRetry?: () => void }> = ({ error, what, onRetry }) => (
  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <span>{httpStatus(error) === 403 || httpStatus(error) === 404 ? `You do not have access to ${what}.` : `We could not load ${what}. ${reason(error)}`}</span>
    {onRetry && <button type="button" onClick={onRetry} className="self-start min-h-[44px] rounded-lg border border-rose-300 px-3 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Retry</button>}
  </div>
);
export const Empty: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className="rounded-xl border border-dashed border-[#BDE5DE] bg-white p-8 text-center">
    <p className="font-semibold text-[#0A3340]">{title}</p>
    {hint && <p className="mt-1 text-sm text-[#64748B]">{hint}</p>}
  </div>
);
export const Notice: React.FC<{ msg: { kind: 'ok' | 'error'; text: string } | null }> = ({ msg }) =>
  msg ? <p role={msg.kind === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${msg.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>{msg.text}</p> : null;

export const field = 'w-full px-3 py-2.5 bg-white border border-[#BDE5DE] rounded-lg text-sm min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#13B8A6]';
export const btn = 'inline-flex items-center justify-center min-h-[44px] rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13B8A6] disabled:opacity-50 disabled:cursor-not-allowed';
export const btnPrimary = `${btn} bg-[#12576D] text-white hover:bg-[#0E4558]`;
export const btnGhost = `${btn} border border-[#BDE5DE] bg-white text-[#0A3340] hover:bg-[#F3FAF9]`;
export const btnDanger = `${btn} border border-rose-300 bg-white text-rose-800 hover:bg-rose-50`;

export const Pill: React.FC<{ tone?: 'ok' | 'warn' | 'bad' | 'neutral'; children: React.ReactNode }> = ({ tone = 'neutral', children }) => {
  const cls = { ok: 'bg-emerald-50 border-emerald-300 text-emerald-900', warn: 'bg-slate-50 border-slate-300 text-slate-900', bad: 'bg-rose-50 border-rose-300 text-rose-900', neutral: 'bg-[#F3FAF9] border-[#BDE5DE] text-[#0A3340]' }[tone];
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
};

/** Runs a mutation with a busy flag and a visible, accessible outcome; reloads on success. */
export function useAction(onDone: () => void | Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ kind: 'ok', text: ok }); await onDone(); return true; }
    catch (e) { setMsg({ kind: 'error', text: reason(e) }); return false; }
    finally { setBusy(false); }
  };
  return { busy, msg, run, setMsg };
}
export const money = (v: number | string | null | undefined, currency = 'KES') => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? '—' : `${currency} ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
