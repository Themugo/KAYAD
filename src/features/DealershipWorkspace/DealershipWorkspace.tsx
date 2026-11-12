import React, { useEffect, useState } from 'react';
import { Car, MessageSquare, Users, ArrowLeft } from 'lucide-react';
import { useMyDealership, resetMyDealershipCache } from './useMyDealership';
import { getInventory, getLeads, getCustomers, updateLead } from '../../services/dealerPlatformApi';

type Props = { user: any; onNavigate: (nav: string) => void; onOpenAuth?: () => void };
type Tab = 'inventory' | 'leads' | 'customers';

const has = (perms: string[], any: string[]) => any.some((p) => perms.includes(p));
const STAGES = ['new', 'contacted', 'viewing', 'negotiating', 'sold', 'lost'];

function useList<T>(load: () => Promise<T[]>, enabled: boolean) {
  const [s, setS] = useState<{ loading: boolean; items: T[]; error: string | null }>({ loading: enabled, items: [], error: null });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setS((x) => ({ ...x, loading: true, error: null }));
    load().then((items) => live && setS({ loading: false, items, error: null }))
      .catch((e: any) => live && setS({ loading: false, items: [], error: e?.response?.status === 403 ? 'Your dealership has not given you access to this.' : 'Could not load this right now.' }));
    return () => { live = false; };
  }, [enabled, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...s, reload: () => setN((v) => v + 1) };
}

export default function DealershipWorkspace({ user, onNavigate, onOpenAuth }: Props) {
  const { loading, membership, ambiguous } = useMyDealership(user?.id, user?.role);
  const perms = membership?.permissions || [];
  const canInv = has(perms, ['canListCars', 'canEditCars', 'canDeleteCars']);
  const canLeads = has(perms, ['canChatBuyers']);
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    ...(canInv ? [{ id: 'inventory' as Tab, label: 'Inventory', icon: Car }] : []),
    ...(canLeads ? [{ id: 'leads' as Tab, label: 'Leads', icon: MessageSquare }, { id: 'customers' as Tab, label: 'Customers', icon: Users }] : []),
  ];
  const [tab, setTab] = useState<Tab | null>(null);
  const active = tab && tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id ?? null;

  const inv = useList<any>(async () => (await getInventory({ limit: 50 })).items || [], !!membership && active === 'inventory');
  const leads = useList<any>(async () => ((await getLeads({ limit: 50 }))?.data?.items) || [], !!membership && active === 'leads');
  const customers = useList<any>(async () => { const r = await getCustomers(); return r?.data?.items || r?.data || r?.customers || []; }, !!membership && active === 'customers');
  const [leadError, setLeadError] = useState<string | null>(null);

  if (!user) return (<main className="mx-auto max-w-3xl p-6"><p>Sign in to open your dealership workspace.</p><button className="mt-3 rounded-lg bg-[#0A3340] px-4 py-2 text-white" onClick={() => onOpenAuth?.()}>Sign in</button></main>);
  if (loading) return <main className="mx-auto max-w-3xl p-6" role="status">Loading your dealership access…</main>;
  if (!membership) return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-black text-[#0A3340]">Dealership workspace</h1>
      <p role="status" className="mt-3 text-sm text-[#475569]">
        {ambiguous ? 'Your account belongs to more than one dealership. Ask the dealership owner to contact KAYAD support so we can set which one you work for.' : 'You do not currently work for a dealership. If a dealership invited you, open the invitation link from your e-mail while signed in with the invited address. If your access was removed, the dealership owner can invite you again.'}
      </p>
      <button className="mt-4 rounded-lg border border-[#D7E7E4] px-4 py-2 text-sm font-bold" onClick={() => { resetMyDealershipCache(); onNavigate('dashboard'); }}>Back to my dashboard</button>
    </main>
  );

  const changeStage = async (id: string, stage: string) => {
    setLeadError(null);
    try { await updateLead(id, { stage }); leads.reload(); } catch (e: any) { setLeadError(e?.response?.status === 403 ? 'You do not have permission to change this lead.' : 'The lead could not be updated.'); }
  };
  const List = ({ s, render, empty }: { s: { loading: boolean; items: any[]; error: string | null }; render: (x: any) => React.ReactNode; empty: string }) => (
    s.loading ? <p role="status">Loading…</p> : s.error ? <p role="alert" className="text-sm text-[#7A271A]">{s.error}</p> : s.items.length === 0 ? <p className="text-sm text-[#64748B]">{empty}</p> :
      <ul className="divide-y divide-[#E2EEEC] rounded-xl border border-[#D7E7E4] bg-white">{s.items.map((x) => <li key={x.id || x._id} className="p-3 text-sm">{render(x)}</li>)}</ul>
  );

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <button className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-[#12576D]" onClick={() => onNavigate('dashboard')}><ArrowLeft size={14} /> My personal dashboard</button>
      <header className="mb-4 rounded-2xl border border-[#D7E7E4] bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">Dealership workspace</p>
        <h1 className="text-xl font-black text-[#0A3340]">{membership.dealershipName}</h1>
        <p className="mt-1 text-xs text-[#64748B]">You are signed in with your personal account and working as <strong>{membership.teamRole.replace(/_/g, ' ')}</strong>. What you can do follows the permissions the dealership gave you. Payments, settings, banking and team management stay with the owner.</p>
      </header>
      {tabs.length === 0 ? <p role="status" className="text-sm text-[#475569]">The dealership has not given you any workspace permissions yet. Ask the owner to update your role.</p> : (
        <>
          <div role="tablist" aria-label="Dealership sections" className="mb-4 flex gap-2">
            {tabs.map((t) => { const I = t.icon; return <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black ${active === t.id ? 'bg-[#0A3340] text-white' : 'border border-[#D7E7E4] text-[#12576D]'}`}><I size={14} />{t.label}</button>; })}
          </div>
          {active === 'inventory' && <List s={inv} empty="No vehicles listed yet." render={(c) => <div className="flex justify-between gap-3"><span className="font-bold">{c.title || [c.make, c.model, c.year].filter(Boolean).join(' ') || 'Vehicle'}</span><span className="text-[#64748B]">{c.status || ''}{c.price ? ` · KES ${Number(c.price).toLocaleString()}` : ''}</span></div>} />}
          {active === 'leads' && (<>{leadError && <p role="alert" className="mb-2 text-sm text-[#7A271A]">{leadError}</p>}<List s={leads} empty="No enquiries yet." render={(l) => <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold">{l.buyerName || l.name || 'Buyer enquiry'}{l.carTitle ? ` — ${l.carTitle}` : ''}</span><label className="text-xs">Stage <select aria-label="Lead stage" className="ml-1 rounded border border-[#D7E7E4] p-1" value={l.stage || 'new'} onChange={(e) => changeStage(l.id || l._id, e.target.value)}>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label></div>} /></>)}
          {active === 'customers' && <List s={customers} empty="No customers yet." render={(c) => <span className="font-bold">{c.name || c.buyerName || 'Customer'}</span>} />}
        </>
      )}
    </main>
  );
}
