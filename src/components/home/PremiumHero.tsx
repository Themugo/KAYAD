import React from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Car, Pause, Play, ShieldCheck, Handshake, Lock } from 'lucide-react';
import './premium-hero.css';

/**
 * KAYARD KE signature hero. Presentation only: every piece of content (copy, CTA labels, vehicle, slide state) is supplied by the
 * marketplace, which already owns the admin hero configuration, the eligible-vehicle policy and the carousel state. This component
 * never fetches anything and never decides which vehicle is shown, so there is exactly one featured-vehicle system.
 *
 * The composition (brand gradient, road arc, text column, fade into the vehicle stage) is independent of the vehicle image: with no
 * vehicle it renders a neutral automotive silhouette and keeps every text element and CTA functional.
 */
export type PremiumHeroVehicle = {
  key: string;
  title: string;
  /** Alt text, already worded for real vs illustrative artwork. */
  alt: string;
  imageSrc: string;
  mobileSrc?: string;
  /** Real listing photos are rectangular; they get the soft-edge treatment. Transparent artwork stands free. */
  isPhoto: boolean;
  illustrative: boolean;
  eyebrow: string;
  detail: string;
  broken: boolean;
  ariaLabel: string;
};

export interface PremiumHeroProps {
  eyebrow: string;
  headline: React.ReactNode;
  supportCopy: string;
  primaryLabel: string;
  primaryAria: string;
  secondaryLabel: string;
  secondaryAria: string;
  onPrimary: () => void;
  onSecondary: () => void;
  vehicle?: PremiumHeroVehicle;
  onVehicleSelect: () => void;
  onVehicleBroken: () => void;
  slideCount: number;
  slideIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onGo: (index: number) => void;
  showArrows: boolean;
  showDots: boolean;
  autoplay: boolean;
  paused: boolean;
  onTogglePause: () => void;
  showVehicleInfo: boolean;
  backgroundUrl?: string;
  backgroundStyle?: React.CSSProperties;
  primaryColor?: string;
  secondaryBorderColor?: string;
  /** Message shown (and announced) when no vehicle is configured / eligible yet. */
  emptyNote?: string;
  floating?: React.ReactNode;
  stageHandlers?: React.HTMLAttributes<HTMLDivElement>;
  environment: 'custom' | 'brand';
}

const TRUST = [
  { icon: ShieldCheck, label: 'Verified Listings' },
  { icon: Handshake, label: 'Trusted Sellers' },
  { icon: Lock, label: 'Secure Transactions' },
];

/** Neutral automotive silhouette for the "nothing configured" state: never a broken image, never a fake listing. */
function FallbackVisual() {
  return (
    <svg className="kk-hero__fallback" viewBox="0 0 640 300" role="img" aria-label="Vehicle illustration placeholder" data-testid="hero-fallback-visual">
      <defs>
        <linearGradient id="kk-fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12D6CB" stopOpacity=".55" /><stop offset="1" stopColor="#0A3545" stopOpacity=".15" /></linearGradient>
      </defs>
      <ellipse cx="320" cy="262" rx="250" ry="14" fill="#031821" opacity=".45" />
      <path d="M92 214c-4-30 6-52 30-60l78-26c18-18 44-34 82-38h86c38 2 70 18 96 44l52 14c26 8 34 24 34 46v20c0 8-6 14-14 14h-24a42 42 0 0 0-84 0H224a42 42 0 0 0-84 0h-34c-8 0-14-6-14-14z" fill="url(#kk-fb)" stroke="#12D6CB" strokeOpacity=".55" strokeWidth="2" />
      <path d="M214 132l24-30c10-6 24-8 40-8h62c20 2 38 14 52 38z" fill="#082B40" opacity=".55" stroke="#12D6CB" strokeOpacity=".35" />
      <circle cx="182" cy="226" r="34" fill="#031821" stroke="#12D6CB" strokeOpacity=".6" strokeWidth="3" /><circle cx="182" cy="226" r="14" fill="#0A3545" />
      <circle cx="458" cy="226" r="34" fill="#031821" stroke="#12D6CB" strokeOpacity=".6" strokeWidth="3" /><circle cx="458" cy="226" r="14" fill="#0A3545" />
    </svg>
  );
}

