import React, { useState } from 'react';
import { X, Settings, RotateCcw, Eye, EyeOff, ShieldAlert, History, LayoutGrid, List, PanelLeftOpen, CarFront } from 'lucide-react';
import { HomePageConfig, ACCENT_THEME_OPTIONS } from '../hooks/useHomePageConfig';
import {
  EscrowRulesConfig,
  SellerEscrowRequirement,
  readEscrowRulesConfig,
  writeEscrowRulesConfig,
} from '../../Admin/hooks/escrowRulesConfig';
import { readLogEntries } from '../../Admin/hooks/adminAuditLog';
import type { Vehicle } from '../../../types';
import { adminAPI } from '../../../api/api';
import { heroPlacementsAPI } from '../../../api/api.exports';

interface HomePageAdminPanelProps {
  config: HomePageConfig;
  onUpdate: (updater: (prev: HomePageConfig) => HomePageConfig) => void;
  onReset: () => void;
  onClose: () => void;
  /** The signed-in admin's identity, used only to attribute escrow-rule
   * changes in the immutable audit log - not stored or modified by
   * this panel otherwise. */
  adminUser: { id: string; name: string };
  featuredVehicles: Vehicle[];
  heroFeaturedMode: 'all' | 'selected';
  heroFeaturedIds: string[];
  onSaveHeroVehicleSelection: (mode: 'all' | 'selected', ids: string[]) => Promise<void>;
}

const SECTION_LABELS: Record<keyof HomePageConfig['sectionVisibility'], string> = {
  searchTrustCard: 'Search & Trust Info Card',
  featuredPicks: 'Featured Picks Slider',
  savedSearchesAndInventoryHeader: 'Saved Searches, Inventory Count & Sort Controls',
  sponsorCardsInGrid: 'Sponsor/Partner Cards in Grid',
  recentlyViewed: 'Recently Viewed Carousel',
};

const REQUIREMENT_OPTIONS: { value: SellerEscrowRequirement; label: string }[] = [
  { value: 'mandatory', label: 'Mandatory' },
  { value: 'optional', label: 'Optional (seller opts in)' },
  { value: 'disabled', label: 'Disabled' },
];

/**
 * Admin-only panel for customizing the home page's existing sections,
 * text, and accent color. Not a general page builder - see
 * useHomePageConfig.ts's own top comment for the scope reasoning. Every
 * control here maps to a real, working piece of HomePageConfig; nothing
 * in this panel is decorative or non-functional.
 */
