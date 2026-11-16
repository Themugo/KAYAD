import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(path, `file://${process.cwd()}/`), 'utf8');
const navbar = read('src/components/Navbar.tsx');
const footer = read('src/components/layout/Footer.tsx');
const admin = read('src/pages/admin/AdminSettingsBranding.jsx');
// The upload UI moved into the shared LogoUploader component (adds magic-byte sniffing on top of the type/size limits).
const uploader = read('src/components/admin/LogoUploader.jsx');
const route = read('backend/routes/adminRoutes.js');
const context = read('src/context/BrandingContext.tsx');
const checks = [
  ['navbar consumes admin branding context', navbar.includes("useBranding") && navbar.includes('branding.logoUrl')],
  // Stage 33 (STAGE33_MASTER_BRAND_LOCKUP_NAVBAR_REPORT_20261012.md) moved the
  // navbar logo's object-fit from an inline Tailwind 'object-contain' utility
  // into the dedicated '.kayad-brand__image' class (kayad-navigation.css),
  // which declares 'object-fit: contain' - same effect, different mechanism.
  ['navbar renders uploaded image with contained sizing', navbar.includes('kayad-brand__image') && navbar.includes('branding.logoType === \'image\'') && fs.readFileSync(new URL('src/styles/kayad-navigation.css', `file://${process.cwd()}/`), 'utf8').includes('object-fit: contain')],
  ['footer consumes same canonical branding context', footer.includes("useBranding") && footer.includes('const { branding } = useBranding()')],
  // A later mobile-polish pass bumped the centered footer logo's max size
  // from min(240px, 60vw) to min(250px, 68vw) - a size tweak, not a change in
  // kind; still centered, contained and responsive.
  ['centered footer supports uploaded logo', footer.includes("width: 'min(250px, 68vw)'") && footer.includes('objectPosition: \'center\'' )],
  ['column footer supports uploaded logo', footer.includes("width: 'min(220px, 100%)'") && footer.includes("objectPosition: 'left center'")],
  ['footer preserves text/icon fallback', footer.includes("branding.logoText || 'KAYAD'") && footer.includes('colors.footerAccent')],
  ['admin preview uses object-contain instead of cropping', admin.includes("objectFit: 'contain'") && uploader.includes("objectFit: 'contain'")],
  ['admin upload accepts only supported secure image types', uploader.includes('image/png,image/jpeg,image/webp') && uploader.includes("['image/png', 'image/jpeg', 'image/webp']") && !/svg/i.test(uploader.match(/accept="[^"]*"/)?.[0] || '')],
  ['admin client rejects files over 5 MB', uploader.includes('MAX_BYTES = 5 * 1024 * 1024') && /file\.size\s*>\s*MAX_BYTES/.test(uploader)],
  ['upload endpoint remains protected by admin authorization', /"\/upload-logo",\s*protect,\s*adminOrSuper,[^;]*?uploadMemory\.single\("logo"\)/s.test(route)],
  ['server persists logo URL and image mode', /config\.branding = \{ \.\.\.existingBranding, logoType: \"image\", logoUrl: result\.url \}/.test(route) && route.includes('await config.save()')],
  ['branding context normalizes saved config', context.includes('normalizeBrandingConfig(configBranding)')],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
assert.equal(failed, 0, `${failed} validation checks failed`);
