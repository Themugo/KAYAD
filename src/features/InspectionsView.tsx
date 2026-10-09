import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, BriefcaseBusiness, ClipboardCheck, FileCheck, Loader2, MapPin, RefreshCw, ShieldCheck, UserCheck,
} from 'lucide-react';
import type { UserProfile, Vehicle } from '../types';
import { getMyInspections, InspectionApiError } from '../services/inspectionApi';
import { inspectionApi } from './InspectionMarketplace/services/api';
import { useSocket } from '../context/SocketContext';
import { Button } from '../components/ui';
import {
  INSPECTION_STAGES, InspectionRecord, kayadOrderToRecord, providerBookingToRecord, sortRecords,
} from './InspectionsView/inspectionJourney';
import { RequestInspectionModal } from './InspectionsView/RequestInspectionModal';
import { InspectionReportModal } from './InspectionsView/InspectionReportModal';
import { CancelBookingModal, PayBookingModal } from './InspectionsView/BookingActions';
import { ProviderApplicationModal } from './InspectionsView/ProviderApplicationModal';
import { ProviderServicesModal } from './InspectionsView/ProviderServicesModal';

export type InspectionsTab = 'service' | 'mine' | 'reports';
export type InspectionLaunchAction = 'request' | 'apply-provider' | null;

interface InspectionsViewProps {
  vehicles: Vehicle[];
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  /** Vehicle the customer came from (vehicle details). Preselects the request form. */
  initialSelectedVehicle?: Vehicle | null;
  /** Opens a tab on arrival (e.g. "mine" after a booking). */
  initialTab?: InspectionsTab;
  /** Opens a flow on arrival. Re-applied whenever the parent remounts this view with a new key. */
  launchAction?: InspectionLaunchAction;
  onViewVehicleDetails?: (vehicleId: string) => void;
  onOpenInspectionMarketplace?: () => void;
}

const TONE: Record<string, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  active: 'bg-[#E8F5F3] text-[#0F5D73] border-[#CDE9E5]',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
};

const TABS: Array<{ id: InspectionsTab; label: string }> = [
  { id: 'service', label: 'Get an inspection' },
  { id: 'mine', label: 'My inspections' },
  { id: 'reports', label: 'Reports' },
];

interface Loaded {
  records: InspectionRecord[];
  kayadError: string | null;
  providerError: string | null;
}

/** Loads both canonical sources independently: one failing must not hide the other. */
function useInspectionRecords(signedIn: boolean) {
  const [state, setState] = useState<Loaded>({ records: [], kayadError: null, providerError: null });
  const [loading, setLoading] = useState(signedIn);
  const alive = useRef(true);
  const seq = useRef(0);

  const load = useCallback(async (quiet = false) => {
    if (!signedIn) {
      setState({ records: [], kayadError: null, providerError: null });
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    if (!quiet) setLoading(true);
    const [kayad, provider] = await Promise.allSettled([getMyInspections(), inspectionApi.getCustomerBookings()]);
    if (!alive.current || mine !== seq.current) return;
    const records: InspectionRecord[] = [];
    let kayadError: string | null = null;
    let providerError: string | null = null;
    if (kayad.status === 'fulfilled') records.push(...(kayad.value.orders || []).map(kayadOrderToRecord));
    else kayadError = kayad.reason instanceof InspectionApiError && kayad.reason.message ? kayad.reason.message : 'Your KAYAD inspection requests could not be loaded.';
    if (provider.status === 'fulfilled') records.push(...(provider.value?.bookings || []).map(providerBookingToRecord));
    else providerError = provider.reason instanceof Error && provider.reason.message ? provider.reason.message : 'Your provider bookings could not be loaded.';
    setState({ records: sortRecords(records), kayadError, providerError });
    setLoading(false);
  }, [signedIn]);

  useEffect(() => {
    alive.current = true;
    void load();
    return () => { alive.current = false; };
  }, [load]);

  return { ...state, loading, reload: () => load(false), refresh: () => load(true) };
}

const StageTrack: React.FC<{ record: InspectionRecord }> = ({ record }) => {
  const stage = record.status.stage;
  if (stage < 0) return null;
  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label="Inspection progress">
      {INSPECTION_STAGES.map((name, i) => (
        <li key={name} className="min-w-0" aria-current={i === stage ? 'step' : undefined}>
          <span className={`block h-1.5 rounded-full ${i <= stage ? 'bg-[#13B8A6]' : 'bg-slate-200'}`} />
          <span className={`block mt-1 text-[10px] sm:text-[11px] truncate ${i === stage ? 'font-bold text-[#0F5D73]' : 'text-slate-500'}`}>
            {name}<span className="sr-only">{i < stage ? ' (done)' : i === stage ? ' (current)' : ' (upcoming)'}</span>
          </span>
        </li>
      ))}
    </ol>
  );
};

