// Mobile hero asset contract (frozen visual foundation).
// - Every canonical showcase vehicle has a mobileImage that exists on disk.
// - Mobile assets are WebP with an alpha channel, inside the 100-320 KB budget.
// - The desktop `image` uses the approved high-resolution transparent PNG.
// - The carousel's reduced-motion rule and the picture/mobile-only source wiring are present.
import fs from 'node:fs';

const failures = [];
const pass = (m) => console.log(`PASS ${m}`);
const fail = (m) => { failures.push(m); console.error(`FAIL ${m}`); };

const component = fs.readFileSync('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx', 'utf8');
const css = fs.readFileSync('src/index.css', 'utf8');

const entries = [...component.matchAll(/\{ id: '(showcase-[a-z-]+)'[^}]*?image: '([^']+)', mobileImage: '([^']+)'/g)]
  .map((m) => ({ id: m[1], image: m[2], mobileImage: m[3] }));
if (entries.length >= 2) pass(`canonical showcase config declares mobileImage for ${entries.length} vehicles`);
else fail('canonical showcase vehicles must each declare mobileImage');

for (const { id, image, mobileImage } of entries) {
  if (/-cutout\.png$/.test(image)) pass(`${id}: desktop image uses approved high-resolution cutout (${image})`);
  else fail(`${id}: desktop image must use the approved high-resolution cutout PNG, found ${image}`);
  const file = `public${mobileImage}`;
  if (!fs.existsSync(file)) { fail(`${id}: ${file} is missing`); continue; }
  const buf = fs.readFileSync(file);
  const kb = buf.length / 1024;
  const isWebp = buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP';
  if (isWebp) pass(`${id}: valid WebP container`); else fail(`${id}: not a WebP file`);
  // VP8X extended header carries the alpha flag (bit 4 of the flags byte at offset 20).
  const hasAlpha = isWebp && buf.subarray(12, 16).toString() === 'VP8X' && (buf[20] & 0x10) === 0x10;
  if (hasAlpha) pass(`${id}: WebP has an alpha channel (transparent background)`); else fail(`${id}: WebP must carry alpha`);
  if (kb >= 100 && kb <= 320) pass(`${id}: ${Math.round(kb)} KB within 100-320 KB budget`);
  else fail(`${id}: ${Math.round(kb)} KB outside 100-320 KB budget`);
}

if (/<source media="\(max-width: 1023\.98px\)" srcSet=\{heroMobileVehicle\.heroMobileImage\}/.test(component)) pass('mobile WebP is selected only below the lg breakpoint');
else fail('mobile <source media> wiring missing');
if (/\.kayad-hero-mobile-slide\s*\{[^}]*animation:[^}]*var\(--kayad-hero-slide-ms, 320ms\)/.test(css)) pass('slide transition defaults to 320ms (admin-controlled via mobileTransitionMs)');
else fail('slide transition must default to 320ms and read --kayad-hero-slide-ms');
if (/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.kayad-hero-mobile-slide[^}]*animation: none/s.test(css)) pass('reduced motion disables the slide animation');
else fail('reduced-motion rule missing');
if (!/setInterval|autoplay/i.test(component.slice(component.indexOf('KAYAD mobile hero')))) pass('no autoplay in the mobile hero block');
else fail('mobile hero must not autoplay');

if (failures.length) { console.error(`\nHero mobile asset contract: FAIL (${failures.length})`); process.exit(1); }
console.log('\nHero mobile asset contract: PASS');
