import React from 'react';
/** Letters and digits only, upper case, at most 4 characters; empty falls back to KE. */
export const badgeLabel = (value: unknown): string => {
  const t = typeof value === 'string' ? value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) : '';
  return t || 'KE';
};

/** Kenyan flag: black, red and green bands separated by white fringes, with a Maasai shield and crossed spears. Drawn inline so it never fails to load. */
export function KenyaFlag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 30 20" role="img" aria-label="Flag of Kenya" preserveAspectRatio="xMidYMid slice">
      <rect width="30" height="20" fill="#fff" />
      <rect width="30" height="5" fill="#000" />
      <rect y="6" width="30" height="8" fill="#BB0000" />
      <rect y="15" width="30" height="5" fill="#006600" />
      <g stroke="#fff" strokeWidth=".8" strokeLinecap="round"><path d="M10.2 4.6 L19.8 15.4" /><path d="M19.8 4.6 L10.2 15.4" /></g>
      <ellipse cx="15" cy="10" rx="3.1" ry="5" fill="#fff" />
      <ellipse cx="15" cy="10" rx="2.7" ry="4.6" fill="#BB0000" />
      <path d="M15 5.4 V14.6" stroke="#000" strokeWidth=".9" />
      <ellipse cx="15" cy="10" rx="1.1" ry="1.7" fill="#fff" />
    </svg>
  );
}

/**
 * The "KE" flag window beside the logo. Visibility and the label come from Admin > Settings > Branding, so the
 * owner can change or hide it at any time (the caller passes the saved values). Purely presentational (no link, no behaviour).
 */
export default function CountryBadge({ show, text, className = '' }: { show?: boolean; text?: string; className?: string }) {
  if (show === false) return null;
  const label = badgeLabel(text);
  return (
    <span className={`kayad-country-badge ${className}`} data-testid="country-badge" aria-label={`${label} - Kenya`} role="img">
      <span className="kayad-country-badge__label" aria-hidden="true">{label}</span>
      <span className="kayad-country-badge__window" aria-hidden="true"><KenyaFlag className="kayad-country-badge__flag" /></span>
    </span>
  );
}