export default function PremiumHero(p: PremiumHeroProps) {
  const v = p.vehicle;
  const multi = p.slideCount > 1;
  const showControls = multi && (p.showArrows || p.showDots || p.autoplay);
  return (
    <section
      className="kayad-public-hero kk-hero relative left-1/2 w-screen -translate-x-1/2 overflow-hidden text-white"
      aria-roledescription="carousel"
      aria-label="Featured vehicles"
      data-hero-environment={p.environment}
      data-testid="premium-hero"
    >
      <div className="kk-hero__bg" aria-hidden="true" />
      {p.backgroundUrl && <div className="kk-hero__custom-bg" style={p.backgroundStyle} aria-hidden="true" />}
      <div className="kk-hero__arc" aria-hidden="true" />
      <div className="kk-hero__arc kk-hero__arc--2" aria-hidden="true" />
      <div className="kk-hero__fade" aria-hidden="true" />

      <div className="kk-hero__inner">
        <div className="kk-hero__copy">
          <p className="kk-hero__eyebrow">{p.eyebrow}</p>
          <h1 className="kk-hero__title">{p.headline}</h1>
          <p className="kk-hero__lead">{p.supportCopy}</p>
          <div className="kk-hero__ctas">
            <button type="button" onClick={p.onPrimary} aria-label={p.primaryAria} className="kk-hero__cta kk-hero__cta--primary" style={p.primaryColor ? { backgroundColor: p.primaryColor } : undefined}>
              <span className="min-w-0 truncate">{p.primaryLabel}</span><ArrowRight className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            </button>
            <button type="button" onClick={p.onSecondary} aria-label={p.secondaryAria} className="kk-hero__cta kk-hero__cta--secondary" style={p.secondaryBorderColor ? { borderColor: p.secondaryBorderColor } : undefined}>
              <Car className="h-[18px] w-[18px] shrink-0" aria-hidden="true" /><span className="min-w-0 truncate">{p.secondaryLabel}</span>
            </button>
          </div>
          <ul className="kk-hero__trust" aria-label="Why buyers choose KAYARD KE">
            {TRUST.map(({ icon: Icon, label }) => <li key={label}><Icon className="h-[18px] w-[18px] shrink-0 text-[#12D6CB]" aria-hidden="true" /><span>{label}</span></li>)}
          </ul>
        </div>

        <div className="kk-hero__stage" data-testid="hero-stage" {...p.stageHandlers}>
          {v ? (
            <button type="button" onClick={p.onVehicleSelect} className="kk-hero__vehicle group" aria-label={v.ariaLabel} data-testid="hero-vehicle" data-illustrative={v.illustrative ? 'true' : undefined} key={v.key}>
              <span aria-hidden="true" className="kk-hero__shadow" />
              {v.broken ? (
                <span className="kk-hero__broken" role="img" aria-label={`Photo of ${v.title} is unavailable`} data-testid="hero-desktop-image-fallback"><FallbackVisual /></span>
              ) : (
                <picture>
                  {v.mobileSrc && v.mobileSrc !== v.imageSrc && <source media="(max-width: 1023.98px)" srcSet={v.mobileSrc} type={v.mobileSrc.toLowerCase().endsWith('.webp') ? 'image/webp' : undefined} />}
                  <img
                    src={v.imageSrc}
                    alt={v.alt}
                    width={1200}
                    height={720}
                    className={`kk-hero__img ${v.isPhoto ? 'kk-hero__img--photo' : 'kk-hero__img--cutout'}`}
                    // The visible hero vehicle is the page's largest image: load it first and never lazily.
                    loading="eager"
                    decoding="async"
                    {...({ fetchpriority: 'high' } as Record<string, string>)}
                    onError={p.onVehicleBroken}
                  />
                </picture>
              )}
            </button>
          ) : (
            <div className="kk-hero__vehicle kk-hero__vehicle--empty" data-testid="hero-empty-visual"><span aria-hidden="true" className="kk-hero__shadow" /><FallbackVisual /></div>
          )}

          {v && p.showVehicleInfo && (
            <button type="button" onClick={p.onVehicleSelect} className="kk-hero__caption" tabIndex={-1} aria-hidden="true" data-testid="hero-caption">
              <span className="kk-hero__caption-eyebrow">{v.eyebrow}</span>
              <span className="kk-hero__caption-title">{v.title}</span>
              {v.detail && <span className="kk-hero__caption-detail">{v.detail}</span>}
            </button>
          )}
          {p.floating}
          {!v && p.emptyNote && <p className="kk-hero__empty-note" data-testid="hero-empty-note">{p.emptyNote}</p>}

          {showControls && (
            <div className="kk-hero__controls" role="group" aria-label="Featured vehicle controls">
              {p.showArrows && <button type="button" onClick={p.onPrev} className="kk-hero__ctl" aria-label="Previous featured vehicle"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>}
              {p.autoplay && <button type="button" onClick={p.onTogglePause} aria-pressed={p.paused} className="kk-hero__ctl" aria-label={p.paused ? 'Resume automatic vehicle rotation' : 'Pause automatic vehicle rotation'}>{p.paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}</button>}
              {p.showDots && <div className="kk-hero__dots" role="group" aria-label="Choose featured vehicle">{Array.from({ length: p.slideCount }).map((_, i) => <button key={i} type="button" onClick={() => p.onGo(i)} aria-label={`Show featured vehicle ${i + 1} of ${p.slideCount}`} aria-current={i === p.slideIndex ? 'true' : undefined} className="kk-hero__dot"><span /></button>)}</div>}
              {p.showArrows && <button type="button" onClick={p.onNext} className="kk-hero__ctl" aria-label="Next featured vehicle"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>}
            </div>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live={p.paused || !p.autoplay ? 'polite' : 'off'} aria-atomic="true">{v ? `Featured vehicle ${p.slideIndex + 1} of ${Math.max(1, p.slideCount)}: ${v.title}` : ''}</p>
    </section>
  );
}
