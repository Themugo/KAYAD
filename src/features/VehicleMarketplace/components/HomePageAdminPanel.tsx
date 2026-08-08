import React from 'react';
import { X, Settings, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { HomePageConfig, ACCENT_THEME_OPTIONS } from '../hooks/useHomePageConfig';

interface HomePageAdminPanelProps {
  config: HomePageConfig;
  onUpdate: (updater: (prev: HomePageConfig) => HomePageConfig) => void;
  onReset: () => void;
  onClose: () => void;
}

const SECTION_LABELS: Record<keyof HomePageConfig['sectionVisibility'], string> = {
  searchTrustCard: 'Search & Trust Info Card',
  featuredPicks: 'Featured Picks Slider',
  savedSearchesAndInventoryHeader: 'Saved Searches, Inventory Count & Sort Controls',
  sponsorCardsInGrid: 'Sponsor/Partner Cards in Grid',
  recentlyViewed: 'Recently Viewed Carousel',
};

/**
 * Admin-only panel for customizing the home page's existing sections,
 * text, and accent color. Not a general page builder - see
 * useHomePageConfig.ts's own top comment for the scope reasoning. Every
 * control here maps to a real, working piece of HomePageConfig; nothing
 * in this panel is decorative or non-functional.
 */
export const HomePageAdminPanel: React.FC<HomePageAdminPanelProps> = ({ config, onUpdate, onReset, onClose }) => {
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
