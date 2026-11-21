import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(repo, p), 'utf8');

describe('KAYARD KE brand migration (user-visible surfaces)', () => {
  it('index.html, manifest use KAYARD KE and carry social-card meta', () => {
    const html = read('index.html'); const manifest = JSON.parse(read('public/manifest.webmanifest'));
    expect(html).toMatch(/<title>[^<]*KAYARD KE/); expect(html).not.toMatch(/<title>[^<]*KAYAD/i);
    expect(html).toMatch(/og:image/); expect(html).toMatch(/twitter:card" content="summary_large_image/);
    expect(`${manifest.name} ${manifest.short_name}`).toMatch(/KAYARD/); expect(`${manifest.name} ${manifest.short_name}`).not.toMatch(/KAYAD/i);
  });
  it('legal entity KAYARD MOTOR HUB is retained where legally required', () => {
    expect(read('src/components/Footer.tsx')).toMatch(/KAYARD MOTOR HUB/);
    expect(read('src/pages/LegalPage.tsx')).toMatch(/KAYARD MOTOR HUB/);
  });
  it('transactional email defaults carry the new brand', () => {
    expect(read('backend/services/emailProvider.service.js')).toMatch(/BREVO_FROM_NAME \|\| "KAYARD KE"/);
    expect(read('backend/services/email.service.js')).toMatch(/KAYARD KE/);
  });
  it('brand mark PNG and the social card are real images', () => {
    expect(fs.readFileSync(path.join(repo, 'public/branding/kayard-k-mark.png')).subarray(1, 4).toString()).toBe('PNG');
    const og = fs.readFileSync(path.join(repo, 'public/opengraph.jpg')); expect(og[0]).toBe(0xff); expect(og[1]).toBe(0xd8);
  });
  it('no user-visible "KAYAD" literal remains in navbar/footer/hero/marketplace components', () => {
    for (const f of ['src/components/Navbar.tsx', 'src/components/Footer.tsx', 'src/components/home/PremiumHero.tsx', 'src/features/VehicleMarketplace/components/VehicleMarketplace.tsx']) {
      const bad = read(f).split('\n').filter((l) => /\bKAYAD\b(?! EA)/.test(l) && !/^\s*(\/\/|\*|\{?\/\*)/.test(l) && !/KAYAD EA|kayad[_-]|KAYADLive|KAYAD_|\/\/.*KAYAD/.test(l));
      expect(bad, f).toEqual([]);
    }
  });
});