export const InspectionsView: React.FC<InspectionsViewProps> = ({
  vehicles,
  user,
  onOpenAuth,
  initialSelectedVehicle,
  initialTab,
  launchAction,
  onViewVehicleDetails,
  onOpenInspectionMarketplace,
}) => {
  const socket = useSocket();
  const signedIn = Boolean(user);
  const [tab, setTab] = useState<InspectionsTab>(initialTab || 'service');
  const [requestOpen, setRequestOpen] = useState(launchAction === 'request');
  const [providerOpen, setProviderOpen] = useState(launchAction === 'apply-provider');
  const [manageOpen, setManageOpen] = useState(false);
  const [reportRecord, setReportRecord] = useState<InspectionRecord | null>(null);
  const [payRecord, setPayRecord] = useState<InspectionRecord | null>(null);
  const [cancelRecord, setCancelRecord] = useState<InspectionRecord | null>(null);
  const { records, kayadError, providerError, loading, reload, refresh } = useInspectionRecords(signedIn);

  const reportRecords = useMemo(() => records.filter((r) => r.hasReport), [records]);
  const shown = tab === 'reports' ? reportRecords : records;

  // Realtime is only a reconcile signal: the API stays the source of truth.
  const kayadIds = records.filter((r) => r.product === 'kayad').map((r) => r.reference).join(',');
  useEffect(() => {
    if (!signedIn || !kayadIds) return;
    const channels = kayadIds.split(',').map((id) => socket.joinInspection(id, { onUpdate: () => { void refresh(); } })).filter(Boolean);
    return () => channels.forEach((c) => c && socket.leaveChannel(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, kayadIds]);

  // Legacy cross-page event used by older entry points.
  useEffect(() => {
    const open = () => setProviderOpen(true);
    window.addEventListener('kayad:open-inspection-provider-application', open);
    return () => window.removeEventListener('kayad:open-inspection-provider-application', open);
  }, []);

  const startRequest = () => {
    if (!signedIn) { onOpenAuth?.(); return; }
    setRequestOpen(true);
  };

  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    const move = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (e.key === 'Home' || e.key === 'End' || move) {
      e.preventDefault();
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (index + move + TABS.length) % TABS.length;
      setTab(TABS[next].id);
      document.getElementById(`insp-tab-${TABS[next].id}`)?.focus();
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <section className="rounded-3xl bg-[#0F5D73] text-white p-6 sm:p-10" aria-labelledby="insp-title">
        <p className="text-xs font-bold uppercase tracking-wider text-[#B8EEE7]">Pre-purchase inspection</p>
        <h1 id="insp-title" className="mt-2 text-2xl sm:text-4xl font-black font-display max-w-2xl">Know the car before you pay for it</h1>
        <p className="mt-3 text-sm sm:text-base text-slate-100 max-w-2xl">Have a vehicle inspected before you commit. Ask KAYAD to arrange an inspection of a car listed on KAYAD, or book a verified independent inspection business. Every request is recorded and every step is tracked below.</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button variant="accent" size="lg" className="font-bold" onClick={startRequest}>Request a KAYAD inspection</Button>
          <Button variant="outline" size="lg" className="!text-white !border-white/60" onClick={() => onOpenInspectionMarketplace?.()}>Browse inspection providers</Button>
        </div>
      </section>

      <div role="tablist" aria-label="Inspection sections" className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            id={`insp-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls="insp-panel"
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onTabKey(e, i)}
            className={`px-4 py-3 min-h-[44px] text-sm font-bold whitespace-nowrap border-b-2 -mb-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#176B87] ${tab === t.id ? 'border-[#13B8A6] text-[#0F5D73]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="insp-panel" role="tabpanel" aria-labelledby={`insp-tab-${tab}`} tabIndex={-1}>
        {tab === 'service' ? (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-5">
              <article className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col">
                <ShieldCheck className="w-6 h-6 text-[#176B87]" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-black text-[#0F5D73]">KAYAD vehicle inspection</h2>
                <p className="mt-1.5 text-sm text-slate-600 flex-1">For a vehicle listed on KAYAD. You submit a request and KAYAD assigns one of its verified, independent inspectors. The inspection is carried out by that inspector’s own business, whose name appears once assigned. Submitting takes no payment.</p>
                <Button variant="primary" className="mt-5 self-start" onClick={startRequest}>{signedIn ? 'Request an inspection' : 'Sign in to request'}</Button>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col">
                <UserCheck className="w-6 h-6 text-[#176B87]" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-black text-[#0F5D73]">Book a verified provider</h2>
                <p className="mt-1.5 text-sm text-slate-600 flex-1">Compare independent inspection businesses, choose a package and a time slot, and pay by M-Pesa to confirm the booking. Looking for a garage, mechanic or specialist instead? The same finder lists them; KAYAD does not take repair bookings or payments for those services yet.</p>
                <Button variant="secondary" className="mt-5 self-start" onClick={() => onOpenInspectionMarketplace?.()}>Browse providers <ArrowRight className="w-4 h-4" aria-hidden="true" /></Button>
              </article>
            </div>

            <section aria-labelledby="insp-next" className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 id="insp-next" className="text-base font-black text-[#0F5D73]">What happens next</h2>
              <ol className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                {[
                  [ClipboardCheck, 'Request or book', 'Your request is saved against the vehicle with a reference.'],
                  [UserCheck, 'Inspector assigned', 'An inspector is assigned and the status updates here.'],
                  [MapPin, 'Vehicle inspected', 'The inspector records findings and photos.'],
                  [FileCheck, 'Report in your account', 'The report appears under Reports. Only you can open it.'],
                ].map(([Icon, title, copy], i) => {
                  const I = Icon as typeof ClipboardCheck;
                  return (
                    <li key={title as string} className="flex gap-3">
                      <span className="w-8 h-8 shrink-0 rounded-full bg-[#E8F5F3] text-[#0F5D73] flex items-center justify-center"><I className="w-4 h-4" aria-hidden="true" /></span>
                      <span><strong className="block text-slate-800">{i + 1}. {title as string}</strong><span className="text-slate-600">{copy as string}</span></span>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section aria-labelledby="insp-providers" className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 id="insp-providers" className="text-sm font-black text-[#0F5D73] flex items-center gap-2"><BriefcaseBusiness className="w-4 h-4" aria-hidden="true" />Run an inspection business?</h2>
                <p className="text-xs text-slate-600 mt-1">Apply to be listed. Applications are reviewed by KAYAD and do not grant access automatically.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" className="min-h-[44px]" onClick={() => setProviderOpen(true)}>Apply as a provider</Button>
                {signedIn && <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => setManageOpen(true)}>My business and affiliations</Button>}
              </div>
            </section>
          </div>
        ) : !signedIn ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3">
            <p className="text-sm text-slate-700">Sign in to see your inspection requests, bookings and reports.</p>
            <Button variant="primary" onClick={onOpenAuth}>Sign in / Create account</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {(kayadError || providerError) && (
              <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
                {kayadError && <p>{kayadError}</p>}
                {providerError && <p>{providerError}</p>}
                {records.length > 0 && <p className="text-xs">Showing what could be loaded. The list above may be incomplete.</p>}
                <Button size="sm" className="min-h-[44px]" variant="secondary" onClick={() => void reload()}><RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again</Button>
              </div>
            )}
            {loading ? (
              <p role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-600"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading your inspections…</p>
            ) : shown.length === 0 ? (
              !kayadError && !providerError && (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3">
                  <p className="text-base font-bold text-slate-800">{tab === 'reports' ? 'No reports yet' : 'No inspections yet'}</p>
                  <p className="text-sm text-slate-600">{tab === 'reports' ? 'A report appears here once an inspection you requested or booked is complete.' : 'Requests and bookings you make appear here with their progress.'}</p>
                  <Button variant="primary" onClick={() => setTab('service')}>Get an inspection</Button>
                </div>
              )
            ) : (
              <ul className="space-y-4">
                {shown.map((r) => (
                  <li key={r.key} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-[#0F5D73] break-words">{r.vehicleTitle}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{r.product === 'kayad' ? `KAYAD inspection${r.providerName ? ` · carried out by ${r.providerName}` : ''}` : `Provider booking${r.providerName ? ` · ${r.providerName}` : ''}`} · Ref <span className="font-mono break-all">{r.reference}</span></p>
                      </div>
                      <span className={`self-start text-xs font-bold px-3 py-1 rounded-full border ${TONE[r.status.tone]}`}>{r.status.label}</span>
                    </div>
                    <StageTrack record={r} />
                    <p className="text-sm text-slate-600">{r.status.detail}</p>
                    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
                      {r.location && <div className="flex gap-2"><dt className="text-slate-400">Location</dt><dd>{r.location}</dd></div>}
                      {r.inspectorName && <div className="flex gap-2"><dt className="text-slate-400">Inspector</dt><dd>{r.inspectorName}</dd></div>}
                      {r.packageName && <div className="flex gap-2"><dt className="text-slate-400">Package</dt><dd>{r.packageName}</dd></div>}
                      {r.schedule && <div className="flex gap-2"><dt className="text-slate-400">Slot</dt><dd>{r.schedule}</dd></div>}
                      {r.priceText && <div className="flex gap-2"><dt className="text-slate-400">{r.product === 'provider' ? 'Price' : 'Quoted fee'}</dt><dd>{r.priceText}</dd></div>}
                      {r.paymentText && <div className="flex gap-2"><dt className="text-slate-400">Payment</dt><dd>{r.paymentText}</dd></div>}
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      {r.hasReport && <Button size="sm" className="min-h-[44px]" variant="primary" onClick={() => setReportRecord(r)}><FileCheck className="w-4 h-4" aria-hidden="true" /> View report</Button>}
                      {r.canPay && <Button size="sm" className="min-h-[44px]" variant="accent" onClick={() => setPayRecord(r)}>Pay now</Button>}
                      {r.canPay && <Button size="sm" className="min-h-[44px]" variant="secondary" onClick={() => setCancelRecord(r)}>Cancel booking</Button>}
                      {r.vehicleId && onViewVehicleDetails && <Button size="sm" className="min-h-[44px]" variant="ghost" onClick={() => onViewVehicleDetails(r.vehicleId!)}>View vehicle</Button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {requestOpen && (
        <RequestInspectionModal
          isOpen
          onClose={() => setRequestOpen(false)}
          vehicles={vehicles}
          initialVehicle={initialSelectedVehicle}
          onSubmitted={() => { void refresh(); }}
          onViewMyInspections={() => setTab('mine')}
          onSessionExpired={() => { setRequestOpen(false); onOpenAuth?.(); }}
        />
      )}
      <InspectionReportModal record={reportRecord} onClose={() => setReportRecord(null)} />
      <PayBookingModal record={payRecord} onClose={() => setPayRecord(null)} onPaid={() => { void refresh(); }} />
      <CancelBookingModal record={cancelRecord} onClose={() => setCancelRecord(null)} onCancelled={() => { void refresh(); }} />
      {signedIn && <ProviderServicesModal isOpen={manageOpen} onClose={() => setManageOpen(false)} />}
      <ProviderApplicationModal isOpen={providerOpen} signedIn={signedIn} onClose={() => setProviderOpen(false)} onOpenAuth={onOpenAuth} />
    </div>
  );
};

export default InspectionsView;
