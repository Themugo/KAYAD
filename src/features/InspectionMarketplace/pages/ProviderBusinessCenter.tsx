import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle, BarChart3, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronRight,
  ClipboardCheck, Clock3, CreditCard, FileCheck2, FileText, Gauge, MapPin, Plus,
  Settings2, ShieldCheck, Star, Users, Wrench, XCircle,
} from 'lucide-react';
import { inspectionApi, inspectionBusinessCenterApi as api } from '../services/api';

const C = {
  ink: '#0A3340',
  teal: '#176B87',
  mint: '#17B8A6',
  pale: '#EEF7F5',
  white: '#FFFFFF',
  slate: '#667985',
  gold: '#F4B41A',
  red: '#D65A5A',
  blue: '#4C8DDA',
};

type Tab = 'overview' | 'bookings' | 'team' | 'reports' | 'customers' | 'finance' | 'growth' | 'settings';

export default function ProviderBusinessCenter({ providerId: providedProviderId, onExit }: { providerId?: string; onExit?: () => void }) {
  const [providerId, setProviderId] = useState(providedProviderId || '');
  const [provider, setProvider] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [dashboard, setDashboard] = useState<any>(null);
  const [attention, setAttention] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = providedProviderId ? null : await api.getMe();
        const id = providedProviderId || me?.provider?.id;
        if (!id) throw new Error('No inspection provider account is attached to this user.');
        if (cancelled) return;
        setProviderId(id);
        if (me?.provider) setProvider(me.provider);
        const [dash, needs] = await Promise.all([api.getDashboard(id), api.getAttention(id)]);
        if (cancelled) return;
        setDashboard(dash);
        setAttention(Array.isArray(needs) ? needs : needs?.items || []);
        if (!me?.provider) {
          const profile = await api.getProfile(id);
          if (!cancelled) setProvider(profile);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not load the inspection business center.');
      }
    })();
    return () => { cancelled = true; };
  }, [providedProviderId]);

  const nav = [
    ['overview', 'Overview', Gauge], ['bookings', 'Bookings', CalendarDays], ['team', 'Team', Users],
    ['reports', 'Reports', FileCheck2], ['customers', 'Customers', BriefcaseBusiness],
    ['finance', 'Finance', CreditCard], ['growth', 'Growth', BarChart3], ['settings', 'Business', Settings2],
  ] as const;

  if (error) return <BusinessError message={error} onExit={onExit} />;
  if (!dashboard || !providerId) return <div className="min-h-screen grid place-items-center" style={{ background: C.pale }}><div className="animate-pulse rounded-2xl p-8 bg-white text-slate-500">Loading inspection business center…</div></div>;

  return (
    <div className="min-h-screen" style={{ background: C.pale }}>
      <header className="sticky top-0 z-20 border-b" style={{ background: 'rgba(255,255,255,.96)', borderColor: '#D9E8E7', backdropFilter: 'blur(14px)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.18em]" style={{ color: C.teal }}>
              <ShieldCheck size={14} /> KAYAD Inspection Business
            </div>
            <div className="font-black text-xl truncate" style={{ color: C.ink }}>{provider?.companyName || provider?.company_name || 'Inspection Provider'}</div>
          </div>
          <div className="flex items-center gap-2">
            {onExit && <button onClick={onExit} className="px-3 py-2 rounded-xl text-sm font-bold" style={{ color: C.teal }}>Marketplace</button>}
            <button onClick={() => setTab('settings')} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white" style={{ background: C.ink }}><Settings2 size={16}/> Manage business</button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 md:px-6 pb-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {nav.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap" style={{ background: tab === id ? C.ink : C.white, color: tab === id ? C.white : C.slate, border: `1px solid ${tab === id ? C.ink : '#D9E8E7'}` }}><Icon size={15}/>{label}</button>)}
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24">
        {tab === 'overview' && <Overview dashboard={dashboard} attention={attention} onTab={setTab} />}
        {tab === 'bookings' && <Bookings providerId={providerId} />}
        {tab === 'team' && <Team providerId={providerId} />}
        {tab === 'reports' && <Reports providerId={providerId} />}
        {tab === 'customers' && <Customers providerId={providerId} />}
        {tab === 'finance' && <Finance providerId={providerId} />}
        {tab === 'growth' && <Growth providerId={providerId} />}
        {tab === 'settings' && <BusinessSettings providerId={providerId} provider={provider} onSaved={setProvider} />}
      </main>
    </div>
  );
}

