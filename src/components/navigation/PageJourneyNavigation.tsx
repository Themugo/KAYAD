import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Home, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { titleForRoute } from '../../utils/pageTitle';

type JourneyTab = { key: string; href: string; label: string };

// Shared across shell remounts when moving between standalone admin/dealer routes.
let rememberedJourneyTabs: JourneyTab[] = [];
// Real browser-history position -> the in-app location it holds. Lets Admin "Back" tell whether the previous entry is an
// admin page (go there) or not (go to the Admin Dashboard instead of leaking to the marketplace or My Account).
const hrefAtHistoryIndex = new Map<number, string>();
const isAdminHref = (href: string | undefined) => !!href && /^\/admin(\/|\?|#|$)/.test(href) && !href.startsWith('/admin/login');

function labelForLocation(pathname: string, search: string): string {
  const title = titleForRoute(pathname, search).replace(/\s*\|\s*KAYARD KE\s*$/, '');
  if (title !== "KAYAD | Kenya's Verified Automotive Marketplace & Escrow Vault") return title;
  const segment = pathname.split('/').filter(Boolean).pop();
  if (!segment) return 'Home';
  return segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Shared, history-aware page controls and recently visited page tabs. */
export default function PageJourneyNavigation({ fallbackHref = '/', dashboardHref, adminHref }: {
  fallbackHref?: string;
  /** Admin scope: the canonical Admin Dashboard. Enables the Dashboard shortcut and admin-aware Back. */
  dashboardHref?: string;
  /** Personal workspace for a staff member: a visible route back to the Admin Console. */
  adminHref?: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const currentHref = `${location.pathname}${location.search}${location.hash}`;
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isPersonalDashboard = (location.pathname === '/' || location.pathname === '') && searchParams.get('nav') === 'dashboard';
  const currentIndex = Number.isInteger(window.history.state?.idx) ? window.history.state.idx as number : 0;
  const furthestIndex = useRef(currentIndex);
  const [historyIndex, setHistoryIndex] = useState(currentIndex);
  const [tabs, setTabs] = useState<JourneyTab[]>(() => rememberedJourneyTabs);

  useEffect(() => {
    if (navigationType === 'PUSH' || navigationType === 'REPLACE') furthestIndex.current = currentIndex;
    else furthestIndex.current = Math.max(furthestIndex.current, currentIndex);
    setHistoryIndex(currentIndex);
    hrefAtHistoryIndex.set(currentIndex, currentHref);
    if (isPersonalDashboard) return;
    const tab: JourneyTab = {
      key: `${location.pathname}?${location.search}`,
      href: currentHref,
      label: labelForLocation(location.pathname, location.search),
    };
    setTabs((existing) => {
      const withoutCurrent = existing.filter((item) => item.key !== tab.key);
      return [...withoutCurrent, tab].slice(-6);
    });
  }, [currentHref, currentIndex, isPersonalDashboard, location.pathname, location.search, navigationType]);

  useEffect(() => {
    rememberedJourneyTabs = tabs.slice(-6);
  }, [tabs]);

  const adminScope = !!dashboardHref;
  const previousHref = hrefAtHistoryIndex.get(currentIndex - 1);
  const atDashboard = adminScope && location.pathname.replace(/\/+$/, '') === dashboardHref;
  // Admin scope: Back only follows history when the previous entry is a known admin page; otherwise it returns to the Dashboard.
  const backToAdminPage = adminScope && historyIndex > 0 && isAdminHref(previousHref);
  const canGoBack = adminScope ? backToAdminPage : historyIndex > 0;
  const canGoForward = historyIndex < furthestIndex.current;
  const currentLabel = useMemo(() => labelForLocation(location.pathname, location.search), [location.pathname, location.search]);
  const personalSectionLabel = currentLabel === 'Overview' ? 'Overview' : currentLabel;

  // A first visit to the home page has nothing to go back to, forward to or switch between: showing a
  // disabled Back/Forward bar plus a lone "Home" tab only pushes search and inventory further down the phone screen.
  if (!adminScope && !isPersonalDashboard && tabs.length <= 1 && !canGoBack && !canGoForward && currentHref === fallbackHref) return null;

  return (
    <nav aria-label="Page navigation" className="mx-auto flex w-full max-w-7xl min-w-0 items-center gap-2 px-3 py-2 sm:px-6">
      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[#DCEAE7] bg-white p-1 shadow-sm">
        <button type="button" onClick={() => canGoBack ? navigate(-1) : navigate(adminScope ? dashboardHref! : fallbackHref)} disabled={adminScope ? (!canGoBack && atDashboard) : (!canGoBack && currentHref === fallbackHref)} aria-label="Go to previous page" title="Previous page" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#176B87] hover:bg-[#EEF7F5] disabled:cursor-not-allowed disabled:opacity-35">
          <ArrowLeft size={17} />
        </button>
        <button type="button" onClick={() => navigate(1)} disabled={!canGoForward} aria-label="Go forward to next page" title="Next page" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#176B87] hover:bg-[#EEF7F5] disabled:cursor-not-allowed disabled:opacity-35">
          <ArrowRight size={17} />
        </button>
        {adminScope ? (
          <button type="button" onClick={() => navigate(dashboardHref!)} aria-label="Go to Admin Dashboard" title="Admin Dashboard" aria-current={atDashboard ? 'page' : undefined} data-admin-nav="dashboard" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#176B87] hover:bg-[#EEF7F5]">
            <LayoutDashboard size={16} />
          </button>
        ) : (
        <button type="button" onClick={() => navigate('/')} aria-label="Go to KAYARD KE home" title="Home" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#176B87] hover:bg-[#EEF7F5]">
          <Home size={16} />
        </button>
        )}
      </div>
      {isPersonalDashboard ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 px-2 text-xs font-semibold text-[#4A616A]" aria-label="Breadcrumb" aria-live="polite">
          <span className="shrink-0">Personal Account</span>
          <span aria-hidden="true" className="text-[#9AAEB4]">/</span>
          <span className="min-w-0 truncate text-[#0A3545]">{personalSectionLabel}</span>
          {adminHref && (
            <button type="button" onClick={() => navigate(adminHref)} data-admin-nav="return-to-admin" className="ml-auto inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#176B87] bg-white px-3 text-xs font-bold text-[#0A3340] hover:bg-[#EEF7F5]">
              <ShieldCheck size={14} aria-hidden="true" />Admin Console
            </button>
          )}
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" role="tablist" aria-label="Recently visited pages">
          {tabs.map((tab) => {
            const active = tab.href === currentHref;
            return (
              <button key={tab.key} type="button" role="tab" aria-selected={active} onClick={() => { if (tab.href !== currentHref) navigate(tab.href); }} title={tab.label}
                className={`max-w-[11rem] shrink-0 truncate rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${active ? 'border-[#176B87] bg-[#EAF5F3] text-[#0A3340]' : 'border-transparent bg-white/70 text-[#4A616A] hover:border-[#DCEAE7] hover:bg-white'}`}>
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
      {!isPersonalDashboard && <span className={`${adminScope ? 'hidden sm:block' : 'hidden md:block'} shrink-0 text-xs font-semibold text-[#4A616A]`} aria-live="polite">{currentLabel}</span>}
    </nav>
  );
}
