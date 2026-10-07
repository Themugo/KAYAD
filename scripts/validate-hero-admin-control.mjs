// Hero admin-control contract: every hero setting must be controlled from the admin panel,
// persisted by the existing platform-config endpoint, and read (not hardcoded) by the public hero.
import fs from 'node:fs';

const failures = [];
const pass = (m) => console.log(`PASS ${m}`);
const fail = (m) => { failures.push(m); console.error(`FAIL ${m}`); };
const read = (p) => fs.readFileSync(p, 'utf8');

const types = read('src/features/VehicleMarketplace/types/heroPresentation.ts');
const panel = read('src/features/VehicleMarketplace/components/HomePageAdminPanel.tsx');
const hero = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const css = read('src/index.css');
const adminRoutes = read('backend/routes/adminRoutes.js');

const interfaceKeys = (name) => {
  const start = types.indexOf(`export interface ${name}`);
  const body = types.slice(start, types.indexOf('\n}', start));
  return [...body.matchAll(/^ {2}(\w+)\??: /gm)].map((m) => m[1]);
};

// 1. Every active public/admin config key has an admin control.
// HeroShowcaseVehicle remains in the persisted schema only for backward compatibility;
// its identity/image fields are deliberately no longer an active public hero control.
for (const name of ['HeroPresentationConfig', 'HeroFloatingCard']) {
  const missing = interfaceKeys(name).filter((k) => !new RegExp(`\\b${k}\\b`).test(panel));
  if (missing.length === 0) pass(`${name}: every field has an admin control`);
  else fail(`${name}: no admin control for ${missing.join(', ')}`);
}

if (!/Marketing Showcase Cars/.test(panel) && !/updateShowcaseVehicle\(/.test(panel)) pass('legacy showcase vehicle identity controls are removed from the active admin surface');
else fail('legacy showcase vehicle identity controls must not remain an active admin surface');

// 2. Persistence: the existing platform-config endpoint accepts every hero config object.
for (const key of ['heroPresentation', 'heroCardContent', 'heroFeaturedMode', 'heroCarIds']) {
  if (new RegExp(`"${key}"`).test(adminRoutes)) pass(`backend persists ${key}`);
  else fail(`backend does not allow saving ${key}`);
}

// 3. One normalizer for public + admin so stored values cannot break the layout.
if (/normalizeHeroExtras\(presentation\)/.test(hero) && /normalizeHeroExtras\(heroLayout\)/.test(panel)) pass('public page and admin save share normalizeHeroExtras');
else fail('normalizeHeroExtras must be used by both the public page and the admin save path');

// 4. Public hero reads admin values; no hardcoded copy/timers/dimensions in the JSX.
const mobile = hero.slice(hero.indexOf('aria-label="KAYAD mobile hero"'));
const checks = [
  ['mobile headline comes from admin hero slide', /\{heroHeadlineNode\}<\/h1>/.test(mobile)],
  ['mobile eyebrow comes from admin hero slide', /\{heroEyebrowDisplay\}<\/span>/.test(mobile)],
  ['mobile supporting copy comes from admin config', /\{heroSupportCopy\}<\/p>/.test(mobile)],
  ['desktop and mobile CTA labels are admin-controlled', (hero.match(/\{heroPrimaryLabel\}/g) || []).length === 2 && (hero.match(/\{heroSecondaryLabel\} <span/g) || []).length === 2],
  ['admin headline is never rewritten (no includes() hack)', !/heroHeadline\.includes\(/.test(hero)],
  ['no literal 6500ms rotation timer', !/\b6500\b/.test(hero)],
  ['rotation timers use admin rotationSeconds', (hero.match(/heroRotationMs/g) || []).length >= 6],
  ['mobile stage height uses admin min/max', /mobileStageMinPx/.test(hero) && /mobileStageMaxPx/.test(hero) && !/clamp\(168px,52vw,260px\)/.test(hero)],
  ['mobile transition duration uses admin value', /--kayad-hero-slide-ms/.test(hero) && /var\(--kayad-hero-slide-ms, 320ms\)/.test(css)],
  ['hero colors come from admin config', /heroPresentation\.primaryButtonColor/.test(hero) && /heroPresentation\.secondaryButtonBorderColor/.test(hero) && /heroPresentation\.cardTextColor/.test(hero)],
];
for (const [name, ok] of checks) (ok ? pass : fail)(name);

if (failures.length) { console.error(`\nHero admin-control contract: FAIL (${failures.length})`); process.exit(1); }
console.log('\nHero admin-control contract: PASS');
