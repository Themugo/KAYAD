import { describe, it, expect } from 'vitest';
// @ts-ignore - backend ESM module, shared contract
import * as server from '../../../backend/utils/heroPresentation.js';
import * as client from '../../features/VehicleMarketplace/utils/heroPresentationSafety';

describe('hero presentation safety: client and server contracts stay identical', () => {
  it('numeric limits are identical (every key, min, max and default)', () => {
    expect(client.HERO_NUMERIC_LIMITS).toEqual(server.HERO_NUMERIC_LIMITS);
  });
  it('URL, link and colour rules agree on representative inputs', () => {
    const urls = ['', '/hero/a.png', '/hero/../x', 'https://cdn.test/a.jpg', 'http://x.test/a.jpg', 'javascript:alert(1)', '//evil.test/a', 'https://x.test/a.jpg")'];
    for (const u of urls) expect(client.isSafeHeroImageUrl(u), u).toBe(server.isSafeHeroImageUrl(u));
    for (const l of ['/?nav=auctions', 'javascript:x', 'https://kayad.test', '//x']) expect(client.isSafeHeroLink(l), l).toBe(server.isSafeHeroLink(l));
    for (const c of ['#0A3340', 'rgba(1,2,3,.5)', 'var(--kayad-cyan)', 'red', 'url(x)']) expect(client.isSafeHeroColor(c), c).toBe(server.isSafeHeroColor(c));
  });
  it('the client sanitiser replaces what the server would reject and clamps what the server would clamp', () => {
    const dirty = { stageHeightPct: 5, cardWidthPct: 999, backgroundUrl: 'javascript:alert(1)', overlayColor: 'red;x', overlayOpacityPct: 0 };
    const safe = client.sanitizeHeroPresentation(dirty);
    expect(safe.backgroundUrl).toBe('');
    expect(safe.stageHeightPct).toBe(70);
    expect(safe.cardWidthPct).toBe(50);
    expect(safe.overlayOpacityPct).toBe(0);
    expect(server.validateHeroPresentation(safe).errors).toEqual([]);
  });
});
