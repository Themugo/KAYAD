import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { UserProfile } from '../types';
import { getEscrowProgram } from '../services/escrowApi';
import { PublicEscrowExplainer, HowDealsStart, type ProgramState } from './escrow/PublicEscrowExplainer';
import { ParticipantEscrowDesk } from './escrow/ParticipantEscrowDesk';
import { EscrowOperationsDesk } from './escrow/EscrowOperationsDesk';
import { isStaffRole } from './escrow/escrowModel';

export type EscrowTab = 'journey' | 'deals' | 'create' | 'operations';

interface EscrowViewProps {
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  initialTab?: EscrowTab;
  onNavigate?: (nav: string) => void;
}

const readDeepLink = (): string | null => {
  try { return new URLSearchParams(window.location.search).get('escrowId'); } catch { return null; }
};

/**
 * Escrow area. Three audiences, three surfaces:
 *  - everyone: what escrow is and whether it is currently offered (public /program)
 *  - signed-in participants: only their own deals (server-projected per viewer)
 *  - staff: operations desk (server enforces every capability)
 * The server is the authority for who may do what; the UI only decides what to offer.
 */
export const EscrowView: React.FC<EscrowViewProps> = ({ user, onOpenAuth, initialTab = 'journey', onNavigate }) => {
  const deepLink = readDeepLink();
  const signedIn = Boolean(user);
  const staff = isStaffRole(user?.role as string | undefined);
  const [tab, setTab] = useState<EscrowTab>(deepLink && signedIn ? 'deals' : initialTab);
  const [program, setProgram] = useState<ProgramState>({ status: 'loading' });
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const loadProgram = useCallback(async () => {
    setProgram({ status: 'loading' });
    try { setProgram({ status: 'ready', program: await getEscrowProgram() }); }
    catch { setProgram({ status: 'unavailable' }); }
  }, []);
  useEffect(() => { void loadProgram(); }, [loadProgram]);

  const tabs: Array<{ id: EscrowTab; label: string }> = [
    { id: 'journey', label: 'How escrow works' },
    { id: 'create', label: 'How a deal starts' },
    { id: 'deals', label: 'My escrow deals' },
    ...(staff ? [{ id: 'operations' as const, label: 'Operations' }] : []),
  ];
  const active = tabs.some((t) => t.id === tab) ? tab : 'journey';

  const onKey = (e: React.KeyboardEvent, i: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next >= 0) { e.preventDefault(); setTab(tabs[next].id); tabRefs.current[tabs[next].id]?.focus(); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Escrow</h1>
        <p className="mt-1 text-sm text-slate-600">Where a purchase made through KAYAD stands, and what happens next.</p>
      </header>

      <div role="tablist" aria-label="Escrow sections" className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t, i) => (
          <button key={t.id} ref={(el) => { tabRefs.current[t.id] = el; }} role="tab" id={`escrow-tab-${t.id}`} aria-selected={active === t.id}
            aria-controls={`escrow-panel-${t.id}`} tabIndex={active === t.id ? 0 : -1} type="button" onClick={() => setTab(t.id)} onKeyDown={(e) => onKey(e, i)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${active === t.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`escrow-panel-${active}`} aria-labelledby={`escrow-tab-${active}`}>
        {active === 'journey' && (
          <PublicEscrowExplainer program={program} signedIn={signedIn} onRetryProgram={() => void loadProgram()} onOpenAuth={onOpenAuth}
            onOpenDeals={() => setTab('deals')} onNavigate={onNavigate} />
        )}
        {active === 'create' && <HowDealsStart signedIn={signedIn} onOpenDeals={() => setTab('deals')} onOpenAuth={onOpenAuth} />}
        {active === 'deals' && (signedIn
          ? <ParticipantEscrowDesk initialEscrowId={deepLink} onNavigate={onNavigate} />
          : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="font-medium text-slate-900">Sign in to see your escrow deals.</p>
              <p className="mt-1 text-sm text-slate-600">Deals are private to the buyer and seller.</p>
              {onOpenAuth && <button type="button" onClick={onOpenAuth} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">Sign in</button>}
            </div>
          ))}
        {active === 'operations' && staff && <EscrowOperationsDesk />}
      </div>
    </div>
  );
};

export default EscrowView;
