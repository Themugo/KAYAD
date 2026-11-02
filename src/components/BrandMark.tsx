import { CarFront } from 'lucide-react';
import { useBrandingSafe, onBrandLogoError } from '../context/BrandingContext';

interface BrandMarkProps {
  /** Pixel height of the logo image / icon tile. */
  size?: number;
  /** Show the brand name next to the mark (text logos always show it). */
  showName?: boolean;
  /** Show the saved tagline under the name. */
  showTagline?: boolean;
  className?: string;
  nameClassName?: string;
  tileClassName?: string;
}

/**
 * The one place the site logo is drawn outside the main header and footer. It reads the saved platform branding
 * (Admin > Settings > Branding), so a logo, name or tagline change reaches login, register, portals and dashboards.
 * Outside the provider (isolated renders) it shows the built-in branding.
 */
export default function BrandMark({ size = 36, showName = true, showTagline = false, className, nameClassName, tileClassName }: BrandMarkProps) {
  const b = useBrandingSafe();
  const name = b.logoText || 'KAYAD';
  const isImage = b.logoType === 'image' && !!b.logoUrl;
  return (
    <span className={className} data-testid="brand-mark" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      {isImage ? (
        <img src={b.logoUrl} onError={onBrandLogoError} alt={showName ? '' : name} aria-hidden={showName ? true : undefined} decoding="async"
          style={{ height: size, width: 'auto', maxWidth: size * 4, objectFit: 'contain', flexShrink: 0 }} />
      ) : b.logoType === 'text' ? null : (
        <span className={tileClassName} aria-hidden="true" style={{ width: size, height: size, borderRadius: Math.round(size / 3), display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg, var(--brand-dark, #0A3340), var(--brand, #176B87))', color: '#fff', flexShrink: 0 }}>
          <CarFront size={Math.round(size * 0.52)} strokeWidth={2.4} />
        </span>
      )}
      {(showName || b.logoType === 'text') && (
        <span style={{ display: 'grid', gap: 2, lineHeight: 1, minWidth: 0 }}>
          <strong className={nameClassName}>{name}</strong>
          {showTagline && b.brandTagline && <small style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', opacity: .65, whiteSpace: 'nowrap' }}>{b.brandTagline}</small>}
        </span>
      )}
    </span>
  );
}
