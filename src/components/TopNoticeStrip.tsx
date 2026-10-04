import React, { useEffect, useMemo, useState } from 'react';
import { getVisibleAdSlots, AdDisplayMode, AdSlot } from '../services/adApi';
import { adminAPI } from '../api/api';

/**
 * KAYAD's broadcast notice board. Content, ordering, colors, visibility and
 * animation behavior are persisted through the admin Ad Manager.
 */
export const TopNoticeStrip: React.FC = () => {
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [fadeIndex, setFadeIndex] = useState(0);
  const [fadeVisible, setFadeVisible] = useState(true);
  const [heroTickerConfig, setHeroTickerConfig] = useState({ enabled: true, fallbackText: 'KAYAD · Verified vehicles across East Africa · Live auctions · Transparent bidding · Protected transactions', backgroundColor: '#0A3340', textColor: '#FFFFFF', heightPx: 36, scrollSeconds: 34 });

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getVisibleAdSlots('top_ticker'), adminAPI.getPublicConfig()])
      .then(([adsResult, configResult]) => {
        if (cancelled) return;
        if (adsResult.status === 'fulfilled') setSlots(adsResult.value);
        if (configResult.status === 'fulfilled') {
          const cfg = (configResult.value as any)?.config || configResult.value || {};
          const hp = cfg?.heroPresentation || {};
          setHeroTickerConfig((prev) => ({
            ...prev,
            enabled: hp.tickerEnabled !== false,
            fallbackText: hp.tickerFallbackText || prev.fallbackText,
            backgroundColor: hp.tickerBackgroundColor || prev.backgroundColor,
            textColor: hp.tickerTextColor || prev.textColor,
            heightPx: Math.max(28, Math.min(60, Number(hp.tickerHeightPx) || prev.heightPx)),
            scrollSeconds: Math.max(10, Math.min(90, Number(hp.tickerScrollSeconds) || prev.scrollSeconds)),
          }));
        }
      })
      .catch(() => { /* notice board must never block the main site */ })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const mode: AdDisplayMode = useMemo(() => slots[0]?.displayMode || 'scroll', [slots]);
  const activeFadeDuration = Math.max(1200, slots[0]?.fadeDurationMs || 4500);
  const scrollDuration = Math.max(10, slots[0]?.scrollDurationSeconds || 28);

  useEffect(() => {
    if (mode !== 'fade' || slots.length < 2) return;
    let swapTimer: number | undefined;
    const timer = window.setInterval(() => {
      setFadeVisible(false);
      swapTimer = window.setTimeout(() => {
        setFadeIndex((current) => (current + 1) % slots.length);
        setFadeVisible(true);
      }, 350);
    }, activeFadeDuration);
    return () => {
      window.clearInterval(timer);
      if (swapTimer !== undefined) window.clearTimeout(swapTimer);
    };
  }, [mode, activeFadeDuration, slots.length]);

  useEffect(() => {
    if (fadeIndex >= slots.length) setFadeIndex(0);
  }, [fadeIndex, slots.length]);

  if (!heroTickerConfig.enabled) return null;

  if (!loaded || slots.length === 0) {
    const fallback = heroTickerConfig.fallbackText.split(' · ').filter(Boolean);
    const items = [...fallback, ...fallback];
    return (
      <div className="kayad-top-ticker w-full overflow-hidden border-b border-white/10" style={{ height: heroTickerConfig.heightPx, backgroundColor: heroTickerConfig.backgroundColor, ['--kayad-ticker-height' as any]: `${heroTickerConfig.heightPx}px` }} role="region" aria-label="KAYAD notices">
        <div className="flex min-w-max h-full animate-marquee whitespace-nowrap" style={{ animationDuration: `${heroTickerConfig.scrollSeconds}s` }}>
          {items.map((item, index) => (
            <span key={`${item}-${index}`} className="flex items-center gap-6 px-8 py-2 text-[11px] sm:text-xs font-semibold tracking-[0.01em]" style={{ color: heroTickerConfig.textColor }}>
              <span className="h-1.5 w-1.5 rounded-full bg-[#13B8A6]" aria-hidden="true" />
              {item}
              <span className="text-white/25" aria-hidden="true">|</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  const renderSlot = (slot: AdSlot, extraClass = '') => {
    const content = (
      <span className={`flex items-center justify-center gap-2 px-5 sm:px-8 py-2 text-[11px] sm:text-xs font-semibold tracking-[0.01em] ${extraClass}`}>
        <span className="font-bold">{slot.title}</span>
        {slot.tagline && <span className="opacity-80 font-normal">— {slot.tagline}</span>}
        {slot.priceTag && <span className="font-bold">{slot.priceTag}</span>}
        {slot.buttonText && <span className="font-bold underline underline-offset-2">{slot.buttonText}</span>}
      </span>
    );

    return slot.buttonUrl ? (
      <a href={slot.buttonUrl} className="block" aria-label={slot.title}>{content}</a>
    ) : content;
  };

  if (mode === 'fade') {
    const slot = slots[fadeIndex];
    return (
      <div
        className="kayad-top-ticker w-full overflow-hidden border-b border-white/10" style={{ height: heroTickerConfig.heightPx, backgroundColor: heroTickerConfig.backgroundColor, ['--kayad-ticker-height' as any]: `${heroTickerConfig.heightPx}px` }}
        role="region"
        aria-label="KAYAD notices"
        aria-live="polite"
      >
        <div
          className="h-full flex items-center justify-center transition-opacity duration-700 ease-in-out"
          key={slot.id}
          style={{
            opacity: (fadeVisible ? 1 : 0) * (slot.opacity / 100),
            backgroundColor: slot.backgroundColor || '#0A3340',
            color: slot.textColor || '#FFFFFF',
          }}
        >
          {renderSlot(slot)}
        </div>
      </div>
    );
  }

  const loopItems = [...slots, ...slots];
  return (
    <div
      className="kayad-top-ticker w-full overflow-hidden border-b border-white/10" style={{ height: heroTickerConfig.heightPx, backgroundColor: heroTickerConfig.backgroundColor, ['--kayad-ticker-height' as any]: `${heroTickerConfig.heightPx}px` }}
      role="region"
      aria-label="KAYAD notices"
    >
      <div
        className="flex min-w-max h-full animate-marquee hover:[animation-play-state:paused] whitespace-nowrap"
        style={{ animationDuration: `${scrollDuration}s` }}
      >
        {loopItems.map((slot, index) => (
          <span
            key={`${slot.id}-${index}`}
            style={{
              backgroundColor: slot.backgroundColor || '#0A3340',
              color: slot.textColor || '#FFFFFF',
              opacity: slot.opacity / 100,
            }}
          >
            {renderSlot(slot)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default TopNoticeStrip;
