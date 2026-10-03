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
import type { HeroPresentationConfig, HeroFloatingCard, HeroShowcaseVehicle } from '../types/heroPresentation';

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
  heroPresentation: HeroPresentationConfig;
  heroCardContent: Record<string, { eyebrow?: string; message?: string; detail?: string; ctaLabel?: string; ctaLink?: string }>;
  onSaveHeroVehicleSelection: (mode: 'all' | 'selected', ids: string[]) => Promise<void>;
  onSaveHeroPresentation: (presentation: HeroPresentationConfig, cardContent: Record<string, { eyebrow?: string; message?: string; detail?: string; ctaLabel?: string; ctaLink?: string }>) => Promise<void>;
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
  config, onUpdate, onReset, onClose, adminUser, featuredVehicles, heroFeaturedMode, heroFeaturedIds, heroPresentation, heroCardContent, onSaveHeroVehicleSelection, onSaveHeroPresentation
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
  const [heroLayout, setHeroLayout] = useState(heroPresentation);
  const [heroCopy, setHeroCopy] = useState(heroCardContent);
  const [heroCopyVehicleId, setHeroCopyVehicleId] = useState<string>(heroFeaturedIds[0] || featuredVehicles[0]?.id || '');
  const [savingHeroPresentation, setSavingHeroPresentation] = useState(false);

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

  const saveHeroPresentation = async () => {
    setSavingHeroPresentation(true);
    try {
      const clamped: HeroPresentationConfig = {
        ...heroLayout,
        stageHeightPct: Math.max(70, Math.min(120, Number(heroLayout.stageHeightPct) || 100)),
        stageMaxWidthPct: Math.max(90, Math.min(100, Number(heroLayout.stageMaxWidthPct) || 100)),
        cardScalePct: Math.max(70, Math.min(100, Number(heroLayout.cardScalePct) || 80)),
        cardWidthPct: Math.max(28, Math.min(50, Number(heroLayout.cardWidthPct) || 42)),
        cardOffsetXPct: Math.max(-10, Math.min(10, Number(heroLayout.cardOffsetXPct) || 0)),
        cardOffsetYPct: Math.max(-10, Math.min(10, Number(heroLayout.cardOffsetYPct) || 0)),
        cardBgOpacityPct: Math.max(70, Math.min(100, Number(heroLayout.cardBgOpacityPct) || 95)),
        cardBlurPx: Math.max(0, Math.min(40, Number(heroLayout.cardBlurPx) || 18)),
        backgroundPositionX: Math.max(0, Math.min(100, Number(heroLayout.backgroundPositionX) || 50)),
        backgroundPositionY: Math.max(0, Math.min(100, Number(heroLayout.backgroundPositionY) || 50)),
        backgroundScalePct: Math.max(100, Math.min(130, Number(heroLayout.backgroundScalePct) || 100)),
        overlayOpacityPct: Math.max(0, Math.min(60, Number(heroLayout.overlayOpacityPct) || 18)),
        secondaryOverlayOpacityPct: Math.max(0, Math.min(60, Number(heroLayout.secondaryOverlayOpacityPct) || 10)),
        leftOffsetPct: Math.max(0, Math.min(30, Number(heroLayout.leftOffsetPct) || 16)),
        rightOffsetPct: Math.max(0, Math.min(30, Number(heroLayout.rightOffsetPct) || 16)),
        vehicleScalePct: Math.max(75, Math.min(125, Number(heroLayout.vehicleScalePct) || 100)),
        vehicleTopPct: Math.max(35, Math.min(65, Number(heroLayout.vehicleTopPct) || 50)),
        vehicleWidthPct: Math.max(32, Math.min(48, Number(heroLayout.vehicleWidthPct) || 43)),
        tickerEnabled: heroLayout.tickerEnabled !== false,
        tickerBackgroundColor: heroLayout.tickerBackgroundColor || '#0A3340', tickerTextColor: heroLayout.tickerTextColor || '#FFFFFF', tickerHeightPx: Math.max(28, Math.min(60, Number(heroLayout.tickerHeightPx) || 36)), tickerScrollSeconds: Math.max(10, Math.min(90, Number(heroLayout.tickerScrollSeconds) || 34)),
        vehicleSource: ['showcase', 'featured', 'selected'].includes(heroLayout.vehicleSource) ? heroLayout.vehicleSource : 'showcase',
        showcaseVehicles: Array.isArray(heroLayout.showcaseVehicles) ? heroLayout.showcaseVehicles.slice(0, 6) : [],
        floatingCards: Array.isArray(heroLayout.floatingCards) ? heroLayout.floatingCards.slice(0, 8) : [],
      };
      await onSaveHeroPresentation(clamped, heroCopy);
      setHeroLayout(clamped);
    } finally {
      setSavingHeroPresentation(false);
    }
  };

  const activeCopy = heroCopyVehicleId ? (heroCopy[heroCopyVehicleId] || {}) : {};
  const updateActiveCopy = (field: 'eyebrow' | 'message' | 'detail' | 'ctaLabel' | 'ctaLink', value: string) => {
    if (!heroCopyVehicleId) return;
    setHeroCopy((prev) => ({ ...prev, [heroCopyVehicleId]: { ...(prev[heroCopyVehicleId] || {}), [field]: value } }));
  };

  const updateShowcaseVehicle = (index: number, patch: Partial<HeroShowcaseVehicle>) => {
    setHeroLayout((prev) => ({ ...prev, showcaseVehicles: prev.showcaseVehicles.map((item, i) => i === index ? { ...item, ...patch } : item) }));
  };
  const addFloatingCard = () => {
    const next: HeroFloatingCard = { id: `floating-${Date.now()}`, enabled: true, eyebrow: 'KAYAD', title: 'Your message here', body: 'Add a short commercial message.', leftPct: 5, topPct: 12, widthPct: 18, backgroundColor: 'rgba(7,31,42,.78)', textColor: '#FFFFFF', borderColor: 'rgba(255,255,255,.18)', opacityPct: 100, blurPx: 12 };
    setHeroLayout((prev) => ({ ...prev, floatingCards: [...prev.floatingCards, next] }));
  };
  const updateFloatingCard = (id: string, patch: Partial<HeroFloatingCard>) => {
    setHeroLayout((prev) => ({ ...prev, floatingCards: prev.floatingCards.map((card) => card.id === id ? { ...card, ...patch } : card) }));
  };
  const removeFloatingCard = (id: string) => {
    setHeroLayout((prev) => ({ ...prev, floatingCards: prev.floatingCards.filter((card) => card.id !== id) }));
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
              <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                {featuredVehicles.length === 0 ? (
                  <p className="p-3 text-[11px] text-slate-500">No promoted vehicles are currently available.</p>
                ) : featuredVehicles.map((vehicle) => (
                  <label key={vehicle.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-[#F8FBFF]">
                    <input type="checkbox" checked={heroIds.includes(vehicle.id)} onChange={() => toggleHeroVehicle(vehicle.id)} className="accent-[#176B87]" />
                    <img src={vehicle.images?.[0]} alt="" className="h-9 w-12 rounded-md object-cover bg-slate-100" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-bold text-[#0A3340]">{vehicle.year} {vehicle.make} {vehicle.model}</span>
                      <span className="block truncate text-[10px] text-slate-400">{vehicle.location || 'Location not specified'} · {formatAdminPrice(vehicle.price)}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            <button type="button" disabled={savingHeroSelection || (heroMode === 'selected' && heroIds.length === 0)} onClick={() => void saveHeroSelection()} className="w-full rounded-xl bg-[#176B87] px-3 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
              {savingHeroSelection ? 'Saving hero selection…' : 'Save hero vehicle selection'}
            </button>
          </div>

          {/* Unified hero composition controls: backend-persisted through platform_config. */}
          <div className="space-y-3 rounded-2xl border border-[#B8D9D6] bg-[#F8FBFF] p-3.5">
            <div>
              <h3 className="font-bold text-[#0A3340] uppercase text-[10px] tracking-wide">Hero Composition & Commercial Card</h3>
              <p className="text-[11px] leading-relaxed text-slate-500 mt-1">Position the existing hero without changing its architecture. The center card, vehicle subjects and broadcast strip remain the same canonical surfaces.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['stageHeightPct','Hero stage height','70–120%'],
                ['cardScalePct','Center card scale','70–100%'],
                ['leftOffsetPct','Left vehicle outward','0–30%'],
                ['rightOffsetPct','Right vehicle outward','0–30%'],
              ].map(([key,label,hint]) => (
                <label key={key} className="rounded-xl border border-slate-200 bg-white p-2.5">
                  <span className="block text-[9px] font-black uppercase tracking-wide text-slate-500">{label}</span>
                  <input type="number" min={key === 'stageHeightPct' ? 70 : key === 'cardScalePct' ? 70 : 0} max={key === 'stageHeightPct' ? 120 : key === 'cardScalePct' ? 100 : 30} value={(heroLayout as any)[key]} onChange={(e) => setHeroLayout((prev) => ({ ...prev, [key]: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold text-[#0A3340]" />
                  <span className="mt-1 block text-[9px] text-slate-400">{hint}</span>
                </label>
              ))}
            </div>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
              <span><span className="block text-xs font-bold text-[#0A3340]">Broadcast ticker</span><span className="block text-[10px] text-slate-400">Keep the dark TV-style notice strip above navigation.</span></span>
              <input type="checkbox" checked={heroLayout.tickerEnabled} onChange={(e) => setHeroLayout((prev) => ({ ...prev, tickerEnabled: e.target.checked }))} className="accent-[#176B87] h-4 w-4" />
            </label>

            <div className="rounded-xl border border-[#B8D9D6] bg-[#F8FBFF] p-3 space-y-3">
              <div><div className="text-[10px] font-black uppercase tracking-wide text-[#176B87]">Hero Marketing System</div><div className="text-[10px] text-slate-500 mt-1">Control the visual system here. No code changes are required for future campaigns.</div></div>
              <label className="block"><span className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Vehicle source</span><select value={heroLayout.vehicleSource} onChange={(e) => setHeroLayout((p) => ({ ...p, vehicleSource: e.target.value as HeroPresentationConfig['vehicleSource'] }))} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold"><option value="showcase">Marketing showcase</option><option value="featured">All featured vehicles</option><option value="selected">Selected featured vehicles</option></select></label>
              <div className="grid grid-cols-2 gap-2">
                {([['stageMaxWidthPct','Hero width','90–100'],['cardWidthPct','Card width','28–50'],['vehicleScalePct','Vehicle scale','75–125'],['vehicleTopPct','Vehicle vertical','35–65'],['vehicleWidthPct','Vehicle stage width','32–48'],['backgroundScalePct','Background scale','100–130'],['backgroundPositionX','Background X','0–100'],['backgroundPositionY','Background Y','0–100'],['cardOffsetXPct','Card X offset','-10–10'],['cardOffsetYPct','Card Y offset','-10–10'],['cardBgOpacityPct','Card opacity','70–100'],['cardBlurPx','Card blur','0–40']] as const).map(([key,label,hint]) => <label key={key} className="rounded-lg border border-slate-200 bg-white p-2"><span className="block text-[9px] font-bold uppercase text-slate-500">{label}</span><input type="number" value={Number((heroLayout as any)[key])} onChange={(e) => setHeroLayout((p) => ({ ...p, [key]: Number(e.target.value) }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs font-bold" /><span className="block text-[8px] text-slate-400 mt-0.5">{hint}</span></label>)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="rounded-lg border border-slate-200 bg-white p-2"><span className="block text-[9px] font-bold uppercase text-slate-500">Nairobi background URL</span><input value={heroLayout.backgroundUrl} onChange={(e) => setHeroLayout((p) => ({ ...p, backgroundUrl: e.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-[10px]" /></label>
                <label className="rounded-lg border border-slate-200 bg-white p-2"><span className="block text-[9px] font-bold uppercase text-slate-500">Ticker fallback text</span><input value={heroLayout.tickerFallbackText} onChange={(e) => setHeroLayout((p) => ({ ...p, tickerFallbackText: e.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-[10px]" /></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="rounded-lg border border-slate-200 bg-white p-2"><span className="block text-[9px] font-bold uppercase text-slate-500">Ticker background</span><input type="color" value={heroLayout.tickerBackgroundColor} onChange={(e) => setHeroLayout((p) => ({ ...p, tickerBackgroundColor: e.target.value }))} className="mt-1 h-8 w-full rounded-md border border-slate-200" /></label>
                <label className="rounded-lg border border-slate-200 bg-white p-2"><span className="block text-[9px] font-bold uppercase text-slate-500">Ticker text</span><input type="color" value={heroLayout.tickerTextColor} onChange={(e) => setHeroLayout((p) => ({ ...p, tickerTextColor: e.target.value }))} className="mt-1 h-8 w-full rounded-md border border-slate-200" /></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="rounded-lg border border-slate-200 bg-white p-2"><span className="block text-[9px] font-bold uppercase text-slate-500">Ticker height</span><input type="number" min={28} max={60} value={heroLayout.tickerHeightPx} onChange={(e) => setHeroLayout((p) => ({ ...p, tickerHeightPx: Number(e.target.value) }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs font-bold" /></label>
                <label className="rounded-lg border border-slate-200 bg-white p-2"><span className="block text-[9px] font-bold uppercase text-slate-500">Ticker speed (sec)</span><input type="number" min={10} max={90} value={heroLayout.tickerScrollSeconds} onChange={(e) => setHeroLayout((p) => ({ ...p, tickerScrollSeconds: Number(e.target.value) }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs font-bold" /></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="rounded-lg border border-slate-200 bg-white p-2"><span className="block text-[9px] font-bold uppercase text-slate-500">Overlay color</span><input type="color" value={heroLayout.overlayColor} onChange={(e) => setHeroLayout((p) => ({ ...p, overlayColor: e.target.value }))} className="mt-1 h-8 w-full rounded-md border border-slate-200" /></label>
                <label className="rounded-lg border border-slate-200 bg-white p-2"><span className="block text-[9px] font-bold uppercase text-slate-500">Card border</span><input type="color" value={heroLayout.cardBorderColor} onChange={(e) => setHeroLayout((p) => ({ ...p, cardBorderColor: e.target.value }))} className="mt-1 h-8 w-full rounded-md border border-slate-200" /></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([['showVehicleInfoCards','Vehicle info cards'],['showVehicleLabels','Vehicle labels'],['arrowEnabled','Navigation arrows'],['dotsEnabled','Rotation dots']] as const).map(([key,label]) => <label key={key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5"><span className="text-[10px] font-bold text-slate-600">{label}</span><input type="checkbox" checked={Boolean((heroLayout as any)[key])} onChange={(e) => setHeroLayout((p) => ({ ...p, [key]: e.target.checked }))} className="accent-[#176B87]" /></label>)}
              </div>
            </div>

            <div className="rounded-xl border border-[#B8D9D6] bg-white p-3 space-y-3">
              <div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-wide text-[#176B87]">Marketing Showcase Cars</div><div className="text-[10px] text-slate-500">Default visual pair. Replace these later without code.</div></div></div>
              {heroLayout.showcaseVehicles.map((vehicle, index) => <div key={vehicle.id} className="rounded-lg border border-slate-200 p-2.5 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input value={vehicle.make} onChange={(e) => updateShowcaseVehicle(index, { make: e.target.value })} placeholder="Make" className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-bold" />
                  <input value={vehicle.model} onChange={(e) => updateShowcaseVehicle(index, { model: e.target.value })} placeholder="Model" className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-bold" />
                  <input value={vehicle.image} onChange={(e) => updateShowcaseVehicle(index, { image: e.target.value })} placeholder="Image URL" className="col-span-2 rounded-md border border-slate-200 px-2 py-1.5 text-[10px]" />
                  <input value={vehicle.eyebrow || ''} onChange={(e) => updateShowcaseVehicle(index, { eyebrow: e.target.value })} placeholder="Eyebrow" className="rounded-md border border-slate-200 px-2 py-1.5 text-[10px]" />
                  <input value={vehicle.tagline || ''} onChange={(e) => updateShowcaseVehicle(index, { tagline: e.target.value })} placeholder="Tagline" className="rounded-md border border-slate-200 px-2 py-1.5 text-[10px]" />
                </div>
                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><input type="checkbox" checked={vehicle.enabled !== false} onChange={(e) => updateShowcaseVehicle(index, { enabled: e.target.checked })} className="accent-[#176B87]" /> Show this vehicle</label>
              </div>)}
            </div>

            <div className="rounded-xl border border-[#B8D9D6] bg-white p-3 space-y-3">
              <div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-wide text-[#176B87]">Floating Marketing Cards</div><div className="text-[10px] text-slate-500">Add, position, edit or remove promotional cards without code.</div></div><button type="button" onClick={addFloatingCard} className="rounded-lg bg-[#0A3340] px-2.5 py-1.5 text-[10px] font-black text-white">+ Add card</button></div>
              {heroLayout.floatingCards.map((card) => <div key={card.id} className="rounded-lg border border-slate-200 p-2.5 space-y-2">
                <div className="grid grid-cols-2 gap-2"><input value={card.eyebrow || ''} onChange={(e) => updateFloatingCard(card.id, { eyebrow: e.target.value })} placeholder="Eyebrow" className="rounded-md border border-slate-200 px-2 py-1.5 text-[10px]" /><input value={card.title} onChange={(e) => updateFloatingCard(card.id, { title: e.target.value })} placeholder="Title" className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-bold" /><textarea value={card.body || ''} onChange={(e) => updateFloatingCard(card.id, { body: e.target.value })} placeholder="Message" rows={2} className="col-span-2 rounded-md border border-slate-200 px-2 py-1.5 text-[10px] resize-none" /></div>
                <div className="grid grid-cols-4 gap-2">{([['leftPct','X'],['topPct','Y'],['widthPct','Width'],['opacityPct','Opacity']] as const).map(([key,label]) => <label key={key}><span className="block text-[8px] font-bold uppercase text-slate-400">{label}</span><input type="number" value={Number((card as any)[key] ?? 0)} onChange={(e) => updateFloatingCard(card.id, { [key]: Number(e.target.value) } as Partial<HeroFloatingCard>)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-[10px]" /></label>)}</div>
                <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><input type="checkbox" checked={card.enabled !== false} onChange={(e) => updateFloatingCard(card.id, { enabled: e.target.checked })} className="accent-[#176B87]" /> Visible</label><button type="button" onClick={() => removeFloatingCard(card.id)} className="text-[10px] font-black text-rose-600">Remove</button></div>
              </div>)}
              {!heroLayout.floatingCards.length && <div className="rounded-lg bg-slate-50 p-3 text-[10px] text-slate-400">No floating cards. Add one only when a campaign needs it.</div>}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Per-vehicle hero card message</div>
              <select value={heroCopyVehicleId} onChange={(e) => setHeroCopyVehicleId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs">
                <option value="">Select featured vehicle</option>
                {featuredVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.year} {vehicle.make} {vehicle.model}{vehicle.isAuction ? ' · Auction' : ''}</option>)}
              </select>
              {heroCopyVehicleId && <div className="space-y-2">
                <input value={activeCopy.eyebrow || ''} onChange={(e) => updateActiveCopy('eyebrow', e.target.value)} placeholder="Eyebrow / campaign label" className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs" />
                <textarea value={activeCopy.message || ''} onChange={(e) => updateActiveCopy('message', e.target.value)} placeholder="Hero message shown with this vehicle" rows={3} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs resize-none" />
                <input value={activeCopy.detail || ''} onChange={(e) => updateActiveCopy('detail', e.target.value)} placeholder="Supporting detail / promotion" className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={activeCopy.ctaLabel || ''} onChange={(e) => updateActiveCopy('ctaLabel', e.target.value)} placeholder="CTA label" className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs" />
                  <input value={activeCopy.ctaLink || ''} onChange={(e) => updateActiveCopy('ctaLink', e.target.value)} placeholder="CTA link / route" className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs" />
                </div>
              </div>}
            </div>

            <button type="button" disabled={savingHeroPresentation} onClick={() => void saveHeroPresentation()} className="w-full rounded-xl bg-[#0A3340] px-3 py-2.5 text-xs font-black text-white disabled:opacity-50">{savingHeroPresentation ? 'Saving hero presentation…' : 'Save hero composition & messages'}</button>
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
