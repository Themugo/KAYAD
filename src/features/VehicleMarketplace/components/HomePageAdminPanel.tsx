import React, { useState } from 'react';
import { X, Settings, RotateCcw, Eye, EyeOff, ShieldAlert, History } from 'lucide-react';
import { HomePageConfig, ACCENT_THEME_OPTIONS } from '../hooks/useHomePageConfig';
import {
  EscrowRulesConfig,
  SellerEscrowRequirement,
  readEscrowRulesConfig,
  writeEscrowRulesConfig,
} from '../../Admin/hooks/escrowRulesConfig';
import { readLogEntries } from '../../Admin/hooks/adminAuditLog';

interface HomePageAdminPanelProps {
  config: HomePageConfig;
  onUpdate: (updater: (prev: HomePageConfig) => HomePageConfig) => void;
  onReset: () => void;
  onClose: () => void;
  /** The signed-in admin's identity, used only to attribute escrow-rule
   * changes in the immutable audit log - not stored or modified by
   * this panel otherwise. */
  adminUser: { id: string; name: string };
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
export const HomePageAdminPanel: React.FC<HomePageAdminPanelProps> = ({ config, onUpdate, onReset, onClose, adminUser }) => {
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
            <Settings className="w-4 h-4 text-[#1E3063]" />
            <h2 className="text-sm font-black text-[#1E3063]">Customize Home Page (Admin)</h2>
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
                    config.accentTheme === opt.id ? 'border-[#1E3063] bg-slate-50' : 'border-slate-200'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: opt.swatch }} />
                  <span className="font-semibold text-slate-600 text-[10px]">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Escrow rules & activation */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-700 uppercase text-[10px] tracking-wide flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" /> Escrow Rules & Activation
            </h3>
            <div className="p-2.5 rounded-xl border border-slate-200 space-y-2.5">
              <button
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
                    value={escrowConfig.dealerRequirement}
                    onChange={(e) => updateEscrowConfig({ ...escrowConfig, dealerRequirement: e.target.value as SellerEscrowRequirement })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1E3063]"
                  >
                    {REQUIREMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Private Sellers</label>
                  <select
                    value={escrowConfig.privateSellerRequirement}
                    onChange={(e) => updateEscrowConfig({ ...escrowConfig, privateSellerRequirement: e.target.value as SellerEscrowRequirement })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1E3063]"
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
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1E3063]"
                  placeholder="Heading"
                />
                <input
                  value={config.trustPillars[pillar].subtext}
                  onChange={(e) => updatePillarText(pillar, 'subtext', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1E3063]"
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
            className="px-4 py-2 bg-[#1E3063] hover:bg-[#17244B] text-white rounded-xl font-bold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePageAdminPanel;
