import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Loader2, Newspaper, RefreshCw, Sparkles } from 'lucide-react';
import { getCars, mapBackendCarToVehicle } from '../services/vehicleApi';
import { getCMSContent, CMSContentItem } from '../services/cmsContentApi';
import { request } from '../api/httpRequest';
import usePageMeta from '../hooks/usePageMeta';
import type { Vehicle } from '../types';

interface KAYADLiveProps {
  onNavigate: (page: string) => void;
  onOpenVehicleDetails?: (vehicle: Vehicle | string) => void;
}

export const KAYADLive: React.FC<KAYADLiveProps> = ({ onNavigate, onOpenVehicleDetails }) => {
  const [newArrivals, setNewArrivals] = useState<Vehicle[]>([]);
  const [news, setNews] = useState<CMSContentItem[]>([]);
  const [guides, setGuides] = useState<CMSContentItem[]>([]);
  const [article, setArticle] = useState<CMSContentItem | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);
  const [articleError, setArticleError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({ news: false, guides: false, cars: false });
  const [retryKey, setRetryKey] = useState(0);
  usePageMeta(article?.title || 'KAYAD Live', article?.excerpt || 'Read marketplace news and vehicle buying guides from KAYAD.');
  const [searchParams, setSearchParams] = useSearchParams();
  const openedSlugRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [carsResult, newsResult, guidesResult] = await Promise.allSettled([
      getCars({ limit: 6, sort: 'newest' }), getCMSContent('news', 4), getCMSContent('guide', 4),
    ]);
    if (carsResult.status === 'fulfilled') setNewArrivals((carsResult.value.data || []).map(mapBackendCarToVehicle));
    if (newsResult.status === 'fulfilled') setNews(newsResult.value); else setNews([]);
    if (guidesResult.status === 'fulfilled') setGuides(guidesResult.value); else setGuides([]);
    setErrors({ cars: carsResult.status === 'rejected', news: newsResult.status === 'rejected', guides: guidesResult.status === 'rejected' });
    setLoading(false);
  }, [retryKey]);

  useEffect(() => { void load(); }, [load]);

  const openArticle = async (item: CMSContentItem) => {
    openedSlugRef.current = item.slug;
    setSearchParams((current) => { const next = new URLSearchParams(current); next.set('nav', 'kayadlive'); next.set('article', item.slug); return next; }, { replace: false });
    setArticle(item); setArticleLoading(true); setArticleError(false);
    try {
      const full = await request<CMSContentItem>(`/api/cms/content/s/${encodeURIComponent(item.slug)}`);
      setArticle(full);
    } catch { setArticleError(true); }
    finally { setArticleLoading(false); }
  };

  useEffect(() => {
    const slug = searchParams.get('article');
    if (!slug) { openedSlugRef.current = null; return; }
    if (openedSlugRef.current === slug || article?.slug === slug) return;
    const item = [...news, ...guides].find((entry) => entry.slug === slug);
    if (item) void openArticleFromDeepLink(item);
  }, [searchParams, news, guides]);

  const openArticleFromDeepLink = async (item: CMSContentItem) => {
    openedSlugRef.current = item.slug;
    setArticle(item); setArticleLoading(true); setArticleError(false);
    try { const full = await request<CMSContentItem>(`/api/cms/content/s/${encodeURIComponent(item.slug)}`); setArticle(full); }
    catch { setArticleError(true); }
    finally { setArticleLoading(false); }
  };

  const closeArticle = () => {
    openedSlugRef.current = null; setArticle(null);
    setSearchParams((current) => { const next = new URLSearchParams(current); next.delete('article'); return next; }, { replace: false });
  };

  if (article) return (
    <article className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <button type="button" onClick={closeArticle} className="inline-flex items-center gap-2 text-sm font-semibold text-[#176B87]"><ArrowLeft size={16}/> Back to KAYAD Live</button>
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[#13A89E]">{article.content_type || 'KAYAD'}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0A3340]">{article.title}</h1>
        {article.published_at && <p className="text-xs text-slate-500">{new Date(article.published_at).toLocaleDateString()}</p>}
        {article.excerpt && <p className="text-base text-slate-600">{article.excerpt}</p>}
      </header>
      {article.featured_image && <img src={article.featured_image} alt={article.title} loading="lazy" decoding="async" className="max-h-[420px] w-full rounded-xl object-contain bg-slate-50"/>}
      {articleLoading ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={16}/> Loading article…</div> : articleError ? <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">This article could not be loaded. <button className="ml-2 font-bold underline" onClick={() => openArticle(article)}>Try again</button></div> : <div className="prose prose-slate max-w-none whitespace-pre-wrap">{article.body || article.excerpt || 'This article has no published body yet.'}</div>}
    </article>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="text-center py-6"><h1 className="text-2xl font-bold text-[#176B87]">KAYAD Live</h1><p className="mt-1 text-sm text-[#64748B]">What's new on the marketplace</p></div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#94A3B8]"/></div> : <>
        <section>
          <div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#176B87]"/><h2 className="text-base font-bold text-[#176B87]">New Arrivals</h2></div>
          {errors.cars ? <RetryNotice onRetry={() => setRetryKey(k => k+1)} label="New arrivals could not be loaded."/> : newArrivals.length === 0 ? <p className="text-xs text-[#94A3B8]">No new listings yet.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{newArrivals.map(v => <button type="button" key={v.id} onClick={() => onOpenVehicleDetails ? onOpenVehicleDetails(v) : onNavigate('marketplace')} className="overflow-hidden rounded-xl border border-[#D7E7E4] bg-white text-left hover:shadow-md"><div className="h-20 bg-[#EEF7F5]">{v.images?.[0] && <img src={v.images[0]} alt={v.title} loading="lazy" decoding="async" className="h-full w-full object-contain"/>}</div><div className="p-2"><p className="truncate text-[11px] font-semibold text-[#176B87]">{v.year} {v.make} {v.model}</p><p className="text-[10px] text-[#64748B]">Ksh {(v.price/1000000).toFixed(2)}M</p><span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#176B87]">View vehicle <ArrowRight size={11}/></span></div></button>)}</div>}
        </section>
        <ContentSection title="News" icon={<Newspaper size={16}/>} items={news} error={errors.news} onOpen={openArticle} onRetry={() => setRetryKey(k=>k+1)}/>
        <ContentSection title="Buying Guides" icon={<BookOpen size={16}/>} items={guides} error={errors.guides} onOpen={openArticle} onRetry={() => setRetryKey(k=>k+1)}/>
      </>}
    </div>
  );
};

function RetryNotice({label,onRetry}:{label:string;onRetry:()=>void}) { return <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-slate-700">{label} <button type="button" onClick={onRetry} className="ml-2 inline-flex items-center gap-1 font-bold text-[#176B87]"><RefreshCw size={13}/> Retry</button></div>; }
function ContentSection({title,icon,items,error,onOpen,onRetry}:{title:string;icon:React.ReactNode;items:CMSContentItem[];error:boolean;onOpen:(item:CMSContentItem)=>void;onRetry:()=>void}) { return <section><div className="mb-4 flex items-center gap-2 text-[#176B87]">{icon}<h2 className="text-base font-bold">{title}</h2></div>{error ? <RetryNotice label={`${title} could not be loaded.`} onRetry={onRetry}/> : items.length===0 ? <p className="text-xs text-[#94A3B8]">No published {title.toLowerCase()} yet.</p> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{items.map(item=><article key={item.id} className="rounded-xl border border-[#D7E7E4] bg-white p-4"><h3 className="mb-1 text-sm font-bold text-[#176B87]">{item.title}</h3>{item.excerpt && <p className="text-xs text-[#64748B]">{item.excerpt}</p>}{item.reading_time ? <p className="mt-1.5 text-[10px] text-[#94A3B8]">{item.reading_time} min read</p>:null}<button type="button" onClick={()=>onOpen(item)} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#176B87]">Read article <ArrowRight size={13}/></button></article>)}</div>}</section>; }

export default KAYADLive;
