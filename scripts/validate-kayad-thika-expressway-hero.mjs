import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const asset = read('../public/hero/kayad-thika-expressway-no-signs.svg');
const marketplace = read('../src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const editor = read('../src/features/HeroEditor/HeroEditorPanel.tsx');
const siteDesign = read('../backend/utils/siteDesign.js');

assert.ok(asset.includes('<svg') && asset.includes('viewBox="0 0 1920 1000"'), 'expressway SVG asset exists');
assert.ok(!/<text\b|<image\b/i.test(asset), 'background contains no embedded text, signboards, or image cutouts');
assert.ok(!/(?:Thika|Ruiru|Kiambu|Nairobi)\s*(?:↑|→|North|South)/i.test(asset), 'no location-specific signage is embedded');
assert.ok(marketplace.includes("const KENYA_ROAD_HERO_BACKGROUND = '/hero/kayad-thika-expressway-no-signs.svg'"), 'public hero uses the new expressway default');
assert.ok(editor.includes("backgroundValue: '/hero/kayad-thika-expressway-no-signs.svg'"), 'new admin hero slides use the expressway default');
assert.ok(siteDesign.includes('"/hero/kayad-thika-expressway-no-signs.svg"'), 'backend site-design default uses the expressway asset');
assert.ok(marketplace.includes("'/hero/kayad-kenyan-highlands-road.svg'"), 'legacy built-in background is migrated');
assert.ok(marketplace.includes('(presentation.backgroundUrl || KENYA_ROAD_HERO_BACKGROUND)'), 'custom admin background URLs are preserved');
assert.ok(marketplace.includes('changeHeroPair') && marketplace.includes('heroRotationMs'), 'existing vehicle-pair carousel and rotation remain');
assert.ok(marketplace.includes('aria-label="KAYAD mobile hero"'), 'existing mobile hero remains');
console.log('PASS: KAYAD Thika-style expressway hero defaults, no-location-signage asset, legacy migration, admin override preservation, and existing carousel/mobile hero contracts.');
