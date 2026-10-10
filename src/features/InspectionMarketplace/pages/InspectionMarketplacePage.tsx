// ============================================================
// KAYAD AUTOMOTIVE SERVICES - FINDER (inspection marketplace route)
//
// One canonical provider network. KAYAD is the technology platform: independent
// businesses perform the work. This page only DISCOVERS businesses; the single
// service with a booking + payment + report path is the pre-purchase inspection.
// Nothing here fabricates ratings, distances, ETAs, coverage or availability.
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Wrench, Shield, Info, PhoneCall } from 'lucide-react';
import { inspectionApi, automotiveApi, SearchProvidersParams } from '../services/api';
import type { InspectionProvider, ServiceTaxonomy } from '../types/inspection';
import ProviderCard from '../components/ProviderCard';
import ProviderFilters, { LocationState } from '../components/ProviderFilters';
import BookingFlow from './BookingFlow';
import ProviderProfilePage from './ProviderProfilePage';

const C = { navy: '#12576D', bg: '#F5F8F8', white: '#ffffff', teal: '#0F766E', soft: '#64748b', line: '#D7E7E4' };

interface InspectionMarketplacePageProps {
  /** Opens the customer's own inspection tracker (My inspections). */
  onViewMyInspections?: () => void;
  /** Opens the authenticated provider application. */
  onApplyAsProvider?: () => void;
  /** Optional starting point, e.g. when a vehicle is already known. */
  initialFilters?: Partial<SearchProvidersParams>;
}

const PAGE_SIZE = 12;

/** Round to ~1 km before it leaves the browser: enough to rank by distance, not precise enough to locate a person. */
const coarse = (n: number) => Math.round(n * 100) / 100;

