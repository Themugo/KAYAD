import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['premium master logo asset is bundled', fs.existsSync(path.join(root, 'public/branding/kayad-premium-master.png'))],
  ['default branding uses bundled master logo', /logoType:\s*'image'[\s\S]*?logoUrl:\s*'\/branding\/kayad-premium-master\.png'/.test(read('src/context/BrandingContext.tsx'))],
  ['shared navbar uses admin-managed logo URL', /branding\.logoType === 'image' && branding\.logoUrl/.test(read('src/components/Navbar.tsx'))],
  ['legacy EA badge is removed from navbar wordmark', !/kayad-brand__ea/.test(read('src/components/Navbar.tsx'))],
  ['primary footer uses same admin-managed logo URL', /branding\.logoType === 'image' && branding\.logoUrl/.test(read('src/components/layout/Footer.tsx'))],
  ['admin can upload logo image', /adminAPI\.uploadLogo\(form\)/.test(read('src/pages/admin/AdminSettingsBranding.jsx'))],
  ['admin can edit footer description', /value=\{branding\.footerDescription \|\| ''\}/.test(read('src/pages/admin/AdminSettingsBranding.jsx'))],
  ['admin can edit footer copyright', /value=\{branding\.footerCopyright \|\| ''\}/.test(read('src/pages/admin/AdminSettingsBranding.jsx'))],
  ['footer consumes admin-managed description', /branding\.footerDescription \|\|/.test(read('src/components/layout/Footer.tsx'))],
  ['footer consumes admin-managed copyright', /branding\.footerCopyright \|\|/.test(read('src/components/layout/Footer.tsx'))],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`RESULT ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
