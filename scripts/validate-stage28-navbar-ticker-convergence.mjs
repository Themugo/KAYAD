import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
  ['navbar retains admin tagline alongside image logo', ['src/components/Navbar.tsx','kayad-brand__tag--reserved'].every((x)=>fs.existsSync(path.join(root,x)) || fs.readFileSync(path.join(root,'src/components/Navbar.tsx'),'utf8').includes(x))],
  ['navbar master logo has controlled responsive width', fs.readFileSync(path.join(root,'src/components/Navbar.tsx'),'utf8').includes('max-w-[142px]')],
  ['footer reads shared BrandingContext', fs.readFileSync(path.join(root,'src/components/Footer.tsx'),'utf8').includes("useBranding")],
  ['footer uses admin-managed image logo', fs.readFileSync(path.join(root,'src/components/Footer.tsx'),'utf8').includes('branding.logoUrl')],
  ['admin can select ticker direction', fs.readFileSync(path.join(root,'src/features/VehicleMarketplace/components/HomePageAdminPanel.tsx'),'utf8').includes('tickerDirection')],
  ['admin can select ticker transition', fs.readFileSync(path.join(root,'src/features/VehicleMarketplace/components/HomePageAdminPanel.tsx'),'utf8').includes('tickerTransition')],
  ['ticker applies configurable direction', fs.readFileSync(path.join(root,'src/components/TopNoticeStrip.tsx'),'utf8').includes('animationDirection')],
  ['ticker supports fade/pop modes', fs.readFileSync(path.join(root,'src/components/TopNoticeStrip.tsx'),'utf8').includes("heroTickerConfig.transition === 'pop'")],
  ['ticker background/text remain admin configurable', ['tickerBackgroundColor','tickerTextColor'].every((x)=>fs.readFileSync(path.join(root,'src/components/TopNoticeStrip.tsx'),'utf8').includes(x))],
  ['canonical top_ticker AdManager remains in use', fs.readFileSync(path.join(root,'src/components/TopNoticeStrip.tsx'),'utf8').includes("getVisibleAdSlots('top_ticker')")],
];
let failed=0; for (const [name,ok] of checks){ console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
console.log(`RESULT ${checks.length-failed}/${checks.length} PASS`); if(failed) process.exitCode=1;