export default function InspectionMarketplacePage({ onViewMyInspections, onApplyAsProvider, initialFilters }: InspectionMarketplacePageProps = {}) {
  const [providers, setProviders] = useState<InspectionProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ reference?: string } | null>(null);
  const [total, setTotal] = useState(0);
  const [showRefine, setShowRefine] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<InspectionProvider | null>(null);
  const [selectedProviderLoading, setSelectedProviderLoading] = useState(false);
  const [selectedProviderError, setSelectedProviderError] = useState<string | null>(null);
  const [bookingProvider, setBookingProvider] = useState<InspectionProvider | null>(null);
  const [taxonomy, setTaxonomy] = useState<ServiceTaxonomy | null>(null);
  const [taxonomyFailed, setTaxonomyFailed] = useState(false);
  const [makes, setMakes] = useState<string[]>([]);
  const [symptom, setSymptom] = useState<string>('');
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [filters, setFilters] = useState<SearchProvidersParams>({ page: 1, limit: PAGE_SIZE, ...initialFilters });
  const requestSeq = useRef(0);

  useEffect(() => {
    let alive = true;
    automotiveApi.getServiceTaxonomy().then((t) => { if (alive) setTaxonomy(t); }).catch(() => { if (alive) setTaxonomyFailed(true); });
    automotiveApi.getVehicleMakes().then((m) => { if (alive) setMakes(m); }).catch(() => { /* free-text make still works */ });
    return () => { alive = false; };
  }, []);

  const fetchProviders = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await inspectionApi.searchProviders(filters);
      if (seq !== requestSeq.current) return; // a newer search superseded this one
      setProviders(response.items || []);
      setTotal(response.total || 0);
    } catch (error) {
      if (seq !== requestSeq.current) return;
      console.error('Failed to fetch providers:', error);
      // A failed request is not "no providers": say so and let the customer retry.
      setProviders([]);
      setTotal(0);
      setLoadError('We could not load businesses right now.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void fetchProviders(); }, [fetchProviders]);

  const category = useMemo(() => taxonomy?.categories.find((c) => c.code === filters.category) || null, [taxonomy, filters.category]);
  const suggested = useMemo(() => taxonomy?.symptoms.find((s) => s.code === symptom)?.suggests || [], [taxonomy, symptom]);

  const handleSelectProvider = async (provider: InspectionProvider) => {
    setSelectedProviderLoading(true);
    setSelectedProviderError(null);
    try {
      const full = await inspectionApi.getProviderProfile(provider.id);
      setSelectedProvider(full);
    } catch (error) {
      console.error('Failed to load provider profile:', error);
      setSelectedProviderError('Could not load this business. Please try again.');
    } finally {
      setSelectedProviderLoading(false);
    }
  };

  const update = (patch: Partial<SearchProvidersParams>) => setFilters((prev) => ({ ...prev, ...patch, page: 1 }));

  const chooseCategory = (code?: string) => {
    // Changing the service resets constraints that only make sense for the previous one.
    update({ category: code, subcategory: undefined, verifiedOnly: undefined, atVehicleLocation: code === 'roadside_recovery' ? true : undefined });
  };

  const useLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setLocationState('unavailable'); return; }
    setLocationState('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationState('granted');
        update({ nearLat: coarse(pos.coords.latitude), nearLng: coarse(pos.coords.longitude) });
      },
      (err) => setLocationState(err && err.code === 1 ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };
  const clearLocation = () => { setLocationState('idle'); update({ nearLat: undefined, nearLng: undefined, withinServiceRadius: undefined, atVehicleLocation: category?.travelsToCustomer ? undefined : filters.atVehicleLocation }); };

  if (bookingProvider) {
    return (
      <BookingFlow
        provider={bookingProvider}
        onCancel={() => setBookingProvider(null)}
        onComplete={(_bookingId, reference) => {
          // Reached only after the server reported the booking paid.
          setBookingProvider(null);
          setSelectedProvider(null);
          setConfirmation({ reference });
        }}
      />
    );
  }

  if (selectedProvider) {
    return (
      <ProviderProfilePage
        provider={selectedProvider}
        loading={selectedProviderLoading}
        error={selectedProviderError}
        taxonomy={taxonomy}
        onBack={() => setSelectedProvider(null)}
        onBook={() => setBookingProvider(selectedProvider)}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / (filters.limit || PAGE_SIZE)));
  const page = filters.page || 1;
  const roadside = filters.category === 'roadside_recovery';
  const needsLocationForRoadside = roadside && typeof filters.nearLat !== 'number';
  const refinementsActive = Boolean(filters.make || filters.powertrain || filters.county || filters.town || filters.verifiedOnly || filters.mobileOnly || filters.workshopOnly || filters.sameDayAvailable || filters.weekendAvailable || filters.commercialVehicles || filters.luxuryVehicles || filters.withinServiceRadius || typeof filters.nearLat === 'number');

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
      <header className="py-10 md:py-12 px-4" style={{ backgroundColor: C.navy }}>
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-3 text-white">Find a verified inspector, garage or specialist</h1>
            <p className="text-base md:text-xl mb-5 max-w-3xl mx-auto text-[#B8EEE7]">
              Independent automotive businesses, checked by KAYAD, matched to your vehicle and what you need done.
            </p>
          </motion.div>
          <div role="note" className="max-w-3xl mx-auto rounded-xl bg-white/10 text-white/90 text-sm px-4 py-3 flex gap-2 items-start">
            <Info size={18} className="mt-0.5 shrink-0" aria-hidden />
            <p>KAYAD is a technology platform. The businesses listed are independent: they do the work, set their prices and are responsible for it. “Verified” means KAYAD reviewed the evidence shown. It reduces risk but is not a guarantee of any outcome.</p>
          </div>
          <div className="max-w-2xl mx-auto mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-[#DDF4F0]">
            <span>Run an automotive business?</span>
            <button type="button" className="font-bold text-[#B8EEE7] hover:text-white underline underline-offset-2 min-h-[44px] px-2" onClick={onApplyAsProvider}>Apply to join KAYAD</button>
          </div>
        </div>
      </header>

      {confirmation && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <div role="status" className="rounded-xl border border-[#CDE9E5] bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-[#12576d]">Booking paid and confirmed.</p>
              <p className="text-sm text-[#64748B]">
                {confirmation.reference ? <>Your reference is <strong className="font-mono">{confirmation.reference}</strong>. </> : null}
                Follow its status and open the report in My inspections.
              </p>
            </div>
            <div className="flex gap-2">
              {onViewMyInspections && <button type="button" onClick={onViewMyInspections} className="px-4 min-h-[44px] rounded-lg font-semibold text-white" style={{ backgroundColor: C.teal }}>View my inspections</button>}
              <button type="button" onClick={() => setConfirmation(null)} className="px-4 min-h-[44px] rounded-lg font-medium border border-[#D7E7E4] text-[#64748B]">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {/* What do you need? */}
      <section className="max-w-7xl mx-auto px-4 pt-8" aria-labelledby="need-heading">
        <h2 id="need-heading" className="text-xl md:text-2xl font-bold mb-1" style={{ color: C.navy }}>What do you need?</h2>
        <p className="text-sm mb-4" style={{ color: C.soft }}>Pick a service, or describe what is happening if you do not know the cause.</p>

        {taxonomyFailed && <p role="alert" className="text-sm text-red-700 mb-3">Service categories could not be loaded. You can still browse all businesses below.</p>}

        <div className="mb-4">
          <label htmlFor="symptom" className="block text-sm font-medium mb-1" style={{ color: C.navy }}>Not sure what is wrong?</label>
          <select id="symptom" className="w-full sm:w-96 px-3 py-2.5 rounded-lg border border-[#BDE5DE] bg-white min-h-[44px]" value={symptom} onChange={(e) => setSymptom(e.target.value)} disabled={!taxonomy}>
            <option value="">Choose what you notice…</option>
            {(taxonomy?.symptoms || []).map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>
          {symptom && suggested.length > 0 && (
            <p className="text-sm mt-2" style={{ color: C.soft }} role="status">
              These are areas to look in, not a diagnosis. Only a qualified mechanic can tell you what is wrong.{' '}
              Suggested: {suggested.map((code, i) => (
                <span key={code}>{i > 0 && ', '}<button type="button" className="underline font-semibold min-h-[24px]" style={{ color: C.navy }} onClick={() => chooseCategory(code)}>{taxonomy?.categories.find((c) => c.code === code)?.label || code}</button></span>
              ))}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Service categories">
          <Chip active={!filters.category} onClick={() => chooseCategory(undefined)}>All services</Chip>
          {(taxonomy?.categories || []).map((c) => (
            <Chip key={c.code} active={filters.category === c.code} onClick={() => chooseCategory(c.code)}>
              {c.label}{c.bookable ? ' · bookable on KAYAD' : ''}
            </Chip>
          ))}
        </div>

        {category && (
          <div className="mt-4 rounded-xl border bg-white px-4 py-3 text-sm" style={{ borderColor: C.line, color: C.soft }}>
            <p><strong style={{ color: C.navy }}>{category.label}.</strong> {category.description}</p>
            {category.bookable ? (
              <p className="mt-1">You can book and pay for this service through KAYAD. The inspection is carried out by the independent business you choose.</p>
            ) : (
              <p className="mt-1">KAYAD helps you find these businesses but does not take bookings or payments for this service yet. Contact the business directly to arrange the work and agree the price.</p>
            )}
            {category.highRisk && <p className="mt-1">Because high-voltage work is dangerous, only businesses whose qualification KAYAD has verified are listed for this service.</p>}
          </div>
        )}

        {roadside && (
          <div role="note" className="mt-4 rounded-xl border-2 border-[#BDE5DE] bg-[#F3FAF9] px-4 py-3 text-sm text-[#0A3340] flex gap-2">
            <PhoneCall size={18} className="mt-0.5 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">KAYAD does not dispatch, track or guarantee roadside help.</p>
              <p>These businesses say they travel to vehicles. KAYAD cannot tell you whether anyone is available now or how long they will take: call them directly. If anyone is in danger, call emergency services (999 or 112) first.</p>
              {needsLocationForRoadside && <p className="mt-1">To show only businesses whose stated service area covers where you are, share your location below or enter a county. Without it we cannot say who covers you.</p>}
            </div>
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 py-6">
        <button type="button" onClick={() => setShowRefine((v) => !v)} aria-expanded={showRefine} aria-controls="refine-panel" className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg border border-[#BDE5DE] bg-white font-medium" style={{ color: C.navy }}>
          <SlidersHorizontal size={16} aria-hidden /> Vehicle, location and other refinements{refinementsActive ? ' (active)' : ''}
        </button>
        {showRefine && (
          <div id="refine-panel" className="mt-4">
            <ProviderFilters filters={filters} onChange={update} taxonomy={taxonomy} makes={makes} locationState={locationState} onUseLocation={useLocation} onClearLocation={clearLocation} />
          </div>
        )}
      </section>

      {selectedProviderLoading && <div className="max-w-7xl mx-auto px-4 pb-4 text-sm" role="status" style={{ color: C.soft }}>Loading business…</div>}
      {selectedProviderError && <div className="max-w-7xl mx-auto px-4 pb-4 text-sm text-red-700" role="alert">{selectedProviderError}</div>}

      <section className="max-w-7xl mx-auto px-4 pb-12" aria-live="polite">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-5">
          <p style={{ color: C.soft }}>
            {loading ? 'Searching…' : `${total} ${total === 1 ? 'business' : 'businesses'} found`}
          </p>
          <p className="text-xs" style={{ color: C.soft }}>
            Order: {typeof filters.nearLat === 'number' ? 'nearest first, then verified' : 'verified first, then by name'}. Not ranked by popularity or payment.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
            {[1, 2, 3].map((i) => <div key={i} className="animate-pulse rounded-xl h-80 bg-white" />)}
          </div>
        ) : loadError ? (
          <div role="alert" className="text-center py-12">
            <Wrench className="mx-auto mb-4" size={56} style={{ color: '#5AAFA4' }} aria-hidden />
            <h3 className="text-xl font-semibold mb-2" style={{ color: C.navy }}>Businesses could not be loaded</h3>
            <p style={{ color: C.soft }}>{loadError}</p>
            <button type="button" onClick={() => void fetchProviders()} className="mt-4 px-5 min-h-[44px] rounded-lg font-semibold text-white" style={{ backgroundColor: C.teal }}>Try again</button>
          </div>
        ) : providers.length === 0 ? (
          <EmptyState filters={filters} category={category?.label} onBroaden={update} onClearAll={() => { setLocationState('idle'); setFilters({ page: 1, limit: PAGE_SIZE }); setSymptom(''); }} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => <ProviderCard key={provider.id} provider={provider} taxonomy={taxonomy} onSelect={handleSelectProvider} />)}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="flex justify-center items-center gap-2 mt-8" aria-label="Pagination">
            <button type="button" onClick={() => setFilters((p) => ({ ...p, page: page - 1 }))} disabled={page <= 1} className="px-4 min-h-[44px] rounded-lg font-medium disabled:opacity-50 bg-white" style={{ color: C.navy }}>Previous</button>
            <span className="px-4" style={{ color: C.soft }}>Page {page} of {totalPages}</span>
            <button type="button" onClick={() => setFilters((p) => ({ ...p, page: page + 1 }))} disabled={page >= totalPages} className="px-4 min-h-[44px] rounded-lg font-medium disabled:opacity-50 bg-white" style={{ color: C.navy }}>Next</button>
          </nav>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="rounded-xl border bg-white px-5 py-4 text-sm text-[#64748B]" style={{ borderColor: C.line }}>
          <div className="flex gap-2"><Shield size={18} className="mt-0.5 shrink-0 text-[#0F766E]" aria-hidden />
            <p><span className="font-semibold text-[#12576d]">How businesses get listed:</span> each application is reviewed by a KAYAD administrator against submitted evidence, and only active, verified businesses appear here. “Verified” for a service means an administrator reviewed the evidence for that service; “declared” means the business says so and KAYAD has not verified it. KAYAD does not currently show prices, ratings or availability it has not been given.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-4 min-h-[44px] rounded-full text-sm font-medium border transition-colors ${active ? 'text-white border-transparent shadow-md' : 'bg-white text-[#12576D] border-[#BDE5DE] hover:bg-[#F6FAF9]'}`}
      style={active ? { backgroundColor: C.teal } : undefined}
    >
      {children}
    </button>
  );
}

/** No match is explained, and a sensible broader search is one click away. Nothing is invented to fill the gap. */
function EmptyState({ filters, category, onBroaden, onClearAll }: { filters: SearchProvidersParams; category?: string; onBroaden: (p: Partial<SearchProvidersParams>) => void; onClearAll: () => void }) {
  const options: Array<{ label: string; patch: Partial<SearchProvidersParams>; show: boolean }> = [
    { label: 'Include businesses that have not been verified for this service yet', patch: { verifiedOnly: undefined }, show: !!filters.verifiedOnly },
    { label: 'Any vehicle make', patch: { make: undefined }, show: !!filters.make },
    { label: 'Any fuel or power type', patch: { powertrain: undefined }, show: !!filters.powertrain },
    { label: 'Search the whole country, not just this town', patch: { town: undefined }, show: !!filters.town },
    { label: 'Search every county', patch: { county: undefined, town: undefined }, show: !!filters.county },
    { label: 'Stop limiting by my location', patch: { nearLat: undefined, nearLng: undefined, withinServiceRadius: undefined, maxDistanceKm: undefined }, show: typeof filters.nearLat === 'number' },
    { label: 'Show all services', patch: { category: undefined, subcategory: undefined, atVehicleLocation: undefined, verifiedOnly: undefined }, show: !!filters.category },
  ];
  const shown = options.filter((o) => o.show);
  return (
    <div className="text-center py-10" role="status">
      <Wrench className="mx-auto mb-4" size={56} style={{ color: '#5AAFA4' }} aria-hidden />
      <h3 className="text-xl font-semibold mb-2" style={{ color: C.navy }}>No matching businesses{category ? ` for ${category}` : ''}</h3>
      <p className="max-w-xl mx-auto" style={{ color: C.soft }}>
        No active, verified business currently matches everything you chose. That does not mean no one can help: it means KAYAD has no listed business that fits every filter. Try widening the search.
      </p>
      <div className="mt-5 flex flex-col sm:flex-row flex-wrap gap-2 justify-center">
        {shown.map((o) => <button key={o.label} type="button" onClick={() => onBroaden(o.patch)} className="px-4 min-h-[44px] rounded-lg border font-medium bg-white text-[#12576D]" style={{ borderColor: C.line }}>{o.label}</button>)}
        <button type="button" onClick={onClearAll} className="px-4 min-h-[44px] rounded-lg font-semibold text-white" style={{ backgroundColor: C.teal }}>Clear everything</button>
      </div>
    </div>
  );
}