function formatAdminPrice(value: number) {
  if (value >= 1000000) return `Ksh ${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
  return `Ksh ${Math.round(value / 1000)}K`;
}

export const HomePageAdminPanel: React.FC<HomePageAdminPanelProps> = ({
  config, onUpdate, onReset, onClose, adminUser, featuredVehicles, heroFeaturedMode, heroFeaturedIds, onSaveHeroVehicleSelection
}) => {
  // Escrow rules have their own separate config/storage/audit-log
  // mechanism from HomePageConfig (readEscrowRulesConfig/
  // writeEscrowRulesConfig in escrowRulesConfig.ts) since
  // isEscrowApplicable() - a plain function called from many places,
  // not just the home page - reads it directly, independent of
  // whatever page happens to host this settings UI. Loaded into local
  // state here (not lifted into HomePageConfig) since it's genuinely a
  // different, cross-cutting business-rule config, not a home-page
  // display setting.
  const [escrowConfig, setEscrowConfig] = useState<EscrowRulesConfig>(readEscrowRulesConfig);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [heroMode, setHeroMode] = useState<'all' | 'selected'>(heroFeaturedMode);
  const [heroIds, setHeroIds] = useState<string[]>(heroFeaturedIds);
  const [savingHeroSelection, setSavingHeroSelection] = useState(false);
  const [heroCommercial, setHeroCommercial] = useState<any>({ enabled: true, rotationMode: 'equal', defaultSlotSeconds: 15, packages: [] });
  const [heroPlacements, setHeroPlacements] = useState<any[]>([]);
  const [savingHeroCommercial, setSavingHeroCommercial] = useState(false);
  const [placementDrafts, setPlacementDrafts] = useState<Record<string, { start: string; end: string }>>({});

  React.useEffect(() => {
    Promise.all([
      adminAPI.getConfig().catch(() => ({})),
      heroPlacementsAPI.adminAll?.().catch(() => ({ data: [] })) || Promise.resolve({ data: [] }),
    ]).then(([cfg, placements]) => {
      const raw = cfg?.config || cfg || {};
      if (raw.heroCommercial) setHeroCommercial(raw.heroCommercial);
      setHeroPlacements(Array.isArray(placements?.data) ? placements.data : []);
    });
  }, []);

  const toggleHeroVehicle = (id: string) => {
    setHeroIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const saveHeroSelection = async () => {
    setSavingHeroSelection(true);
    try {
      await onSaveHeroVehicleSelection(heroMode, heroIds);
    } finally {
      setSavingHeroSelection(false);
    }
  };

  const saveHeroCommercial = async () => {
    setSavingHeroCommercial(true);
    try {
      const current = await adminAPI.getConfig();
      await adminAPI.updateConfig({ ...(current?.config || current || {}), heroCommercial });
    } finally {
      setSavingHeroCommercial(false);
    }
  };

  const updateHeroPackage = (index: number, field: 'seconds' | 'price' | 'label', value: string) => {
    setHeroCommercial((prev: any) => ({ ...prev, packages: (prev.packages || []).map((pkg: any, i: number) => i === index ? { ...pkg, [field]: field === 'label' ? value : Number(value) } : pkg) }));
  };

  const schedulePlacement = async (placement: any) => {
    const draft = placementDrafts[placement.id];
    if (!draft?.start || !draft?.end) return;
    try {
      await heroPlacementsAPI.adminSchedule(placement.id, { assignedStartAt: new Date(draft.start).toISOString(), assignedEndAt: new Date(draft.end).toISOString(), status: 'scheduled' });
      const refreshed = await heroPlacementsAPI.adminAll();
      setHeroPlacements(refreshed?.data || []);
    } catch { /* surface remains stable; admin can retry */ }
  };

  const toLocalDateTime = (value: string | null | undefined) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const updateEscrowConfig = (next: EscrowRulesConfig) => {
    writeEscrowRulesConfig(next, adminUser); // also appends the immutable audit log entry
    setEscrowConfig(next);
  };

  const toggleSection = (key: keyof HomePageConfig['sectionVisibility']) => {
    onUpdate((prev) => ({
      ...prev,
      sectionVisibility: { ...prev.sectionVisibility, [key]: !prev.sectionVisibility[key] },
    }));
  };

  const updatePillarText = (
    pillar: keyof HomePageConfig['trustPillars'],
    field: 'heading' | 'subtext',
    value: string
  ) => {
    onUpdate((prev) => ({
      ...prev,
      trustPillars: {
        ...prev.trustPillars,
        [pillar]: { ...prev.trustPillars[pillar], [field]: value },
      },
    }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#0A3340]" />
            <h2 className="text-sm font-black text-[#0A3340]">Customize Home Page (Admin)</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-5 text-xs">
          {/* Section visibility */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-700 uppercase text-[10px] tracking-wide">Sections</h3>
            {(Object.keys(SECTION_LABELS) as (keyof HomePageConfig['sectionVisibility'])[]).map((key) => (
              <button
                key={key}
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <span className="font-semibold text-slate-700">{SECTION_LABELS[key]}</span>
                {config.sectionVisibility[key] ? (
                  <Eye className="w-4 h-4 text-emerald-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                )}
              </button>
            ))}
          </div>

          {/* Accent color */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-700 uppercase text-[10px] tracking-wide">Accent Color</h3>
            <div className="flex gap-2">
              {ACCENT_THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onUpdate((prev) => ({ ...prev, accentTheme: opt.id }))}
                  className={`flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                    config.accentTheme === opt.id ? 'border-[#176B87] bg-[#DDF4F0]' : 'border-slate-200'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: opt.swatch }} />
                  <span className="font-semibold text-slate-600 text-[10px]">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Hero featured vehicle selection - uses real promoted listings only. */}
          <div className="space-y-3 rounded-2xl border border-[#B8D9D6] bg-[#F8FBFF] p-3.5">
            <div className="flex items-start gap-2">
              <CarFront className="mt-0.5 h-4 w-4 text-[#176B87] shrink-0" />
              <div>
                <h3 className="font-bold text-[#0A3340] uppercase text-[10px] tracking-wide">Hero Featured Vehicles</h3>
                <p className="text-[11px] leading-relaxed text-slate-500 mt-1">The hero pulls real vehicles marked Featured/Promoted. Choose all featured vehicles or a selective set.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setHeroMode('all')} className={`rounded-xl border p-2.5 text-left ${heroMode === 'all' ? 'border-[#176B87] bg-white text-[#12576D]' : 'border-slate-200 bg-white text-slate-600'}`}>
                <span className="block text-xs font-black">All featured</span>
                <span className="block text-[10px] mt-0.5 text-slate-400">Auto-use every promoted car</span>
              </button>
              <button type="button" onClick={() => setHeroMode('selected')} className={`rounded-xl border p-2.5 text-left ${heroMode === 'selected' ? 'border-[#176B87] bg-white text-[#12576D]' : 'border-slate-200 bg-white text-slate-600'}`}>
                <span className="block text-xs font-black">Selective</span>
                <span className="block text-[10px] mt-0.5 text-slate-400">Choose exact hero cars</span>
              </button>
            </div>

            {heroMode === 'selected' && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                {featuredVehicles.length === 0 ? (
                  <p className="p-2 text-[11px] text-slate-500">No promoted vehicles are currently available.</p>
                ) : (
                  <>
                    <p className="text-[10px] leading-relaxed text-slate-500">Choose the two lead vehicles first. Additional selected vehicles become the rotation pool after those two positions.</p>
                    {[
                      { label: 'Left hero vehicle', index: 0 },
                      { label: 'Right hero vehicle', index: 1 },
                    ].map(({ label, index }) => (
                      <label key={label} className="block">
                        <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-[#176B87]">{label}</span>
                        <select
                          value={heroIds[index] || ''}
                          onChange={(e) => {
                            const id = e.target.value;
                            setHeroIds((prev) => {
                              const next = [...prev];
                              if (id) next[index] = id;
                              else next.splice(index, 1);
                              return next.filter((item, i) => item && next.indexOf(item) === i);
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-[#FBFDFC] px-2.5 py-2 text-[11px] font-semibold text-slate-700 outline-none focus:border-[#176B87]"
                        >
                          <option value="">Auto / none</option>
                          {featuredVehicles.map((vehicle) => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.year} {vehicle.make} {vehicle.model} · {formatAdminPrice(vehicle.price)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg bg-[#F8FBFF] p-2">
                      {featuredVehicles.map((vehicle) => (
                        <button key={vehicle.id} type="button" onClick={() => toggleHeroVehicle(vehicle.id)} className={`flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition ${heroIds.includes(vehicle.id) ? 'bg-white ring-1 ring-[#176B87]/20' : 'hover:bg-white'}`}>
                          <span className={`h-2 w-2 shrink-0 rounded-full ${heroIds.includes(vehicle.id) ? 'bg-[#13B8A6]' : 'bg-slate-300'}`} />
                          <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-[#0A3340]">{vehicle.year} {vehicle.make} {vehicle.model}</span>
                          <span className="shrink-0 text-[9px] text-slate-400">{formatAdminPrice(vehicle.price)}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <button type="button" disabled={savingHeroSelection || (heroMode === 'selected' && heroIds.length === 0)} onClick={() => void saveHeroSelection()} className="w-full rounded-xl bg-[#176B87] px-3 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
              {savingHeroSelection ? 'Saving hero selection…' : 'Save hero vehicle selection'}
            </button>
          </div>

          {/* Paid hero inventory: commercial scheduling stays inside the existing admin hero controls. */}
          <div className="space-y-3 rounded-2xl border border-[#D7E7E4] bg-[#F9FCFB] p-3.5">
            <div className="flex items-start gap-2">
              <Settings className="mt-0.5 h-4 w-4 text-[#176B87] shrink-0" />
              <div>
                <h3 className="font-bold text-[#0A3340] uppercase text-[10px] tracking-wide">Hero Commercialisation</h3>
                <p className="text-[11px] leading-relaxed text-slate-500 mt-1">Sell timed homepage hero exposure without changing the hero footprint. Paid placements enter the same rotation only for their assigned window.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setHeroCommercial((p: any) => ({ ...p, enabled: true }))} className={`rounded-xl border p-2.5 text-left ${heroCommercial.enabled !== false ? 'border-[#176B87] bg-white' : 'border-slate-200 bg-white'}`}>
                <span className="block text-xs font-black text-[#0A3340]">Hero sales ON</span><span className="block text-[10px] mt-0.5 text-slate-400">Paid placements enabled</span>
              </button>
              <button type="button" onClick={() => setHeroCommercial((p: any) => ({ ...p, enabled: false }))} className={`rounded-xl border p-2.5 text-left ${heroCommercial.enabled === false ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'}`}>
                <span className="block text-xs font-black text-[#0A3340]">Hero sales OFF</span><span className="block text-[10px] mt-0.5 text-slate-400">Featured-only rotation</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['equal','custom'] as const).map(mode => (
                <button key={mode} type="button" onClick={() => setHeroCommercial((p: any) => ({ ...p, rotationMode: mode }))} className={`rounded-xl border p-2.5 text-left ${heroCommercial.rotationMode === mode ? 'border-[#176B87] bg-white' : 'border-slate-200 bg-white'}`}>
                  <span className="block text-xs font-black text-[#0A3340]">{mode === 'equal' ? 'Equal time' : 'Custom time'}</span>
                  <span className="block text-[10px] mt-0.5 text-slate-400">{mode === 'equal' ? 'Every vehicle uses the default duration' : 'Set exposure per selected vehicle'}</span>
                </button>
              ))}
            </div>
            <label className="block"><span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-[#176B87]">Default rotation seconds</span><input type="number" min="5" max="300" value={heroCommercial.defaultSlotSeconds || 15} onChange={e => setHeroCommercial((p: any) => ({ ...p, defaultSlotSeconds: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold" /></label>
            {heroCommercial.rotationMode === 'custom' && (
              <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[9px] font-black uppercase tracking-wide text-slate-500">Custom exposure per featured vehicle</div>
                <div className="max-h-36 space-y-1 overflow-y-auto">
                  {featuredVehicles.map((vehicle) => (
                    <label key={vehicle.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-[#F8FBFF]">
                      <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-[#0A3340]">{vehicle.year} {vehicle.make} {vehicle.model}</span>
                      <input type="number" min="5" max="300" value={heroCommercial.vehicleDurations?.[vehicle.id] || heroCommercial.defaultSlotSeconds || 15} onChange={e => setHeroCommercial((p: any) => ({ ...p, vehicleDurations: { ...(p.vehicleDurations || {}), [vehicle.id]: Number(e.target.value) } }))} className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-bold text-right" aria-label={`${vehicle.make} ${vehicle.model} seconds`} />
                      <span className="text-[9px] text-slate-400">sec</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2 rounded-xl border border-[#D7E7E4] bg-white p-3">
              <div className="text-[9px] font-black uppercase tracking-wide text-[#176B87]">Hero positioning & scale</div>
              <p className="text-[10px] leading-relaxed text-slate-500">Tune the existing composition without redesigning it. The center card remains the anchor; these controls only set the stage footprint and vehicle spacing.</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="rounded-lg border border-slate-200 p-2"><span className="block text-[9px] font-black uppercase text-slate-400">Stage height %</span><input type="number" min=70 max=120 value={heroCommercial.layout?.stageHeightPct || 100} onChange={e => setHeroCommercial((p: any) => ({ ...p, layout: { ...(p.layout || {}), stageHeightPct: Number(e.target.value) } }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-[10px] font-bold" /></label>
                <label className="rounded-lg border border-slate-200 p-2"><span className="block text-[9px] font-black uppercase text-slate-400">Card scale %</span><input type="number" min=70 max=100 value={heroCommercial.layout?.centerCardScalePct || 80} onChange={e => setHeroCommercial((p: any) => ({ ...p, layout: { ...(p.layout || {}), centerCardScalePct: Number(e.target.value) } }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-[10px] font-bold" /></label>
                <label className="rounded-lg border border-slate-200 p-2"><span className="block text-[9px] font-black uppercase text-slate-400">Left car outward %</span><input type="number" min=0 max=30 value={heroCommercial.layout?.leftOffsetPct || 12} onChange={e => setHeroCommercial((p: any) => ({ ...p, layout: { ...(p.layout || {}), leftOffsetPct: Number(e.target.value) } }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-[10px] font-bold" /></label>
                <label className="rounded-lg border border-slate-200 p-2"><span className="block text-[9px] font-black uppercase text-slate-400">Right car outward %</span><input type="number" min=0 max=30 value={heroCommercial.layout?.rightOffsetPct || 12} onChange={e => setHeroCommercial((p: any) => ({ ...p, layout: { ...(p.layout || {}), rightOffsetPct: Number(e.target.value) } }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-[10px] font-bold" /></label>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#F5FAF9] px-2.5 py-2 text-[9px] text-slate-500"><span>Recommended starting balance</span><b className="text-[#0A3340]">Stage 100% · Card 80% · Cars 12% outward</b></div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-[9px] font-black uppercase tracking-wide text-slate-500">Hero packages sold to sellers</div>
              {(heroCommercial.packages || []).map((pkg: any, index: number) => (
                <div key={pkg.id || index} className="grid grid-cols-[1fr_80px_90px] gap-2 items-center">
                  <input value={pkg.label || ''} onChange={e => updateHeroPackage(index, 'label', e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-[10px]" />
                  <input type="number" min="5" max="300" value={pkg.seconds || 15} onChange={e => updateHeroPackage(index, 'seconds', e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-[10px]" aria-label="seconds" />
                  <input type="number" min="0" value={pkg.price || 0} onChange={e => updateHeroPackage(index, 'price', e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-[10px]" aria-label="price" />
                </div>
              ))}
              <button type="button" disabled={savingHeroCommercial} onClick={() => void saveHeroCommercial()} className="w-full rounded-xl bg-[#176B87] px-3 py-2.5 text-xs font-black text-white">{savingHeroCommercial ? 'Saving commercial settings…' : 'Save hero commercial settings'}</button>
            </div>
            {heroPlacements.length > 0 && (
              <div className="space-y-2 rounded-xl border border-[#E7D7C9] bg-[#FFFBF7] p-3">
                <div className="text-[9px] font-black uppercase tracking-wide text-[#A65F28]">Paid placements awaiting / assigned</div>
                {heroPlacements.slice(0, 8).map((placement: any) => {
                  const vehicle = featuredVehicles.find(v => v.id === placement.vehicleId);
                  const draft = placementDrafts[placement.id] || { start: toLocalDateTime(placement.assignedStartAt), end: toLocalDateTime(placement.assignedEndAt) };
                  return <div key={placement.id} className="space-y-2 rounded-lg bg-white p-2.5"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><div className="truncate text-[10px] font-black text-[#0A3340]">{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : placement.vehicleId}</div><div className="text-[9px] text-slate-400">KES {Number(placement.price || 0).toLocaleString()} · {placement.status} · {placement.slotSeconds}s</div></div></div><div className="grid grid-cols-2 gap-2"><input type="datetime-local" value={draft.start} onChange={e => setPlacementDrafts(p => ({ ...p, [placement.id]: { ...draft, start: e.target.value } }))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-[9px]" aria-label="Assigned start" /><input type="datetime-local" value={draft.end} onChange={e => setPlacementDrafts(p => ({ ...p, [placement.id]: { ...draft, end: e.target.value } }))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-[9px]" aria-label="Assigned end" /></div><button type="button" disabled={placement.status === 'pending_payment' || !draft.start || !draft.end} onClick={() => void schedulePlacement(placement)} className="w-full rounded-lg bg-[#0A3340] px-2.5 py-1.5 text-[9px] font-black text-white disabled:opacity-40">Assign scheduled hero time</button></div>;
                })}
              </div>
            )}
          </div>

          {/* Fallback hero showcase: used only while no real Featured/Promoted vehicles exist. */}
          <div className="space-y-3 rounded-2xl border border-[#B8D9D6] bg-[#F4FAF9] p-3.5">
            <div className="flex items-start gap-2">
              <CarFront className="mt-0.5 h-4 w-4 text-[#176B87] shrink-0" />
              <div>
                <h3 className="font-bold text-[#0A3340] uppercase text-[10px] tracking-wide">Hero Fallback Vehicles</h3>
                <p className="text-[11px] leading-relaxed text-slate-500 mt-1">These fallback rows are used only when the marketplace has no real Featured/Promoted vehicles. Configure the vehicle identity and clean image URL here without touching code.</p>
              </div>
            </div>
            <div className="space-y-3">
              {config.heroFallbackVehicles.slice(0, 3).map((vehicle, index) => (
                <div key={vehicle.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#176B87]">Showcase {index + 1}</span>
                    <span className="text-[10px] text-slate-400">Fallback only</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['make','model','year','fuelType','transmission','tagline'] as const).map((field) => (
                      <label key={field} className={field === 'tagline' ? 'col-span-2' : ''}>
                        <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">{field === 'fuelType' ? 'Fuel' : field === 'transmission' ? 'Transmission' : field}</span>
                        <input
                          value={String(vehicle[field])}
                          onChange={(e) => onUpdate((prev) => ({ ...prev, heroFallbackVehicles: prev.heroFallbackVehicles.map((item, i) => i === index ? { ...item, [field]: field === 'year' ? Number(e.target.value) || 2026 : e.target.value } : item) }))}
                          className="w-full rounded-lg border border-slate-200 bg-[#FBFDFC] px-2.5 py-2 text-[11px] font-semibold text-slate-700 outline-none focus:border-[#176B87]"
                        />
                      </label>
                    ))}
                  </div>
                  <label>
                    <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Image URL</span>
                    <input
                      value={vehicle.image}
                      onChange={(e) => onUpdate((prev) => ({ ...prev, heroFallbackVehicles: prev.heroFallbackVehicles.map((item, i) => i === index ? { ...item, image: e.target.value } : item) }))}
                      className="w-full rounded-lg border border-slate-200 bg-[#FBFDFC] px-2.5 py-2 text-[10px] text-slate-600 outline-none focus:border-[#176B87]"
                      placeholder="https://…"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory presentation - existing marketplace controls only */}
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-slate-700 uppercase text-[10px] tracking-wide">Inventory Presentation</h3>
              <p className="text-[11px] leading-relaxed text-slate-500 mt-1">Choose how the existing vehicle inventory is arranged. These settings change presentation only; vehicle data, filters and business rules stay untouched.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'grid', label: 'Dense grid', icon: LayoutGrid },
                { value: 'list', label: 'List view', icon: List },
              ] as const).map((option) => {
                const Icon = option.icon;
                const active = config.inventoryLayout.viewMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onUpdate((prev) => ({ ...prev, inventoryLayout: { ...prev.inventoryLayout, viewMode: option.value } }))}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-colors ${active ? 'border-[#176B87] bg-[#176B87]/10 text-[#12576D]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">{option.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Desktop columns</label>
                <select
                  aria-label="Desktop inventory columns"
                  value={config.inventoryLayout.columns}
                  onChange={(e) => onUpdate((prev) => ({ ...prev, inventoryLayout: { ...prev.inventoryLayout, columns: Number(e.target.value) as 3 | 4 | 5 } }))}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#176B87]"
                >
                  <option value={3}>3 columns</option>
                  <option value={4}>4 columns</option>
                  <option value={5}>5 columns</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Card density</label>
                <select
                  aria-label="Inventory card density"
                  value={config.inventoryLayout.cardDensity}
                  onChange={(e) => onUpdate((prev) => ({ ...prev, inventoryLayout: { ...prev.inventoryLayout, cardDensity: e.target.value as HomePageConfig['inventoryLayout']['cardDensity'] } }))}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#176B87]"
                >
                  <option value="compact">Compact · more cars</option>
                  <option value="standard">Standard · balanced</option>
                  <option value="comfortable">Comfortable · larger cards</option>
                </select>
              </div>
            </div>

            <div className="w-full flex items-center justify-between p-3 rounded-xl border border-[#176B87]/20 bg-[#176B87]/5">
              <span className="flex items-center gap-2">
                <PanelLeftOpen className="w-4 h-4 text-[#176B87]" />
                <span className="text-left">
                  <span className="block text-xs font-bold text-slate-700">Desktop filter sidebar</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">Required marketplace panel · always visible on desktop</span>
                </span>
              </span>
              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-[#176B87] text-white">ON</span>
            </div>
          </div>

          {/* Escrow rules & activation */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-700 uppercase text-[10px] tracking-wide flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" /> Escrow Rules & Activation
            </h3>
            <div className="p-2.5 rounded-xl border border-slate-200 space-y-2.5">
              <button
                type="button"
                aria-label={`Escrow Live Mode: ${escrowConfig.liveMode ? 'ON' : 'OFF'}`}
                onClick={() => updateEscrowConfig({ ...escrowConfig, liveMode: !escrowConfig.liveMode })}
                className={`w-full flex items-center justify-between p-2 rounded-lg border ${
                  escrowConfig.liveMode ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'
                }`}
              >
                <span className="font-bold text-slate-700 text-left">
                  Escrow Live Mode
                  <span className="block font-normal text-[10px] text-slate-500 mt-0.5">
                    {escrowConfig.liveMode
                      ? 'Live - real escrow guarantee shown to buyers'
                      : 'Preview mode - pending CBK certification'}
                  </span>
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                  escrowConfig.liveMode ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {escrowConfig.liveMode ? 'ON' : 'OFF'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Verified Dealers</label>
                  <select
                    aria-label="Verified dealer escrow requirement"
                    value={escrowConfig.dealerRequirement}
                    onChange={(e) => updateEscrowConfig({ ...escrowConfig, dealerRequirement: e.target.value as SellerEscrowRequirement })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#176B87]"
                  >
                    {REQUIREMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Private Sellers</label>
                  <select
                    aria-label="Private seller escrow requirement"
                    value={escrowConfig.privateSellerRequirement}
                    onChange={(e) => updateEscrowConfig({ ...escrowConfig, privateSellerRequirement: e.target.value as SellerEscrowRequirement })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#176B87]"
                  >
                    {REQUIREMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Immutable audit log viewer - append-only by design (see
              adminAuditLog.ts's own top comment). This panel only ever
              reads entries; there is no edit/delete control anywhere
              here, intentionally. */}
          <div className="space-y-2">
            <button
              onClick={() => setShowAuditLog(!showAuditLog)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="font-bold text-slate-700 uppercase text-[10px] tracking-wide flex items-center gap-1.5">
                <History className="w-3 h-3" /> Admin Change Log (Immutable)
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold">{showAuditLog ? 'Hide' : 'Show'}</span>
            </button>
            {showAuditLog && (
              <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2">
                {readLogEntries().length === 0 ? (
                  <p className="text-slate-400 text-center py-2">No changes logged yet.</p>
                ) : (
                  [...readLogEntries()].reverse().map((entry) => (
                    <div key={entry.id} className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-slate-700 font-semibold">{entry.summary}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {entry.adminName} · {new Date(entry.timestamp).toLocaleString('en-KE')} · {entry.area}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Trust pillar text */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-700 uppercase text-[10px] tracking-wide">Trust Pillar Text</h3>
            {(Object.keys(config.trustPillars) as (keyof HomePageConfig['trustPillars'])[]).map((pillar) => (
              <div key={pillar} className="p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                <input
                  value={config.trustPillars[pillar].heading}
                  onChange={(e) => updatePillarText(pillar, 'heading', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#176B87]"
                  placeholder="Heading"
                />
                <input
                  value={config.trustPillars[pillar].subtext}
                  onChange={(e) => updatePillarText(pillar, 'subtext', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#176B87]"
                  placeholder="Subtext"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 font-semibold text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#176B87] hover:bg-[#12576D] text-white rounded-xl font-bold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePageAdminPanel;
