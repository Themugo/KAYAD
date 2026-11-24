import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { adminAPI } from '../../api/api';
import { getPersonalAccounts, type PersonalAccountRow } from '../../services/privateSellerCapabilityApi';
import AdminPrivateSellerApplications from './AdminPrivateSellerApplications';

const PAGE_SIZE = 25;
type Tab = 'accounts' | 'applications';

const fmt = (v?: string | null) => { if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-KE', { dateStyle: 'medium' }); };
const errorText = (e: unknown) => {
  const s = (e as { status?: number } | null)?.status;
  if (s === 401) return 'Your session may have expired. Sign in again, then retry.';
  if (s === 403) return 'Your account is not authorised to view personal accounts.';
  if (s === 503) return 'The service is temporarily unavailable. Try again shortly.';
  if (s && s >= 500) return 'The server could not load personal accounts. Try again shortly.';
  return e instanceof Error && e.message ? e.message : 'Personal accounts could not be loaded. Check your connection and try again.';
};

function AccountsList() {
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [state, setState] = useState<'all' | 'active' | 'restricted'>('all');
  const [verified, setVerified] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PersonalAccountRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true); setError(null);
    try {
      const data = await getPersonalAccounts({ q: query, state, verified, page, limit: PAGE_SIZE });
      if (mine !== seq.current) return;
      setRows(data.accounts); setTotal(data.total);
    } catch (e) {
      if (mine !== seq.current) return;
      setError(errorText(e)); setRows([]);
    } finally { if (mine === seq.current) setLoading(false); }
  }, [query, state, verified, page]);
  useEffect(() => { void load(); return () => { seq.current += 1; }; }, [load]);

  const toggle = async (a: PersonalAccountRow) => {
    const restrict = a.accountState === 'active';
    if (!window.confirm(restrict
      ? `Suspend ${a.email || 'this account'}? The person can no longer use the account. Listings, ownership and history are kept.`
      : `Restore ${a.email || 'this account'}? Access returns; nothing is deleted or recreated.`)) return;
    setBusyId(a.id);
    try {
      await adminAPI.toggleBan(a.id, restrict);
      toast(restrict ? 'Personal account suspended.' : 'Personal account restored.', 'success');
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The change could not be saved.', 'error');
      await load();
    } finally { setBusyId(null); }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <section aria-label="Personal accounts" className="space-y-4">
      <form role="search" aria-label="Search personal accounts" className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(q); }}>
        <label className="flex min-w-[14rem] flex-1 flex-col text-xs font-bold text-[#37616A]">Search name or email
          <span className="mt-1 flex items-center gap-2 rounded-xl border border-[#D7E7E4] bg-white px-3"><Search size={14} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} className="min-h-10 flex-1 bg-transparent text-sm outline-none" maxLength={80} /></span>
        </label>
        <label className="flex flex-col text-xs font-bold text-[#37616A]">Account status
          <select value={state} onChange={(e) => { setState(e.target.value as typeof state); setPage(1); }} className="mt-1 min-h-10 rounded-xl border border-[#D7E7E4] bg-white px-3 text-sm"><option value="all">All</option><option value="active">Active</option><option value="restricted">Suspended</option></select>
        </label>
        <label className="flex flex-col text-xs font-bold text-[#37616A]">Email
          <select value={verified} onChange={(e) => { setVerified(e.target.value as typeof verified); setPage(1); }} className="mt-1 min-h-10 rounded-xl border border-[#D7E7E4] bg-white px-3 text-sm"><option value="all">Any</option><option value="true">Verified</option><option value="false">Not verified</option></select>
        </label>
        <button type="submit" className="min-h-10 rounded-xl bg-[#0A3340] px-4 text-sm font-bold text-white">Search</button>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#D7E7E4] bg-white px-4 text-sm font-bold text-[#0A3340] disabled:opacity-60"><RefreshCw size={14} aria-hidden="true" />Refresh</button>
      </form>
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertTriangle size={18} aria-hidden="true" /><div><p className="font-bold">Could not load personal accounts</p><p>{error}</p></div></div>}
      <div className="overflow-x-auto rounded-2xl border border-[#D7E7E4] bg-white shadow-sm">
        {loading ? <p role="status" className="p-8 text-center text-sm text-[#64748B]">Loading personal accounts…</p>
          : !error && rows.length === 0 ? <div className="p-8 text-center"><h2 className="font-bold text-[#0A3340]">No personal accounts match</h2><p className="mt-1 text-sm text-[#64748B]">Adjust the search or filters.</p></div>
          : rows.length > 0 ? (
            <table className="w-full min-w-[56rem] text-left text-sm">
              <caption className="sr-only">Personal accounts: type, account status, email verification, listings and any historical application record</caption>
              <thead className="bg-[#F4F9F8] text-xs uppercase text-[#37616A]"><tr>
                <th scope="col" className="p-3">Account</th><th scope="col" className="p-3">Type</th><th scope="col" className="p-3">Account status</th><th scope="col" className="p-3">Email</th><th scope="col" className="p-3">Listings</th><th scope="col" className="p-3">Historical application</th><th scope="col" className="p-3">Action</th></tr></thead>
              <tbody className="divide-y divide-[#E7EFEE]">
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="p-3"><div className="font-bold text-[#0A3340]">{a.name || 'Name not provided'}</div><div className="text-xs text-[#64748B]">{a.email || '—'}</div><div className="text-xs text-[#64748B]">Joined {fmt(a.createdAt)}</div></td>
                    <td className="p-3">{a.accountType === 'personal' ? 'Personal account' : 'Personal account (legacy seller record)'}</td>
                    <td className="p-3"><span className={`rounded-full border px-2 py-1 text-[11px] font-extrabold ${a.accountState === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{a.accountState === 'active' ? 'Active' : 'Suspended'}</span>
                      {a.legacyRecordStatus && <div className="mt-1 text-[11px] text-[#64748B]">Legacy record status “{a.legacyRecordStatus}” — not an approval gate. Personal accounts sell without approval.</div>}</td>
                    <td className="p-3">{a.emailVerified ? 'Verified' : 'Not verified'}</td>
                    <td className="p-3">{a.listings.total} total · {a.listings.published} published</td>
                    <td className="p-3">{a.historicalApplication ? `${a.historicalApplication.status} (${a.historicalApplication.source === 'legacy_backfill' ? 'legacy' : 'application'})` : 'None on record'}</td>
                    <td className="p-3"><button type="button" disabled={busyId === a.id} onClick={() => void toggle(a)} aria-label={`${a.accountState === 'active' ? 'Suspend' : 'Restore'} ${a.email || a.name || 'account'}`} className="min-h-9 rounded-lg border border-[#D7E7E4] px-3 text-xs font-bold text-[#0A3340] disabled:opacity-50">{a.accountState === 'active' ? 'Suspend' : 'Restore'}</button></td>
                  </tr>))}
              </tbody>
            </table>) : null}
      </div>
      <nav aria-label="Personal accounts pages" className="flex items-center justify-between text-sm text-[#37616A]">
        <span aria-live="polite">{total} account{total === 1 ? '' : 's'} · page {Math.min(page, pages)} of {pages}</span>
        <span className="flex gap-2">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className="min-h-9 rounded-lg border border-[#D7E7E4] px-3 font-bold disabled:opacity-40">Previous</button>
          <button type="button" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)} className="min-h-9 rounded-lg border border-[#D7E7E4] px-3 font-bold disabled:opacity-40">Next</button>
        </span>
      </nav>
    </section>
  );
}

export default function AdminPersonalAccounts() {
  const [tab, setTab] = useState<Tab>('accounts');
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
      <header className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#176B87]">Account governance</p>
        <h1 className="mt-1 text-2xl font-black text-[#0A3340]">Personal accounts</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#64748B]">One personal account buys and sells for free. No application or approval is needed to publish a vehicle. This page lists the accounts themselves and keeps suspend and restore controls; historical selling applications are a separate record. Dealers are managed under Dealers.</p>
      </header>
      <div role="tablist" aria-label="Personal accounts views" className="mb-4 flex gap-2">
        {([['accounts', 'Accounts'], ['applications', 'Historical applications']] as const).map(([id, label]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} aria-controls={`pa-panel-${id}`} id={`pa-tab-${id}`} onClick={() => setTab(id)} className={`min-h-10 rounded-full border px-4 text-sm font-bold ${tab === id ? 'border-[#0A3340] bg-[#0A3340] text-white' : 'border-[#D7E7E4] bg-white text-[#0A3340]'}`}>{label}</button>
        ))}
      </div>
      <div role="tabpanel" id={`pa-panel-${tab}`} aria-labelledby={`pa-tab-${tab}`}>
        {tab === 'accounts' ? <AccountsList /> : <AdminPrivateSellerApplications />}
      </div>
    </div>
  );
}
