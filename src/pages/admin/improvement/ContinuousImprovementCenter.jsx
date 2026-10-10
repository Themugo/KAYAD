import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, FlaskConical, Lightbulb, RefreshCw } from 'lucide-react';
import { getInnovationDashboard, getImprovementOpportunities, updateImprovement } from '../../../services/improvementApi';

export default function ContinuousImprovementCenter() {
  const [dashboard,setDashboard]=useState(null); const [items,setItems]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const load=async()=>{setLoading(true);setError('');try{const [d,i]=await Promise.all([getInnovationDashboard(),getImprovementOpportunities()]);setDashboard(d.data?.data||d.data);setItems(i.data?.data||i.data||[]);}catch(e){setError(e?.response?.data?.message||'Unable to load improvement data');}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const open=useMemo(()=>items.filter(x=>!['completed','rejected'].includes(x.status)),[items]);
  if(loading)return <section className="p-8 text-sm text-[#64748B]">Loading Continuous Improvement…</section>;
  if(error)return <section className="rounded-xl border border-red-200 bg-red-50 p-8"><p className="text-sm text-red-700">{error}</p><button onClick={load} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0A3340] px-4 py-2 text-sm font-semibold text-white"><RefreshCw size={15}/>Retry</button></section>;
  return <section className="space-y-6">
    <header className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-[#0A3340]">Continuous Improvement</h1><p className="mt-1 text-sm text-[#64748B]">Operational improvements, experiments and ideas backed by production records.</p></div><button onClick={load} className="rounded-lg border border-[#D7E7E4] bg-white p-2"><RefreshCw size={18}/></button></header>
    <div className="grid gap-4 md:grid-cols-4">{[['Open improvements',dashboard?.summary?.activeImprovements,Clock3],['Completed',dashboard?.improvementsByStatus?.completed,CheckCircle2],['Experiments',dashboard?.summary?.experiments,FlaskConical],['Ideas',dashboard?.summary?.ideas,Lightbulb]].map(([label,value,Icon])=><div key={label} className="rounded-xl border border-[#D7E7E4] bg-white p-5"><Icon size={19} className="text-[#64748B]"/><p className="mt-3 text-2xl font-bold">{value??0}</p><p className="text-sm text-[#64748B]">{label}</p></div>)}</div>
    <div className="rounded-xl border border-[#D7E7E4] bg-white"><div className="border-b border-[#D7E7E4] p-5"><h2 className="font-semibold">Active improvement queue</h2></div>{open.length===0?<div className="p-8 text-sm text-[#64748B]">No active improvements.</div>:<div className="divide-y">{open.slice(0,25).map(x=><div key={x.id} className="flex items-center justify-between gap-4 p-5"><div><p className="font-semibold text-[#0A3340]">{x.title}</p><p className="mt-1 text-xs text-[#64748B]">{x.category} · {x.status} · impact {x.impactScore}/5 · effort {x.effortScore}/5</p></div><span className="rounded-full bg-[#EEF7F5] px-3 py-1 text-xs font-semibold">{x.priority}</span></div>)}</div>}</div>
  </section>;
}
