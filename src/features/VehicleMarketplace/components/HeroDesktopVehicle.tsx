import React from 'react';
import { ImageIcon } from 'lucide-react';
import type { Vehicle } from '../../../types';

export interface HeroDesktopVehicleProps {
  vehicle: Vehicle;
  side: 'left' | 'right';
  imageSrc: string;
  broken: boolean;
  onBroken: () => void;
  /** Vertical anchor (% of the stage) and horizontal placement (% from the chosen edge), already clamped by the caller. */
  topPct: number;
  offsetPct: number;
  widthPct: number;
  scale: number;
  showInfo: boolean;
  eyebrow: string;
  detail: string;
  /** Decorative artwork: never presented as a listing. */
  illustrative: boolean;
  onSelect: () => void;
}

/**
 * One desktop hero vehicle. Images are always object-contain (never cropped); a failed image degrades to a neutral plate that keeps
 * the truthful label, so a broken request can never leave a broken-image icon or an empty region in the carousel.
 */
export const HeroDesktopVehicle: React.FC<HeroDesktopVehicleProps> = ({
  vehicle, side, imageSrc, broken, onBroken, topPct, offsetPct, widthPct, scale, showInfo, eyebrow, detail, illustrative, onSelect,
}) => {
  const title = `${vehicle.make} ${vehicle.model}`;
  const alt = illustrative ? `Illustrative KAYARD KE showroom artwork: ${title}` : `${vehicle.year} ${title}`;
  const ariaLabel = illustrative ? `Browse vehicles. ${title} is illustrative artwork, not a listing` : `View ${title}`;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`kayad-hero-vehicle group absolute z-10 -translate-y-1/2 ${side === 'left' ? 'text-left' : 'text-right'}`}
      style={{ top: `${topPct}%`, [side]: `${offsetPct}%`, width: `${widthPct}%` } as React.CSSProperties}
      aria-label={ariaLabel}
      data-testid={`hero-desktop-vehicle-${side}`}
      data-illustrative={illustrative ? 'true' : undefined}
    >
      <div className="relative flex h-[380px] flex-col justify-end overflow-visible px-1" data-testid="hero-desktop-vehicle">
        <div className="relative flex min-h-0 flex-1 items-end justify-center">
          <span aria-hidden="true" data-testid="hero-ground-shadow" className="kayad-hero-vehicle__contact-shadow pointer-events-none absolute inset-x-[6%] bottom-0" />
          {broken ? (
            <div className="grid h-full w-full place-items-center text-white/70" role="img" aria-label={`Photo of ${title} is unavailable`} data-testid="hero-desktop-image-fallback">
              <ImageIcon className="h-12 w-12" aria-hidden="true" />
            </div>
          ) : (
            <img
              src={imageSrc}
              alt={alt}
              /* Real listing photos keep their full frame (object-contain, never cropped) inside a deliberate photo plate; transparent showcase artwork stands free on the floor. */
              className={`kayad-hero-vehicle__img max-h-full max-w-full select-none object-contain object-bottom transition-transform duration-500 group-hover:-translate-y-0.5 ${illustrative ? '' : 'kayad-hero-vehicle__photo rounded-2xl border border-white/15 bg-[#0d1a1f] shadow-[0_18px_40px_rgba(3, 19, 27, .45)]'}`}
              style={{ transform: `scale(${scale})`, transformOrigin: 'bottom center' }}
              loading="eager"
              decoding="async"
              onError={onBroken}
            />
          )}
        </div>
        {showInfo && (
          <div className="mx-auto mt-1.5 w-full max-w-[calc(100%-2rem)] rounded-2xl border border-white/20 bg-[#071F2A]/88 px-3.5 py-2.5 text-left backdrop-blur-md">
            <div className="text-[10px] font-black uppercase tracking-[.14em] text-[#49D5C6]">{eyebrow}</div>
            <div className="mt-1 truncate text-sm font-black text-white">{title}{vehicle.year ? ` · ${vehicle.year}` : ''}</div>
            <div className="mt-0.5 line-clamp-2 text-[11px] text-white/75">{detail}</div>
          </div>
        )}
      </div>
    </button>
  );
};

export default HeroDesktopVehicle;
