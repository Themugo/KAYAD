import React from 'react';
import { Car, RefreshCw, Settings2, ShoppingBag } from 'lucide-react';

type Props = {
  variant: 'overview' | 'section';
  title: string;
  firstName?: string;
  refreshing: boolean;
  density: 'comfortable' | 'compact';
  onRefresh: () => void;
  onSell: () => void;
  onBrowse: () => void;
  onToggleDensity: () => void;
  showDensityToggle?: boolean;
  showRefresh?: boolean;
};

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; };
const ghost = 'inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/15 disabled:opacity-60';

/** Navy/teal banner. Full greeting on Overview, compact title on other sections; same actions either way. */
export default function PersonalGreetingBanner({ variant, title, firstName, refreshing, density, onRefresh, onSell, onBrowse, onToggleDensity, showDensityToggle = true, showRefresh = true }: Props) {
  const overview = variant === 'overview';
  return (
    <header className={`rounded-2xl bg-gradient-to-r from-[#082B40] via-[#0A4A5C] to-[#0D766F] text-white shadow-sm ${overview ? 'p-5 sm:p-7' : 'p-5 sm:p-6'}`} data-kayad-personal-banner={variant}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9FE9E1]">KAYARD KE · Personal account</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">{overview ? `Good ${greeting()}, ${firstName || 'there'}` : title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/75">Buy and sell privately from one account. Your personal activity stays separate from every business you work with.</p>
          {overview && <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/90"><span className="h-1.5 w-1.5 rounded-full bg-[#12D6CB]" aria-hidden="true" />One personal account · Buy and sell privately</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {showRefresh && <button type="button" onClick={onRefresh} disabled={refreshing} className={ghost}><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" /> Refresh</button>}
          <button type="button" onClick={onSell} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#11B8A6] px-4 text-sm font-black text-[#082B40] hover:bg-[#12D6CB]"><Car size={17} aria-hidden="true" /> Sell a vehicle</button>
          <button type="button" onClick={onBrowse} className={`${ghost} text-sm`}><ShoppingBag size={17} aria-hidden="true" /> Browse vehicles</button>
          {showDensityToggle && <button type="button" onClick={onToggleDensity} className={ghost}><Settings2 size={15} aria-hidden="true" />{density === 'comfortable' ? 'Compact view' : 'Comfortable view'}</button>}
        </div>
      </div>
    </header>
  );
}
