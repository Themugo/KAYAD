import React from 'react';
import { LucideIcon, ExternalLink } from 'lucide-react';

export interface MarketingCardData {
  id: string;
  /** Shown as a small uppercase label in the corner - always visible,
   * never hidden or minimized. A marketplace's users need to be able
   * to tell a sponsored placement from a real listing at a glance;
   * burying or shrinking this label defeats that. */
  label: 'Sponsored' | 'Partner' | 'Featured Dealer';
  category: string;
  name: string;
  tagline: string;
  ctaLabel: string;
  ctaUrl?: string;
  icon: LucideIcon;
  /** Tailwind color token, e.g. '#1E3063' or 'emerald' - used for the
   * icon badge and accent border so different sponsor categories are
   * visually distinguishable from each other, not just from real cars. */
  accentColor: string;
}

interface MarketingCardProps {
  data: MarketingCardData;
}

/**
 * A sponsor/partner/advertisement placement designed to sit inside the
 * same grid as VehicleCard (matches its overall footprint so it doesn't
 * break grid alignment) but is deliberately NOT a visual copy of it -
 * no image-first layout, no price, no "View Details" affordance shaped
 * like a listing. A user should never be able to mistake this for a
 * real vehicle, even glancing quickly while scrolling.
 */
export const MarketingCard: React.FC<MarketingCardProps> = React.memo(({ data }) => {
  const Icon = data.icon;

  const handleClick = () => {
    if (data.ctaUrl) {
      window.open(data.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && data.ctaUrl) {
          e.preventDefault();
          handleClick();
        }
      }}
      role={data.ctaUrl ? 'button' : undefined}
      tabIndex={data.ctaUrl ? 0 : undefined}
      aria-label={`${data.label}: ${data.name}`}
      className="relative bg-gradient-to-br from-slate-50 to-white rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between p-4 h-full min-h-[220px] cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#1E3063] focus:ring-offset-2"
    >
      {/* Always-visible disclosure label - top right, high contrast,
          never smaller or lower-contrast than any other badge on a real
          VehicleCard, since this needs to be at least as noticeable. */}
      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-white">
        {data.label}
      </span>

      <div className="space-y-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${data.accentColor}18`, border: `1px solid ${data.accentColor}30` }}
        >
          <Icon className="w-5 h-5" style={{ color: data.accentColor }} />
        </div>

        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">
            {data.category}
          </p>
          <h3 className="text-sm font-black text-[#1E3063] font-display leading-snug">
            {data.name}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">
            {data.tagline}
          </p>
        </div>
      </div>

      <div
        className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200 text-xs font-extrabold group-hover:gap-3 transition-all"
        style={{ color: data.accentColor }}
      >
        <span>{data.ctaLabel}</span>
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
      </div>
    </div>
  );
});

MarketingCard.displayName = 'MarketingCard';

export default MarketingCard;
