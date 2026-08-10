import React, { useState } from 'react';
import { X, Settings, RotateCcw, Eye, EyeOff, History } from 'lucide-react';
import { AuctionPageConfig } from '../hooks/useAuctionPageConfig';
import { readLogEntries } from '../../Admin/hooks/adminAuditLog';

interface AuctionPageAdminPanelProps {
  config: AuctionPageConfig;
  onUpdate: (updater: (prev: AuctionPageConfig) => AuctionPageConfig) => void;
  onReset: () => void;
  onClose: () => void;
}

const SECTION_LABELS: Record<keyof AuctionPageConfig['sectionVisibility'], string> = {
  searchFilters: 'Search & Filters Bar',
  categories: 'Auction Categories',
  liveBidding: 'Live Bidding Events',
  endingSoon: 'Ending Soon',
  upcoming: 'Upcoming Auction Catalogue',
  recentlySold: 'Recently Sold',
  howItWorks: 'How KAYAD Vehicle Auctions Work',
  advertCard: 'Advert/Sponsor Card',
};

/**
 * Admin-only panel for customizing the auction ecosystem page's
 * existing sections, hero text, and one advert/sponsor card slot. Same
 * scope philosophy as HomePageAdminPanel - see useAuctionPageConfig.ts's
 * own top comment. Every control here maps to a real, working piece of
 * AuctionPageConfig.
 */
export const AuctionPageAdminPanel: React.FC<AuctionPageAdminPanelProps> = ({ config, onUpdate, onReset, onClose }) => {
  const [showAuditLog, setShowAuditLog] = useState(false);

  const toggleSection = (key: keyof AuctionPageConfig['sectionVisibility']) => {
    onUpdate((prev) => ({
      ...prev,
      sectionVisibility: { ...prev.sectionVisibility, [key]: !prev.sectionVisibility[key] },
    }));
  };

  const updateAdvertField = (field: keyof AuctionPageConfig['advertCard'], value: string) => {
    onUpdate((prev) => ({ ...prev, advertCard: { ...prev.advertCard, [field]: value } }));
  };

  // Only entries logged under the 'auction-page' area, but the same
  // shared log also holds 'escrow-rules' and 'home-page' entries - an
  // admin working from this panel can still see the full picture by
  // opening the log from either panel, since it's one shared store.
  const auctionPageLogEntries = readLogEntries().filter((e) => e.area === 'auction-page');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#1E3063]" />
            <h2 className="text-sm font-black text-[#1E3063]">Customize Auction Page (Admin)</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-5 text-xs">
          {/* Hero text */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-700 uppercase text-[10px] tracking-wide">Hero Text</h3>
            <div className="p-2.5 rounded-xl border border-slate-200 space-y-1.5">
              <input
                value={config.heroTitle}
                onChange={(e) => onUpdate((prev) => ({ ...prev, heroTitle: e.target.value }))}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1E3063]"
                placeholder="Hero title"
              />
              <textarea
                value={config.heroDescription}
                onChange={(e) => onUpdate((prev) => ({ ...prev, heroDescription: e.target.value }))}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1E3063] resize-none"
                rows={3}
                placeholder="Hero description"
              />
            </div>
          </div>

          {/* Section visibility */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-700 uppercase text-[10px] tracking-wide">Sections</h3>
            {(Object.keys(SECTION_LABELS) as (keyof AuctionPageConfig['sectionVisibility'])[]).map((key) => (
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

          {/* Advert/sponsor card content */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-700 uppercase text-[10px] tracking-wide">Advert/Sponsor Card Content</h3>
            <div className="p-2.5 rounded-xl border border-slate-200 space-y-1.5">
              <input
                value={config.advertCard.name}
                onChange={(e) => updateAdvertField('name', e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1E3063]"
                placeholder="Sponsor/partner name"
              />
              <input
                value={config.advertCard.tagline}
                onChange={(e) => updateAdvertField('tagline', e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1E3063]"
                placeholder="Tagline"
              />
              <input
                value={config.advertCard.ctaLabel}
                onChange={(e) => updateAdvertField('ctaLabel', e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1E3063]"
                placeholder="Call-to-action label"
              />
              <p className="text-[10px] text-slate-400">
                Toggle "Advert/Sponsor Card" above to show this on the page.
              </p>
            </div>
          </div>

          {/* Immutable audit log viewer - read-only, same shared,
              append-only log used by the escrow rules panel. */}
          <div className="space-y-2">
            <button
              onClick={() => setShowAuditLog(!showAuditLog)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="font-bold text-slate-700 uppercase text-[10px] tracking-wide flex items-center gap-1.5">
                <History className="w-3 h-3" /> Auction Page Change Log (Immutable)
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold">{showAuditLog ? 'Hide' : 'Show'}</span>
            </button>
            {showAuditLog && (
              <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2">
                {auctionPageLogEntries.length === 0 ? (
                  <p className="text-slate-400 text-center py-2">No changes logged yet.</p>
                ) : (
                  [...auctionPageLogEntries].reverse().map((entry) => (
                    <div key={entry.id} className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-slate-700 font-semibold">{entry.summary}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {entry.adminName} · {new Date(entry.timestamp).toLocaleString('en-KE')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
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

export default AuctionPageAdminPanel;
