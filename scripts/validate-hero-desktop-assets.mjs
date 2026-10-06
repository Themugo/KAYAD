import fs from 'node:fs';

const failures = [];
const pass = (m) => console.log(`PASS ${m}`);
const fail = (m) => { failures.push(m); console.error(`FAIL ${m}`); };

const component = fs.readFileSync('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx', 'utf8');
const assets = [
  ['showcase-land-cruiser', '/hero/kayad-land-cruiser-cutout.png', 1021, 634],
  ['showcase-mercedes-gle', '/hero/kayad-mercedes-gle-cutout.png', 1028, 610],
];

for (const [id, asset, expectedWidth, expectedHeight] of assets) {
  const file = `public${asset}`;
  if (!fs.existsSync(file)) { fail(`${id}: ${file} is missing`); continue; }
  const buf = fs.readFileSync(file);
  const png = buf.length >= 24 && buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  if (!png) { fail(`${id}: desktop asset is not a PNG`); continue; }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width === expectedWidth && height === expectedHeight) pass(`${id}: ${width}x${height} canonical desktop asset`);
  else fail(`${id}: expected ${expectedWidth}x${expectedHeight}, found ${width}x${height}`);
  if (component.includes(`id: '${id}'`) && component.includes(`image: '${asset}'`)) pass(`${id}: canonical desktop asset wired`);
  else fail(`${id}: canonical desktop asset is not wired in showcase configuration`);
}

if (component.includes('kayad-land-cruiser-clean.png') && !component.includes("'/hero/kayad-land-cruiser-clean.png': CANONICAL_HERO_DESKTOP_ASSETS")) fail('legacy Land Cruiser asset is still used as a desktop showcase source');
else pass('legacy Land Cruiser clean asset is only retained for exact legacy normalization');
if (component.includes('kayad-mercedes-gle-clean.png') && !component.includes("'/hero/kayad-mercedes-gle-clean.png': CANONICAL_HERO_DESKTOP_ASSETS")) fail('legacy Mercedes asset is still used as a desktop showcase source');
else pass('legacy Mercedes clean asset is only retained for exact legacy normalization');
if (component.includes('normalizeCanonicalHeroDesktopImage')) pass('legacy canonical desktop configuration normalization is wired');
else fail('legacy canonical desktop configuration normalization is missing');

if (failures.length) { console.error(`\nHero desktop asset contract: FAIL (${failures.length})`); process.exit(1); }
console.log('\nHero desktop asset contract: PASS');
