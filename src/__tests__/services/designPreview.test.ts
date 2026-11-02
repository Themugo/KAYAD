import { describe, test, expect, beforeEach } from 'vitest';
import { designToPublicPatch, applyPreviewToPublicConfig, startPreview, stopPreview, getActivePreview, PREVIEW_KEY, type DesignConfig } from '../../services/designPreview';

const design: DesignConfig = {
  brand: { logoType: 'text', logoUrl: '', logoText: 'ACME', brandTagline: 'Tag', footerDescription: 'F', footerCopyright: 'C' },
  colors: { primaryColor: '#AA0000', backgroundColor: '#FFFFFF' },
  typography: { fontDisplay: 'Georgia', fontBody: 'Outfit' },
  hero: { backgroundUrl: '/hero/x.jpg', overlayColor: '#000000', overlayOpacityPct: 30, showVehicleInfoCards: false, rotationSeconds: 0 },
  announcement: { enabled: true, text: 'Sale', backgroundColor: '#112233', textColor: '#FFFFFF', heightPx: 40, scrollSeconds: 20, direction: 'right', transition: 'fade' },
};
beforeEach(() => sessionStorage.clear());

describe('design preview', () => {
  test('maps a design onto the exact public-config keys the site reads, keeping unrelated hero settings', () => {
    const p = designToPublicPatch(design, { branding: { customKeep: 1 }, heroPresentation: { stageHeightPct: 90 } });
    expect(p.branding).toMatchObject({ customKeep: 1, logoText: 'ACME', primaryColor: '#AA0000' });
    expect(p.fontDisplay).toBe('Georgia'); expect(p.fontBody).toBe('Outfit');
    expect(p.heroPresentation).toMatchObject({ stageHeightPct: 90, overlayOpacityPct: 30, showVehicleInfoCards: false, rotationSeconds: 0, tickerEnabled: true, tickerFallbackText: 'Sale', tickerBackgroundColor: '#112233', tickerDirection: 'right', tickerTransition: 'fade', tickerHeightPx: 40 });
  });
  test('no active preview: the response is returned untouched', () => {
    const cfg = { config: { branding: { logoText: 'LIVE' } } }; expect(applyPreviewToPublicConfig(cfg)).toBe(cfg);
  });
  test('active preview is merged for wrapped and bare shapes, and stops cleanly', () => {
    startPreview({ designId: 'd1', name: 'Spring', config: design });
    expect(getActivePreview()?.name).toBe('Spring');
    expect((applyPreviewToPublicConfig({ success: true, config: { branding: { logoText: 'LIVE' }, platformName: 'P' } }) as any).config).toMatchObject({ platformName: 'P', branding: { logoText: 'ACME' }, fontDisplay: 'Georgia' });
    expect((applyPreviewToPublicConfig({ branding: { logoText: 'LIVE' } }) as any).branding.logoText).toBe('ACME');
    stopPreview(); expect(getActivePreview()).toBeNull();
    expect((applyPreviewToPublicConfig({ branding: { logoText: 'LIVE' } }) as any).branding.logoText).toBe('LIVE');
  });
  test('a corrupt or hand-edited stored preview is ignored, never crashes the site', () => {
    for (const bad of ['not json', '{"config":{}}', '{"config":{"brand":1}}', 'null']) { sessionStorage.setItem(PREVIEW_KEY, bad); expect(getActivePreview()).toBeNull(); expect(applyPreviewToPublicConfig({ a: 1 })).toEqual({ a: 1 }); }
  });
});
