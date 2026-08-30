import React, { useEffect, useState } from 'react';
import { Sparkles, Newspaper, BookOpen, Loader2 } from 'lucide-react';
import { getCars, mapBackendCarToVehicle } from '../services/vehicleApi';
import { getCMSContent, CMSContentItem } from '../services/cmsContentApi';
import type { Vehicle } from '../types';

/**
 * Rebuilt entirely - the original was a 1160-line, 9-channel "social
 * feed" page (live broadcasts, dealer showcases, new arrivals,
 * inspection stories, news, buying guides, financing, reviews,
 * community events), but was driven entirely by 8 separate fabricated
 * mock data arrays with zero real backend connection anywhere.
 *
 * Investigated each of the 9 channels for a real backend equivalent
 * before rebuilding, rather than keep any of them as-is:
 * - live broadcasts: redundant with the real, working "watch a live
 *   auction" experience already built (AuctionDiscoveryNetwork's own
 *   WatchLiveModal) - not rebuilt here, would have duplicated it.
 * - dealer showcases, inspection stories, reviews, financing,
 *   community events: no real backend concept exists for any of
 *   these (confirmed directly - no matching controller/table).
 *   Removed rather than fabricate a version of any of them.
 * - new arrivals: genuinely real - the marketplace's own real vehicle
 *   listings, sorted newest-first (services/vehicleApi.ts's getCars).
 * - news, buying guides: genuinely real - this project's own CMS
 *   content system (services/cmsApi.ts), found already built but
 *   never actually connected to anything, and its own real bug fixed
 *   as part of this rebuild (see the commit history for that fix).
 */

interface KAYADLiveProps {
  onNavigate: (page: string) => void;
}

export const KAYADLive: React.FC<KAYADLiveProps> = ({ onNavigate }) => {
  const [newArrivals, setNewArrivals] = useState<Vehicle[]>([]);
  const [news, setNews] = useState<CMSContentItem[]>([]);
  const [guides, setGuides] = useState<CMSContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCars({ limit: 6, sort: 'newest' }).catch(() => ({ data: [] })),
      getCMSContent('news', 4),
      getCMSContent('guide', 4),
    ]).then(([carsRes, newsRes, guidesRes]) => {
      if (cancelled) return;
      setNewArrivals((carsRes.data || []).map(mapBackendCarToVehicle));
      setNews(newsRes);
      setGuides(guidesRes);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <div className="text-center py-6">
        <h1 className="text-2xl font-bold text-[#1E3063] font-display">KAYAD Live</h1>
        <p className="text-sm text-slate-500 mt-1">What's new on the marketplace</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* NEW ARRIVALS - real, from the real marketplace inventory */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#C85A32]" />
              <h2 className="text-base font-bold text-[#1E3063]">New Arrivals</h2>
            </div>
            {newArrivals.length === 0 ? (
              <p className="text-xs text-slate-400">No new listings yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {newArrivals.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onNavigate('marketplace')}
                    className="text-left bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="h-20 bg-slate-100">
                      {v.images?.[0] && <img src={v.images[0]} alt={v.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-semibold text-[#1E3063] truncate">{v.year} {v.make} {v.model}</p>
                      <p className="text-[10px] text-slate-500">Ksh {(v.price / 1000000).toFixed(2)}M</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* NEWS - real, from the real CMS content system */}
          {news.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Newspaper className="w-4 h-4 text-[#C85A32]" />
                <h2 className="text-base font-bold text-[#1E3063]">News</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {news.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-[#1E3063] mb-1">{item.title}</h3>
                    {item.excerpt && <p className="text-xs text-slate-500">{item.excerpt}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* BUYING GUIDES - real, from the real CMS content system */}
          {guides.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-[#C85A32]" />
                <h2 className="text-base font-bold text-[#1E3063]">Buying Guides</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {guides.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-[#1E3063] mb-1">{item.title}</h3>
                    {item.excerpt && <p className="text-xs text-slate-500">{item.excerpt}</p>}
                    {item.reading_time ? <p className="text-[10px] text-slate-400 mt-1.5">{item.reading_time} min read</p> : null}
                  </div>
                ))}
              </div>
            </section>
          )}

          {newArrivals.length === 0 && news.length === 0 && guides.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-slate-400">Nothing to show here yet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default KAYADLive;
