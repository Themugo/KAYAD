// ============================================================
// KAYAD AUTOMOTIVE SERVICES - FINDER FILTERS
// Driven by the canonical taxonomy served by the backend. No local specialty lists.
// ============================================================

import { MapPin, Crosshair } from 'lucide-react';
import type { SearchProvidersParams } from '../services/api';
import type { ServiceTaxonomy } from '../types/inspection';

export type LocationState = 'idle' | 'asking' | 'granted' | 'denied' | 'unavailable';

interface ProviderFiltersProps {
  filters: SearchProvidersParams;
  onChange: (filters: Partial<SearchProvidersParams>) => void;
  taxonomy: ServiceTaxonomy | null;
  makes: string[];
  locationState: LocationState;
  onUseLocation: () => void;
  onClearLocation: () => void;
}

const field = 'w-full px-3 py-2.5 rounded-lg border border-[#BDE5DE] outline-none focus:border-[#13B8A6] bg-white min-h-[44px]';

export default function ProviderFilters({ filters, onChange, taxonomy, makes, locationState, onUseLocation, onClearLocation }: ProviderFiltersProps) {
  const category = taxonomy?.categories.find((c) => c.code === filters.category) || null;
  const hasPoint = typeof filters.nearLat === 'number' && typeof filters.nearLng === 'number';

  return (
    <div className="rounded-xl p-5 md:p-6 shadow-md bg-white" role="group" aria-label="Refine providers">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div>
          <label htmlFor="f-make" className="block text-sm font-medium mb-1 text-[#12576D]">Vehicle make</label>
          <input
            id="f-make"
            list="f-make-list"
            className={field}
            placeholder={makes.length ? 'Choose or type a make' : 'e.g. Toyota'}
            value={filters.make || ''}
            onChange={(e) => onChange({ make: e.target.value || undefined })}
          />
          <datalist id="f-make-list">{makes.map((m) => <option key={m} value={m} />)}</datalist>
          <p className="text-xs text-[#64748B] mt-1">Matches businesses that serve this make or say they serve all makes.</p>
        </div>

        <div>
          <label htmlFor="f-power" className="block text-sm font-medium mb-1 text-[#12576D]">Fuel / power</label>
          <select id="f-power" className={field} value={filters.powertrain || ''} onChange={(e) => onChange({ powertrain: e.target.value || undefined })}>
            <option value="">Any</option>
            {(taxonomy?.powertrains || []).map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
          </select>
          {category?.highRisk && <p className="text-xs text-[#64748B] mt-1">High-voltage work only lists businesses KAYAD has verified for it.</p>}
        </div>

        <div>
          <label htmlFor="f-county" className="block text-sm font-medium mb-1 text-[#12576D]">County</label>
          <input id="f-county" className={field} placeholder="e.g. Nairobi" value={filters.county || ''} onChange={(e) => onChange({ county: e.target.value || undefined })} />
          <label htmlFor="f-town" className="block text-sm font-medium mt-3 mb-1 text-[#12576D]">Town</label>
          <input id="f-town" className={field} placeholder="e.g. Westlands" value={filters.town || ''} onChange={(e) => onChange({ town: e.target.value || undefined })} />
        </div>

        <div>
          <span className="block text-sm font-medium mb-1 text-[#12576D]">Near me</span>
          {!hasPoint ? (
            <button type="button" onClick={onUseLocation} disabled={locationState === 'asking'} className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-lg border border-[#13B8A6] text-[#12576d] font-medium disabled:opacity-60">
              <Crosshair size={16} aria-hidden /> {locationState === 'asking' ? 'Asking your device…' : 'Use my location'}
            </button>
          ) : (
            <button type="button" onClick={onClearLocation} className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-lg border border-[#BDE5DE] text-[#12576D] font-medium">
              <MapPin size={16} aria-hidden /> Stop using my location
            </button>
          )}
          <p className="text-xs text-[#64748B] mt-1" role="status">
            {locationState === 'denied' && 'Location permission was declined. Enter a county or town instead.'}
            {locationState === 'unavailable' && 'Your device could not provide a location. Enter a county or town instead.'}
            {hasPoint && 'Distances are straight-line, from an approximate point. They are not travel times.'}
            {!hasPoint && locationState !== 'denied' && locationState !== 'unavailable' && 'Optional. We only ask when you press this, and send an approximate point (about 1 km).'}
          </p>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-[#D7E7E4] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Check label="Only businesses KAYAD verified for this service" checked={!!filters.verifiedOnly} disabled={!filters.category} onChange={(v) => onChange({ verifiedOnly: v || undefined })} />
        <Check label="Travels to the vehicle (mobile)" checked={!!filters.mobileOnly} onChange={(v) => onChange({ mobileOnly: v || undefined })} />
        <Check label="Has a workshop" checked={!!filters.workshopOnly} onChange={(v) => onChange({ workshopOnly: v || undefined })} />
        <Check label="Same day (declared)" checked={!!filters.sameDayAvailable} onChange={(v) => onChange({ sameDayAvailable: v || undefined })} />
        <Check label="Weekends (declared)" checked={!!filters.weekendAvailable} onChange={(v) => onChange({ weekendAvailable: v || undefined })} />
        <Check label="Commercial vehicles (declared)" checked={!!filters.commercialVehicles} onChange={(v) => onChange({ commercialVehicles: v || undefined })} />
        <Check label="Luxury vehicles (declared)" checked={!!filters.luxuryVehicles} onChange={(v) => onChange({ luxuryVehicles: v || undefined })} />
        {hasPoint && <Check label="Only where my location is inside their stated service area" checked={!!filters.withinServiceRadius} onChange={(v) => onChange({ withinServiceRadius: v || undefined })} />}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => onChange({ make: undefined, powertrain: undefined, county: undefined, town: undefined, verifiedOnly: undefined, mobileOnly: undefined, workshopOnly: undefined, sameDayAvailable: undefined, weekendAvailable: undefined, commercialVehicles: undefined, luxuryVehicles: undefined, withinServiceRadius: undefined, atVehicleLocation: undefined })}
          className="px-4 min-h-[44px] rounded-lg font-medium bg-[#EEF7F5] text-[#12576D]"
        >
          Reset refinements
        </button>
      </div>
    </div>
  );
}

function Check({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-2 text-sm min-h-[44px] items-center ${disabled ? 'opacity-50' : 'cursor-pointer'} text-[#12576D]`}>
      <input type="checkbox" className="w-4 h-4 rounded accent-[#13B8A6]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
