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
            <Settings className="w-4 h-4 text-[#0B1D3A]" />
            <h2 className="text-sm font-black text-[#0B1D3A]">Customize Home Page (Admin)</h2>
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
                    config.accentTheme === opt.id ? 'border-[#1684FF] bg-[#EAF4FF]' : 'border-slate-200'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: opt.swatch }} />
                  <span className="font-semibold text-slate-600 text-[10px]">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Hero featured vehicle selection - uses real promoted listings only. */}
          <div className="space-y-3 rounded-2xl border border-[#B9D8F8] bg-[#F8FBFF] p-3.5">
            <div className="flex items-start gap-2">
              <CarFront className="mt-0.5 h-4 w-4 text-[#1684FF] shrink-0" />
              <div>
                <h3 className="font-bold text-[#0B1D3A] uppercase text-[10px] tracking-wide">Hero Featured Vehicles</h3>
                <p className="text-[11px] leading-relaxed text-slate-500 mt-1">The hero pulls real vehicles marked Featured/Promoted. Choose all featured vehicles or a selective set.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setHeroMode('all')} className={`rounded-xl border p-2.5 text-left ${heroMode === 'all' ? 'border-[#1684FF] bg-white text-[#0F6ED8]' : 'border-slate-200 bg-white text-slate-600'}`}>
                <span className="block text-xs font-black">All featured</span>
                <span className="block text-[10px] mt-0.5 text-slate-400">Auto-use every promoted car</span>
              </button>
              <button type="button" onClick={() => setHeroMode('selected')} className={`rounded-xl border p-2.5 text-left ${heroMode === 'selected' ? 'border-[#1684FF] bg-white text-[#0F6ED8]' : 'border-slate-200 bg-white text-slate-600'}`}>
                <span className="block text-xs font-black">Selective</span>
                <span className="block text-[10px] mt-0.5 text-slate-400">Choose exact hero cars</span>
              </button>
            </div>

            {heroMode === 'selected' && (
              <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                {featuredVehicles.length === 0 ? (
                  <p className="p-3 text-[11px] text-slate-500">No promoted vehicles are currently available.</p>
                ) : featuredVehicles.map((vehicle) => (
                  <label key={vehicle.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-[#F8FBFF]">
                    <input type="checkbox" checked={heroIds.includes(vehicle.id)} onChange={() => toggleHeroVehicle(vehicle.id)} className="accent-[#1684FF]" />
                    <img src={vehicle.images?.[0]} alt="" className="h-9 w-12 rounded-md object-cover bg-slate-100" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-bold text-[#0B1D3A]">{vehicle.year} {vehicle.make} {vehicle.model}</span>
                      <span className="block truncate text-[10px] text-slate-400">{vehicle.location || 'Location not specified'} · {formatAdminPrice(vehicle.price)}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            <button type="button" disabled={savingHeroSelection || (heroMode === 'selected' && heroIds.length === 0)} onClick={() => void saveHeroSelection()} className="w-full rounded-xl bg-[#0B1D3A] px-3 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
              {savingHeroSelection ? 'Saving hero selection…' : 'Save hero vehicle selection'}
            </button>
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
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-colors ${active ? 'border-[#1684FF] bg-[#1684FF]/10 text-[#0F6ED8]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
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
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1684FF]"
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
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1684FF]"
                >
                  <option value="compact">Compact · more cars</option>
                  <option value="standard">Standard · balanced</option>
                  <option value="comfortable">Comfortable · larger cards</option>
                </select>
              </div>
            </div>

            <div className="w-full flex items-center justify-between p-3 rounded-xl border border-[#1684FF]/20 bg-[#1684FF]/5">
              <span className="flex items-center gap-2">
                <PanelLeftOpen className="w-4 h-4 text-[#1684FF]" />
                <span className="text-left">
                  <span className="block text-xs font-bold text-slate-700">Desktop filter sidebar</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">Required marketplace panel · always visible on desktop</span>
                </span>
              </span>
              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-[#1684FF] text-white">ON</span>
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
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1684FF]"
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
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1684FF]"
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
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1684FF]"
                  placeholder="Heading"
                />
                <input
                  value={config.trustPillars[pillar].subtext}
                  onChange={(e) => updatePillarText(pillar, 'subtext', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1684FF]"
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
            className="px-4 py-2 bg-[#1684FF] hover:bg-[#0F6ED8] text-white rounded-xl font-bold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePageAdminPanel;
