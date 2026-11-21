import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

const getPublicConfig = vi.fn();
vi.mock('../../api/api', () => ({ adminAPI: { getPublicConfig: (...a: unknown[]) => getPublicConfig(...a) } }));

import { BrandingProvider, announceBrandingUpdated, sanitizeCountryBadgeText, useBrandingSafe } from '../../context/BrandingContext';
import CountryBadge from '../../components/CountryBadge';

const Wired = () => { const b = useBrandingSafe(); return <CountryBadge show={b.countryBadgeShow} text={b.countryBadgeText} />; };

const cfg = (b: Record<string, unknown>) => ({ success: true, config: { branding: b } });
beforeEach(() => { getPublicConfig.mockReset(); try { localStorage.clear(); } catch { /* ignore */ } });

describe('KE flag window beside the logo', () => {
  it('shows KE above the Kenyan flag by default, even without a provider', () => {
    render(<CountryBadge />);
    const badge = screen.getByTestId('country-badge');
    expect(badge.textContent).toContain('KE');
    expect(badge.querySelector('svg[aria-label="Flag of Kenya"]')).toBeTruthy();
  });

  it('follows the saved branding: custom label, hidden, and live refresh after a save', async () => {
    getPublicConfig.mockResolvedValueOnce(cfg({ countryBadgeText: 'ke ', countryBadgeShow: true }));
    render(<BrandingProvider><Wired /></BrandingProvider>);
    await waitFor(() => expect(screen.getByTestId('country-badge').textContent).toContain('KE'));
    getPublicConfig.mockResolvedValueOnce(cfg({ countryBadgeText: 'nbo', countryBadgeShow: true }));
    act(() => { announceBrandingUpdated(); });
    await waitFor(() => expect(screen.getByTestId('country-badge').textContent).toContain('NBO'));
    getPublicConfig.mockResolvedValueOnce(cfg({ countryBadgeShow: false }));
    act(() => { announceBrandingUpdated(); });
    await waitFor(() => expect(screen.queryByTestId('country-badge')).toBeNull());
  });

  it('keeps the label to 4 letters or digits and falls back to KE', () => {
    expect(sanitizeCountryBadgeText('ab-cd e')).toBe('ABCD');
    expect(sanitizeCountryBadgeText('')).toBe('KE');
    expect(sanitizeCountryBadgeText(undefined)).toBe('KE');
  });
});