function Overview({ dashboard, attention, onTab }: { dashboard: any; attention: any[]; onTab: (tab: Tab) => void }) {
  const s = dashboard.summary || {};
  const q = dashboard.quickStats || {};
  const kpis = [
    ['Today\'s jobs', s.todaysJobs ?? 0, CalendarDays, C.teal], ['Awaiting assignment', s.jobsAwaitingAssignment ?? 0, Wrench, C.gold],
    ['Engineers on duty', s.engineersOnDuty ?? 0, Users, C.mint], ['Reports in QA', s.reportsInQA ?? 0, FileCheck2, C.blue],
    ['Revenue today', `KES ${Number(s.revenueToday || 0).toLocaleString()}`, CreditCard, C.teal],
    ['Monthly revenue', `KES ${Number(s.monthlyRevenue || 0).toLocaleString()}`, BarChart3, C.mint],
    ['Customer rating', Number(s.averageRating || 0).toFixed(1), Star, C.gold], ['Quality alerts', s.qualityAlerts ?? 0, AlertTriangle, s.qualityAlerts ? C.red : C.mint],
  ];
  return <div className="space-y-6">
    <section className="rounded-3xl p-6 md:p-8 text-white overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.ink}, ${C.teal})` }}>
      <div className="max-w-3xl"><div className="text-[11px] font-black uppercase tracking-[.2em] text-cyan-100">Inspection operations command center</div><h1 className="text-3xl md:text-4xl font-black mt-2">Run the inspection business, not just the next job.</h1><p className="mt-3 text-white/75 max-w-2xl">Bookings, people, quality, reports, customer relationships and settlement visibility in one operational surface.</p></div>
    </section>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{kpis.map(([label, value, Icon, color]) => <Kpi key={String(label)} label={String(label)} value={String(value)} Icon={Icon as any} color={String(color)}/>)}</div>
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
      <Panel title="Upcoming work" icon={CalendarDays} action="Bookings" onAction={() => onTab('bookings')}>
        <div className="space-y-2">{(dashboard.upcomingJobs || []).slice(0, 6).map((job: any) => <div key={job.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl" style={{ background: C.pale }}><div className="min-w-0"><div className="font-bold truncate" style={{ color: C.ink }}>{job.vehicle || 'Vehicle inspection'}</div><div className="text-xs" style={{ color: C.slate }}>{job.reference} · {job.county || 'Location'} · {job.scheduledDate} {job.scheduledTime}</div></div><StatusPill status={job.status}/></div>)}</div>
        {!dashboard.upcomingJobs?.length && <Empty icon={CalendarDays} text="No upcoming inspection jobs."/>}
      </Panel>
      <Panel title="Needs attention" icon={AlertTriangle} action="Open bookings" onAction={() => onTab('bookings')}>
        {attention.length ? <div className="space-y-2">{attention.slice(0, 6).map((a: any, i) => <div key={a.id || i} className="p-3 rounded-2xl border" style={{ borderColor: '#F0D6A0', background: '#FFF9EC' }}><div className="font-bold text-sm" style={{ color: C.ink }}>{a.title || a.reference || 'Inspection requires attention'}</div><div className="text-xs mt-1" style={{ color: C.slate }}>{a.reason || a.status || 'Review this inspection job.'}</div></div>)}</div> : <Empty icon={CheckCircle2} text="Nothing urgent is waiting."/>}
      </Panel>
    </div>
    <div className="grid md:grid-cols-3 gap-4"><QuickAction icon={Users} title="Build your team" text="Manage engineers, skills and availability." onClick={() => onTab('team')}/><QuickAction icon={FileCheck2} title="Protect report quality" text="Review, correct and approve reports." onClick={() => onTab('reports')}/><QuickAction icon={BarChart3} title="Grow the business" text="Track customers, revenue and demand." onClick={() => onTab('growth')}/></div>
  </div>;
}

function Bookings({ providerId }: { providerId: string }) {
  const [items, setItems] = useState<any[]>([]); const [board, setBoard] = useState<any>(null); const [loading, setLoading] = useState(true); const [filter, setFilter] = useState('');
  const load = async () => { setLoading(true); try { const [r,b] = await Promise.all([api.getBookings(providerId, filter ? { status: filter } : {}), api.getBookingBoard(providerId)]); setItems(r?.items || r?.data?.items || []); setBoard(b); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [providerId, filter]);
  const stages = board ? Object.values(board) as any[] : [];
  return <div className="space-y-5">
    <SectionHeader eyebrow="Operations" title="Booking control" text="Accept, assign, move and complete every inspection without losing the lifecycle." />
    <div className="flex gap-2 overflow-x-auto">{['','booked','confirmed','inspector_assigned','travelling','inspection_started','inspection_complete','report_generated','closed'].map(s => <button key={s} onClick={() => setFilter(s)} className="px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap" style={{ background: filter === s ? C.ink : C.white, color: filter === s ? C.white : C.slate, border: `1px solid ${filter === s ? C.ink : '#D9E8E7'}` }}>{s ? s.replaceAll('_',' ') : 'All jobs'}</button>)}</div>
    {board && <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-3">{stages.slice(0,5).map((stage: any) => <div key={stage.label} className="rounded-2xl p-4" style={{ background: C.white, border: '1px solid #D9E8E7' }}><div className="text-xs font-black uppercase tracking-wide" style={{ color: C.slate }}>{stage.label}</div><div className="text-2xl font-black mt-1" style={{ color: C.ink }}>{stage.bookings?.length || 0}</div></div>)}</div>}
    <Panel title="Jobs" icon={ClipboardCheck}>{loading ? <Loading/> : items.length ? <div className="space-y-2">{items.map((b: any) => <BookingRow key={b.id} booking={b} providerId={providerId} onChanged={() => { void load(); }}/>)}</div> : <Empty icon={ClipboardCheck} text="No bookings match this view."/>}</Panel>
  </div>;
}

function BookingRow({ booking, providerId, onChanged }: { booking: any; providerId: string; onChanged: () => void }) {
  const next: Record<string,string> = { booked:'confirmed', confirmed:'inspector_assigned', inspector_assigned:'travelling', travelling:'inspection_started', inspection_started:'inspection_complete' };
  const [busy,setBusy]=useState(false);
  const [assigning,setAssigning]=useState(false);
  const advance=async()=>{ const status=next[booking.status]; if(!status)return; setBusy(true); try{await api.updateBookingStatus(providerId, booking.id, status); onChanged();} finally{setBusy(false);} };
  const assign=async()=>{ setAssigning(true); try { const candidates=await api.getEngineers(providerId,{isAvailable:true}); const list=Array.isArray(candidates)?candidates:[]; if(!list.length){window.alert('No available engineers match this provider.');return;} const names=list.map((e:any)=>`${e.id} — ${e.name}`).join('\n'); const picked=window.prompt(`Select an engineer ID:\n${names}`); if(picked){await inspectionApi.assignInspector(providerId,booking.id,picked.trim()); onChanged();} } finally {setAssigning(false);} };
  return <div className="p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor:'#D9E8E7', background:C.white }}><div><div className="font-black" style={{color:C.ink}}>{booking.vehicle?.year || ''} {booking.vehicle?.make || ''} {booking.vehicle?.model || 'Inspection'}</div><div className="text-xs mt-1" style={{color:C.slate}}>{booking.reference} · {booking.scheduledDate} {booking.scheduledTime} · {booking.location?.town || booking.location?.county || 'Location pending'}</div><div className="text-xs mt-1" style={{color:C.slate}}>{booking.provider?.name || ''} {booking.package?.name ? `· ${booking.package.name}` : ''}</div></div><div className="flex items-center gap-2"><StatusPill status={booking.status}/>{['confirmed','booked'].includes(booking.status)&&<button disabled={assigning} onClick={assign} className="px-3 py-2 rounded-xl text-xs font-black" style={{background:'#E4F6F2',color:C.teal}}>{assigning?'Assigning…':'Assign inspector'}</button>}{next[booking.status] && <button disabled={busy} onClick={advance} className="px-3 py-2 rounded-xl text-xs font-black text-white" style={{background:C.teal}}>{busy?'Saving…':`Move to ${next[booking.status].replaceAll('_',' ')}`}</button>}</div></div>;
}

function Team({ providerId }: { providerId: string }) { const [team,setTeam]=useState<any[]>([]); const [loading,setLoading]=useState(true); const load=()=>api.getEngineers(providerId).then(r=>setTeam(r||[])).finally(()=>setLoading(false)); useEffect(load,[providerId]); return <div className="space-y-5"><SectionHeader eyebrow="Workforce" title="Engineers & inspectors" text="Match skills, availability and workload to the right vehicle and location."/><Panel title="Team" icon={Users} action="Add engineer" onAction={async()=>{const firstName=window.prompt('First name'); if(!firstName)return; const lastName=window.prompt('Last name')||''; const email=window.prompt('Email')||''; const phone=window.prompt('Phone')||''; await api.createEngineer(providerId,{firstName,lastName,email,phone,role:'field_technician'}); load();}}>{loading?<Loading/>:team.length?<div className="grid md:grid-cols-2 gap-3">{team.map((e:any)=><div key={e.id} className="p-4 rounded-2xl border" style={{borderColor:'#D9E8E7'}}><div className="flex items-center justify-between"><div><div className="font-black" style={{color:C.ink}}>{e.name}</div><div className="text-xs capitalize" style={{color:C.slate}}>{String(e.role).replaceAll('_',' ')}</div></div><button onClick={()=>api.setEngineerAvailability(providerId,e.id,!e.isAvailable).then(load)} className="px-2.5 py-1 rounded-full text-xs font-black" style={{background:e.isAvailable?'#DFF8F3':'#F2F4F5',color:e.isAvailable?C.teal:C.slate}}>{e.isAvailable?'Available':'Unavailable'}</button></div><div className="grid grid-cols-3 gap-2 mt-4 text-center"><Metric label="Jobs" value={e.inspectionCount ?? 0}/><Metric label="Rating" value={Number(e.averageRating||0).toFixed(1)}/><Metric label="Quality" value={`${Number(e.performance?.qualityScore||0).toFixed(0)}%`}/></div></div>)}</div>:<Empty icon={Users} text="No active engineers yet."/>}</Panel></div> }

function Reports({ providerId }: { providerId: string }) { const [queue,setQueue]=useState<any[]>([]); const [loading,setLoading]=useState(true); const load=()=>api.getReportQueue(providerId).then(r=>setQueue(r||[])).finally(()=>setLoading(false)); useEffect(load,[providerId]); return <div className="space-y-5"><SectionHeader eyebrow="Quality assurance" title="Report review center" text="No inspection report should reach the customer without a traceable quality gate."/><div className="grid md:grid-cols-3 gap-3"><Kpi label="In queue" value={String(queue.length)} Icon={FileCheck2} color={C.blue}/><Kpi label="Awaiting QA" value={String(queue.filter(r=>r.status==='qa_review').length)} Icon={Clock3} color={C.gold}/><Kpi label="Approved" value={String(queue.filter(r=>['approved','sent'].includes(r.status)).length)} Icon={CheckCircle2} color={C.mint}/></div><Panel title="Review queue" icon={FileText}>{loading?<Loading/>:queue.length?<div className="space-y-2">{queue.map((r:any)=><div key={r.reportId} className="p-4 rounded-2xl border" style={{borderColor:'#D9E8E7'}}><div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="font-black" style={{color:C.ink}}>{r.vehicle}</div><div className="text-xs" style={{color:C.slate}}>{r.reportNumber} · {r.customerName || 'Customer'} · {r.inspectionDate || 'Date pending'}</div></div><div className="flex items-center gap-2"><StatusPill status={r.status}/>{r.status==='qa_review'&&<button onClick={()=>api.approveReport(providerId,r.reportId).then(load)} className="px-3 py-2 rounded-xl text-xs font-black text-white" style={{background:C.mint}}>Approve</button>}{r.status==='engineer_complete'&&<button onClick={()=>api.submitReport(providerId,r.reportId).then(load)} className="px-3 py-2 rounded-xl text-xs font-black text-white" style={{background:C.teal}}>Send to QA</button>}{r.status==='approved'&&<button onClick={()=>api.sendReport(providerId,r.reportId,'portal').then(load)} className="px-3 py-2 rounded-xl text-xs font-black text-white" style={{background:C.ink}}>Deliver</button>}</div></div></div>)}</div>:<Empty icon={FileCheck2} text="No reports waiting for review."/>}</Panel></div> }

function Customers({ providerId }: { providerId: string }) { const [customers,setCustomers]=useState<any[]>([]); useEffect(()=>{api.getCustomers(providerId).then(r=>setCustomers(r||[]))},[providerId]); return <div className="space-y-5"><SectionHeader eyebrow="Customer relationships" title="Customers & repeat business" text="Turn one inspection into a long-term trust relationship."/><Panel title="Customer book" icon={Users}><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{customers.map((c:any)=><div key={c.id} className="p-4 rounded-2xl border" style={{borderColor:'#D9E8E7'}}><div className="font-black" style={{color:C.ink}}>{c.name}</div><div className="text-xs mt-1" style={{color:C.slate}}>{c.customerType || c.customer_type || 'private buyer'} · {c.email || c.phone || 'contact unavailable'}</div><div className="grid grid-cols-2 gap-2 mt-4"><Metric label="Inspections" value={c.totalInspections ?? c.total_inspections ?? 0}/><Metric label="Spent" value={`KES ${Number(c.totalSpent ?? c.total_spent ?? 0).toLocaleString()}`}/></div></div>)}</div>{!customers.length&&<Empty icon={Users} text="Customers will appear after completed booking activity."/>}</Panel></div> }

function Finance({ providerId }: { providerId: string }) { const [finance,setFinance]=useState<any>(null); const [settlements,setSettlements]=useState<any[]>([]); useEffect(()=>{Promise.all([api.getFinance(providerId),api.getSettlements(providerId)]).then(([f,s])=>{setFinance(f);setSettlements(s||[])})},[providerId]); return <div className="space-y-5"><SectionHeader eyebrow="Money & settlement" title="Inspection finance" text="See gross revenue, KAYAD commission, provider earnings and settlement state separately."/><div className="grid md:grid-cols-4 gap-3">{[['Gross revenue',finance?.grossRevenue??finance?.totalEarnings??0],['Commission',finance?.commission??finance?.totalCommission??0],['Net',finance?.netRevenue??finance?.netEarnings??0],['Pending',finance?.pendingPayout??finance?.totalPending??0]].map(([l,v])=><Kpi key={String(l)} label={String(l)} value={`KES ${Number(v).toLocaleString()}`} Icon={CreditCard} color={l==='Commission'?C.gold:C.teal}/>)}</div><Panel title="Settlements" icon={CreditCard}>{settlements.length?<div className="space-y-2">{settlements.map((s:any)=><div key={s.id} className="p-4 rounded-2xl border flex items-center justify-between" style={{borderColor:'#D9E8E7'}}><div><div className="font-black" style={{color:C.ink}}>{s.reference}</div><div className="text-xs" style={{color:C.slate}}>{s.periodStart} → {s.periodEnd} · {s.bookingsCount} bookings</div></div><div className="text-right"><div className="font-black" style={{color:C.teal}}>KES {Number(s.netAmount||0).toLocaleString()}</div><StatusPill status={s.status}/></div></div>)}</div>:<Empty icon={CreditCard} text="No settlements yet."/>}</Panel></div> }

function Growth({ providerId }: { providerId: string }) { const [analytics,setAnalytics]=useState<any>(null); const [promos,setPromos]=useState<any[]>([]); useEffect(()=>{Promise.all([api.getAnalytics(providerId),api.getPromos(providerId)]).then(([a,p])=>{setAnalytics(a);setPromos(p||[])})},[providerId]); return <div className="space-y-5"><SectionHeader eyebrow="Growth" title="Demand, quality & commercial performance" text="Use actual inspection activity to understand where the business is growing and where it is leaking."/><div className="grid md:grid-cols-4 gap-3">{[['Jobs',analytics?.overview?.totalJobs||0],['Completion',`${analytics?.jobs?.completionRate||0}%`],['Revenue growth',`${analytics?.overview?.revenueGrowth||0}%`],['Repeat customers',analytics?.customers?.repeatCustomers||0]].map(([l,v])=><Kpi key={String(l)} label={String(l)} value={String(v)} Icon={BarChart3} color={C.mint}/>)}</div><div className="grid lg:grid-cols-2 gap-5"><Panel title="Demand by type" icon={BarChart3}>{Object.entries(analytics?.jobs?.byType||{}).map(([k,v]:any)=><div key={k} className="flex justify-between py-2 border-b" style={{borderColor:'#EDF2F1'}}><span className="capitalize text-sm" style={{color:C.slate}}>{k.replaceAll('_',' ')}</span><b style={{color:C.ink}}>{v}</b></div>)}</Panel><Panel title="Active promotions" icon={Star} action="Create" onAction={async()=>{const name=window.prompt('Promotion name');if(!name)return;await api.createPromo(providerId,{name,discountType:'percentage',discountValue:10,startsAt:new Date().toISOString(),endsAt:new Date(Date.now()+7*86400000).toISOString()});const p=await api.getPromos(providerId);setPromos(p||[])}}>{promos.length?promos.slice(0,6).map((p:any)=><div key={p.id} className="py-3 border-b" style={{borderColor:'#EDF2F1'}}><div className="font-bold" style={{color:C.ink}}>{p.name}</div><div className="text-xs" style={{color:C.slate}}>{p.discount_value || p.discountValue}{p.discount_type==='percentage'?'%':' KES'} · {p.is_active?'Active':'Inactive'}</div></div>):<Empty icon={Star} text="No provider promotions configured."/>}</Panel></div></div> }

function BusinessSettings({ providerId, provider, onSaved }: { providerId: string; provider: any; onSaved: (p:any)=>void }) {
  const [sub, setSub] = useState<'profile'|'packages'|'locations'|'credentials'|'documents'>('profile');
  return <div className="space-y-5"><SectionHeader eyebrow="Business configuration" title="Your inspection business" text="Control the public profile, services, locations, credentials and operating documents that support trust."/><div className="flex gap-2 overflow-x-auto">{[['profile','Profile'],['packages','Packages'],['locations','Branches'],['credentials','Credentials'],['documents','Documents']].map(([id,label])=><button key={id} onClick={()=>setSub(id as any)} className="px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap" style={{background:sub===id?C.ink:C.white,color:sub===id?C.white:C.slate,border:`1px solid ${sub===id?C.ink:'#D9E8E7'}`}}>{label}</button>)}</div>{sub==='profile'&&<BusinessProfileForm providerId={providerId} provider={provider} onSaved={onSaved}/>} {sub==='packages'&&<PackageManager providerId={providerId}/>} {sub==='locations'&&<BranchManager providerId={providerId}/>} {sub==='credentials'&&<CredentialManager providerId={providerId}/>} {sub==='documents'&&<DocumentManager providerId={providerId}/>}</div>;
}

function BusinessProfileForm({ providerId, provider, onSaved }: { providerId:string; provider:any; onSaved:(p:any)=>void }) {
 const [form,setForm]=useState<any>({company_name:provider?.company_name||provider?.companyName||'',description:provider?.description||'',phone:provider?.phone||provider?.contact?.phone||'',whatsapp:provider?.whatsapp||provider?.contact?.whatsapp||'',county:provider?.county||provider?.location?.county||'',town:provider?.town||provider?.location?.town||'',address:provider?.address||provider?.location?.address||'',offers_mobile:provider?.offers_mobile ?? provider?.operatingModel?.offersMobile ?? true,has_workshop:provider?.has_workshop ?? provider?.operatingModel?.hasWorkshop ?? false,mobile_inspection_fee:provider?.mobile_inspection_fee ?? provider?.operatingModel?.mobileFee ?? 0});
 const [saved,setSaved]=useState(false);
 const save=async()=>{const p=await api.updateProfile(providerId,form);onSaved(p);setSaved(true);setTimeout(()=>setSaved(false),2500)};
 return <Panel title="Business profile" icon={Settings2}><div className="grid md:grid-cols-2 gap-4">{[['company_name','Business name'],['phone','Phone'],['whatsapp','WhatsApp'],['county','County'],['town','Town'],['address','Address']].map(([k,l])=><label key={k} className="text-sm font-bold" style={{color:C.ink}}>{l}<input value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})} className="mt-1 w-full rounded-xl border px-3 py-3 outline-none" style={{borderColor:'#D9E8E7'}}/></label>)}<label className="md:col-span-2 text-sm font-bold" style={{color:C.ink}}>Description<textarea value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} rows={4} className="mt-1 w-full rounded-xl border px-3 py-3 outline-none" style={{borderColor:'#D9E8E7'}}/></label></div><div className="flex flex-wrap gap-3 mt-4"><Toggle label="Mobile inspections" value={Boolean(form.offers_mobile)} onChange={v=>setForm({...form,offers_mobile:v})}/><Toggle label="Workshop service" value={Boolean(form.has_workshop)} onChange={v=>setForm({...form,has_workshop:v})}/></div><div className="mt-5 flex items-center gap-3"><button onClick={save} className="px-5 py-3 rounded-xl text-white font-black" style={{background:C.ink}}>Save business profile</button>{saved&&<span className="text-sm font-bold" style={{color:C.mint}}>Saved</span>}</div></Panel>
}

function PackageManager({providerId}:{providerId:string}){const [items,setItems]=useState<any[]>([]);const load=()=>api.getPackages(providerId,true).then(r=>setItems(r||[]));useEffect(()=>{void load()},[providerId]);const add=async()=>{const name=window.prompt('Package name');if(!name)return;const price=Number(window.prompt('Price in KES','5000')||0);await api.createPackage(providerId,{name,inspectionType:'pre_purchase',price,estimatedDurationMinutes:90,inspectionPoints:150,includesDiagnostics:true,includesRoadTest:true});load()};return <Panel title="Inspection packages" icon={FileText} action="Add package" onAction={add}>{items.length?<div className="space-y-2">{items.map((p:any)=><div key={p.id} className="p-4 rounded-2xl border flex items-center justify-between" style={{borderColor:'#D9E8E7'}}><div><div className="font-black" style={{color:C.ink}}>{p.name}</div><div className="text-xs" style={{color:C.slate}}>{p.inspection_type?.replaceAll('_',' ')} · {p.estimated_duration_minutes} min · {p.inspection_points} points</div></div><div className="text-right"><div className="font-black" style={{color:C.teal}}>KES {Number(p.price||0).toLocaleString()}</div><div className="text-xs" style={{color:p.is_active?C.mint:C.slate}}>{p.is_active?'Active':'Inactive'}</div></div></div>)}</div>:<Empty icon={FileText} text="Create the first inspection package."/>}</Panel>}
function BranchManager({providerId}:{providerId:string}){const [items,setItems]=useState<any[]>([]);const load=()=>api.getBranches(providerId).then(r=>setItems(r||[]));useEffect(()=>{void load()},[providerId]);const add=async()=>{const name=window.prompt('Branch name');if(!name)return;const address=window.prompt('Address')||'';await api.createBranch(providerId,{name,address});load()};return <Panel title="Branches & service locations" icon={MapPin} action="Add branch" onAction={add}>{items.length?items.map((b:any)=><div key={b.id} className="p-4 border-b" style={{borderColor:'#EDF2F1'}}><div className="font-black" style={{color:C.ink}}>{b.name}</div><div className="text-sm" style={{color:C.slate}}>{b.address||'Address not supplied'}</div></div>):<Empty icon={MapPin} text="No branches configured."/>}</Panel>}
function CredentialManager({providerId}:{providerId:string}){const [items,setItems]=useState<any[]>([]);const load=()=>api.getCredentials(providerId).then(r=>setItems(r||[]));useEffect(()=>{void load()},[providerId]);const add=async()=>{const name=window.prompt('Credential name');if(!name)return;await api.createCredential(providerId,{name,type:'business_certificate'});load()};return <Panel title="Credentials" icon={ShieldCheck} action="Add credential" onAction={add}>{items.length?items.map((c:any)=><div key={c.id} className="p-4 border-b" style={{borderColor:'#EDF2F1'}}><div className="font-black" style={{color:C.ink}}>{c.name}</div><div className="text-xs" style={{color:C.slate}}>{c.issuing_body||'Issuing body pending'} · {c.is_verified?'Verified':'Awaiting verification'}</div></div>):<Empty icon={ShieldCheck} text="No provider credentials added yet."/>}</Panel>}
function DocumentManager({providerId}:{providerId:string}){const [items,setItems]=useState<any[]>([]);const load=()=>api.getDocuments(providerId).then(r=>setItems(r||[]));useEffect(()=>{void load()},[providerId]);const add=async()=>{const title=window.prompt('Document title');if(!title)return;await api.createDocument(providerId,{title,type:'other'});load()};return <Panel title="Business documents" icon={FileCheck2} action="Add document" onAction={add}>{items.length?items.map((d:any)=><div key={d.id} className="p-4 border-b flex items-center justify-between" style={{borderColor:'#EDF2F1'}}><div><div className="font-black" style={{color:C.ink}}>{d.title}</div><div className="text-xs" style={{color:C.slate}}>{d.type} · {d.expiry_date||'No expiry'}</div></div><StatusPill status={d.is_verified?'verified':'pending'}/></div>):<Empty icon={FileCheck2} text="No business documents uploaded."/>}</Panel>}

function SectionHeader({ eyebrow,title,text }:{eyebrow:string;title:string;text:string}){return <div><div className="text-[11px] font-black uppercase tracking-[.18em]" style={{color:C.teal}}>{eyebrow}</div><h2 className="text-3xl font-black mt-1" style={{color:C.ink}}>{title}</h2><p className="mt-2 max-w-3xl" style={{color:C.slate}}>{text}</p></div>}
function Panel({title,icon:Icon,children,action,onAction}:{title:string;icon:any;children:ReactNode;action?:string;onAction?:()=>void}){return <section className="rounded-3xl p-5 md:p-6" style={{background:C.white,border:'1px solid #D9E8E7'}}><div className="flex items-center justify-between gap-3 mb-4"><div className="flex items-center gap-2"><span className="w-9 h-9 rounded-xl grid place-items-center" style={{background:C.pale,color:C.teal}}><Icon size={18}/></span><h3 className="font-black" style={{color:C.ink}}>{title}</h3></div>{action&&<button onClick={onAction} className="text-xs font-black" style={{color:C.teal}}>{action} <ChevronRight size={13} className="inline"/></button>}</div>{children}</section>}
function Kpi({label,value,Icon,color}:{label:string;value:string;Icon:any;color:string}){return <div className="rounded-2xl p-4" style={{background:C.white,border:'1px solid #D9E8E7'}}><div className="flex items-center gap-2 text-xs font-bold" style={{color:C.slate}}><Icon size={15} style={{color}}/>{label}</div><div className="text-2xl font-black mt-2" style={{color:C.ink}}>{value}</div></div>}
function Metric({label,value}:{label:string;value:any}){return <div className="rounded-xl p-2" style={{background:C.pale}}><div className="text-[10px] uppercase font-black" style={{color:C.slate}}>{label}</div><div className="font-black text-sm" style={{color:C.ink}}>{value}</div></div>}
function StatusPill({status}:{status:string}){const color=status==='completed'||status==='closed'||status==='approved'||status==='sent' ? C.mint : status==='cancelled'?'#C84B4B':status==='qa_review'?'#4C8DDA':C.teal;return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase" style={{background:`${color}18`,color}}>{String(status||'pending').replaceAll('_',' ')}</span>}
function QuickAction({icon:Icon,title,text,onClick}:{icon:any;title:string;text:string;onClick:()=>void}){return <button onClick={onClick} className="text-left rounded-2xl p-5" style={{background:C.white,border:'1px solid #D9E8E7'}}><Icon size={20} style={{color:C.teal}}/><div className="font-black mt-3" style={{color:C.ink}}>{title}</div><div className="text-sm mt-1" style={{color:C.slate}}>{text}</div></button>}
function Toggle({label,value,onChange}:{label:string;value:boolean;onChange:(v:boolean)=>void}){return <button type="button" onClick={()=>onChange(!value)} className="flex items-center gap-3 px-4 py-3 rounded-2xl border font-bold text-sm" style={{borderColor:'#D9E8E7',color:C.ink}}><span className="w-9 h-5 rounded-full p-0.5" style={{background:value?C.mint:'#B8C8CC'}}><span className="block w-4 h-4 rounded-full bg-white transition-transform" style={{transform:value?'translateX(16px)':'translateX(0)'}}/></span>{label}</button>}
function Empty({icon:Icon,text}:{icon:any;text:string}){return <div className="py-10 text-center" style={{color:C.slate}}><Icon size={30} className="mx-auto opacity-50"/><div className="mt-2 text-sm font-semibold">{text}</div></div>}
function Loading(){return <div className="py-10 text-center text-sm" style={{color:C.slate}}>Loading operational data…</div>}
function BusinessError({message,onExit}:{message:string;onExit?:()=>void}){return <div className="min-h-screen grid place-items-center p-6" style={{background:C.pale}}><div className="max-w-lg rounded-3xl bg-white p-8 text-center border" style={{borderColor:'#D9E8E7'}}><AlertTriangle size={34} className="mx-auto" style={{color:C.gold}}/><h1 className="text-2xl font-black mt-4" style={{color:C.ink}}>Inspection business center unavailable</h1><p className="mt-2" style={{color:C.slate}}>{message}</p>{onExit&&<button onClick={onExit} className="mt-5 px-5 py-3 rounded-xl text-white font-black" style={{background:C.ink}}>Return to marketplace</button>}</div></div>}
