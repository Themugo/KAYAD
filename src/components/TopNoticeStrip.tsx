import React, { useEffect, useState } from 'react';
import { getVisibleAdSlots, AdSlot } from '../services/adApi';

/**
 * A real, backend-driven scrolling notice/advertisement strip above the
 * navbar. Per explicit direction: the admin writes any text and picks
 * any per-advertiser color entirely through the real Ad Manager panel
 * (features/AdManager/AdManagerPanel.tsx) - nothing here is
 * hardcoded, and no code change is ever needed to add, edit, remove,
 * or recolor an entry. Renders nothing at all when there are zero
 * real, visible entries, rather than an empty, broken-looking strip.
 */
export const TopNoticeStrip: React.FC = () => {
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getVisibleAdSlots('top_ticker')
      .then((data) => { if (!cancelled) setSlots(data); })
      .catch(() => { /* a failed ticker fetch should never block the real page underneath it */ })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  if (!loaded || slots.length === 0) return null;

  // Duplicated once so the CSS marquee loops seamlessly (the second
  // copy scrolls in right as the first scrolls out, with no visible
  // gap or jump).
  const loopItems = [...slots, ...slots];

  return (
    <div className="w-full overflow-hidden bg-[#1E3063]">
      <div className="flex animate-marquee hover:[animation-play-state:paused] whitespace-nowrap">
        {loopItems.map((slot, i) => (
          <a
            key={`${slot.id}-${i}`}
            href={slot.buttonUrl || undefined}
            className="flex items-center gap-2 px-6 py-1.5 text-xs font-semibold shrink-0"
            style={{
              backgroundColor: slot.backgroundColor,
              color: slot.textColor,
              opacity: slot.opacity / 100,
            }}
          >
            <span>{slot.title}</span>
            {slot.tagline && <span className="opacity-80 font-normal">— {slot.tagline}</span>}
            {slot.buttonText && <span className="font-bold underline underline-offset-2">{slot.buttonText}</span>}
          </a>
        ))}
      </div>
    </div>
  );
};

export default TopNoticeStrip;
