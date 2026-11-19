import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { titleForRoute } from '../../utils/pageTitle';

type JourneyTab = { key: string; href: string; label: string };

// Shared across shell remounts when moving between standalone admin/dealer routes.
let rememberedJourneyTabs: JourneyTab[] = [];

function labelForLocation(pathname: string, search: string): string {
  const title = titleForRoute(pathname, search).replace(/\s*\|\s*KAYARD KE\s*$/, '');
  if (title !== "KAYAD | Kenya's Verified Automotive Marketplace & Escrow Vault") return title;
  const segment = pathname.split('/').filter(Boolean).pop();
  if (!segment) return 'Home';
  return segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Shared, history-aware page controls and recently visited page tabs. */
export default function PageJourneyNavigation({ fallbackHref = '/' }: { fallbackHref?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const currentHref = `${location.pathname}${location.search}${location.hash}`;
  const currentIndex = Number.isInteger(window.history.state?.idx) ? window.history.state.idx as number : 0;
  const furthestIndex = useRef(currentIndex);
  const [historyIndex, setHistoryIndex] = useState(currentIndex);
  const [tabs, setTabs] = useState<JourneyTab[]>(() => rememberedJourneyTabs);

  useEffect(() => {
    if (navigationType === 'PUSH' || navigationType === 'REPLACE') furthestIndex.current = currentIndex;
    else furthestIndex.current = Math.max(furthestIndex.current, currentIndex);
    setHistoryIndex(currentIndex);
    const tab: JourneyTab = {
      key: `${location.pathname}?${location.search}`,
      href: currentHref,
      label: labelForLocation(location.pathname, location.search),
    };
    setTabs((existing) => {
      const withoutCurrent = existing.filter((item) => item.key !== tab.key);
      return [...withoutCurrent, tab].slice(-6);
    });
  }, [currentHref, currentIndex, location.pathname, location.search, navigationType]);

  useEffect(() => {
    rememberedJourneyTabs = tabs.slice(-6);
  }, [tabs]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < furthestIndex.current;
  const currentLabel = useMemo(() => labelForLocation(location.pathname, location.search), [location.pathname, location.search]);

  // A first visit to the home page has nothing to go back to, forward to or switch between: showing a
  // disabled Back/Forward bar plus a lone "Home" tab only pushes search and inventory further down the phone screen.
  if (tabs.length <= 1 && !canGoBack && !canGoForward && currentHref === fallbackHref) return null;

  return (
    <nav aria-label="Page navigation" className="mx-auto flex w-full max-w-7xl min-w-0 items-center gap-2 px-3 py-2 sm:px-6">
      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[#DCEAE7] bg-white p-1 shadow-sm">
        <button type="button" onClick={() => canGoBack ? navigate(-1) : navigate(fallbackHref)} disabled={!canGoBack && currentHref === fallbackHref} aria-label="Go to previous page" title="Previous page" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#176B87] hover:bg-[#EEF7F5] disabled:cursor-not-allowed disabled:opacity-35">
          <ArrowLeft size={17} />
        </button>
        <button type="button" onClick={() => navigate(1)} disabled={!canGoForward} aria-label="Go forward to next page" title="Next page" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#176B87] hover:bg-[#EEF7F5] disabled:cursor-not-allowed disabled:opacity-35">
          <ArrowRight size={17} />
        </button>
        <button type="button" onClick={() => navigate('/')} aria-label="Go to KAYARD KE home" title="Home" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#176B87] hover:bg-[#EEF7F5]">
          <Home size={16} />
        </button>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" role="tablist" aria-label="Recently visited pages">
        {tabs.map((tab) => {
          const active = tab.href === currentHref;
          return (
            <button key={tab.key} type="button" role="tab" aria-selected={active} onClick={() => { if (tab.href !== currentHref) navigate(tab.href); }} title={tab.label}
              className={`max-w-[11rem] shrink-0 truncate rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${active ? 'border-[#176B87] bg-[#EAF5F3] text-[#0A3340]' : 'border-transparent bg-white/70 text-[#607780] hover:border-[#DCEAE7] hover:bg-white'}`}>
              {tab.label}
            </button>
          );
        })}
      </div>
      <span className="hidden shrink-0 text-xs font-semibold text-[#607780] md:block" aria-live="polite">{currentLabel}</span>
    </nav>
  );
}
