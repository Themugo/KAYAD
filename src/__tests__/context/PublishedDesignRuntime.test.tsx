import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

let publicConfig: any;
vi.mock('../../api/api', async () => {
  const preview = await import('../../services/designPreview');
  return { adminAPI: { getPublicConfig: () => Promise.resolve(preview.applyPreviewToPublicConfig(publicConfig)) } };
});
vi.mock('../../services/adApi', () => ({ getVisibleAdSlots: () => Promise.resolve([]) }));

import { BrandingProvider, useBranding } from '../../context/BrandingContext';
import { TopNoticeStrip } from '../../components/TopNoticeStrip';
import { startPreview, stopPreview } from '../../services/designPreview';

const Probe = () => { const { branding } = useBranding(); return <div data-testid="probe">{branding.logoText}|{branding.primaryColor}|{branding.footerCopyright}</div>; };
const published = () => ({
  success: true,
  config: {
    branding: { logoText: 'SPRING', logoType: 'text', primaryColor: '#AA0000', footerCopyright: 'Spring Ltd' },
    fontDisplay: 'Georgia', fontBody: 'Arial',
    heroPresentation: { tickerEnabled: true, tickerFallbackText: 'Spring sale on now', tickerBackgroundColor: '#123456', tickerTextColor: '#FEFEFE', tickerHeightPx: 44 },
  },
});
beforeEach(() => { publicConfig = published(); sessionStorage.clear(); document.documentElement.removeAttribute('style'); });

describe('the PUBLISHED design reaches the real public components', () => {
  test('branding provider applies colours, brand text and supported fonts site-wide', async () => {
    render(<BrandingProvider><Probe /></BrandingProvider>);
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('SPRING|#AA0000|Spring ltd'.replace('ltd', 'Ltd')));
    const root = document.documentElement.style;
    expect(root.getPropertyValue('--brand')).toBe('#AA0000');
    expect(root.getPropertyValue('--font-display')).toContain('Georgia');
    expect(root.getPropertyValue('--font-sans')).toContain('Arial');
  });
  test('an unsupported saved font is ignored instead of breaking typography', async () => {
    publicConfig.config.fontDisplay = 'Comic Sans'; publicConfig.config.fontBody = undefined;
    render(<BrandingProvider><Probe /></BrandingProvider>);
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toContain('SPRING'));
    expect(document.documentElement.style.getPropertyValue('--font-display')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--font-sans')).toBe('');
  });
  test('the announcement strip renders the published text and colours', async () => {
    render(<TopNoticeStrip />);
    const el = await screen.findAllByText(/Spring sale on now/);
    expect(el.length).toBeGreaterThan(0);
    const strip = el[0].closest('[style*="background"]') as HTMLElement | null;
    expect(strip?.getAttribute('style') || '').toMatch(/rgb\(18, 52, 86\)|#123456/i);
  });
  test('announcement disabled in the design hides the strip', async () => {
    publicConfig.config.heroPresentation.tickerEnabled = false;
    const { container } = render(<TopNoticeStrip />);
    await waitFor(() => expect(container.textContent).not.toMatch(/Spring sale on now/));
  });
  test('an admin preview renders through the same components WITHOUT changing the published config', async () => {
    startPreview({ designId: 'x', name: 'Draft', config: {
      brand: { logoType: 'text', logoUrl: '', logoText: 'DRAFTCO', brandTagline: 't', footerDescription: 'f', footerCopyright: 'c' }, colors: { primaryColor: '#00AA00' },
      typography: { fontDisplay: 'Outfit', fontBody: 'Outfit' }, hero: { backgroundUrl: '', overlayColor: '#000000', overlayOpacityPct: 1, showVehicleInfoCards: true, rotationSeconds: 5 },
      announcement: { enabled: true, text: 'Draft banner', backgroundColor: '#000000', textColor: '#FFFFFF', heightPx: 36, scrollSeconds: 30, direction: 'left', transition: 'scroll' } } });
    render(<><BrandingProvider><Probe /></BrandingProvider><TopNoticeStrip /></>);
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toContain('DRAFTCO|#00AA00'));
    expect((await screen.findAllByText(/Draft banner/)).length).toBeGreaterThan(0);
    expect(publicConfig.config.branding.logoText).toBe('SPRING'); // server copy untouched
    stopPreview();
  });
});
