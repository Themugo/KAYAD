import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');
const card = read('src/components/VehicleCard.tsx');
const modal = read('src/components/VehicleDetailModal.tsx');
const page = read('src/components/detail/VehicleDetailPage.tsx');
const css = read('src/components/VehicleCard/VehicleCard.css');
const checks = [
  ['Marketplace card images use contain', /className="w-full h-full object-contain p-2/.test(card)],
  ['Card image stage retains neutral mint background', /vehicle-card-image-stage/.test(card) && /bg-\[#EEF7F5\]/.test(card)],
  ['Card save action remains wired', /onToggleSave\(vehicle\.id\)/.test(card)],
  ['Card compare action remains wired', /onToggleCompare\(vehicle\.id\)/.test(card)],
  ['Card price remains sourced from vehicle payload', /vehicle\.currentBid \?\? vehicle\.price/.test(card)],
  ['Modal gallery main image uses contain', /object-contain p-2/.test(modal)],
  ['Modal gallery thumbnails use contain', /object-contain bg-\[#EEF7F5\] p-1/.test(modal)],
  ['Modal gallery remains touch-swipe enabled', /onTouchStart/.test(modal) && /onTouchEnd/.test(modal)],
  ['Modal gallery retains fullscreen lightbox', /setIsLightboxOpen\(true\)/.test(modal)],
  ['Modal save action remains wired', /onClick=\{\(\) => onToggleSave\(vehicle\.id\)\}/.test(modal)],
  ['Modal seller contact action remains wired', /onClick=\{\(\) => onContactSeller\(vehicle\)\}/.test(modal)],
  ['Detail page main gallery uses contain', /object-contain bg-\[#EEF7F5\] p-2/.test(page)],
  ['Detail page thumbnails remain horizontally scrollable', /overflow-x-auto/.test(page) && /object-contain bg-\[#EEF7F5\] p-1/.test(page)],
  ['Detail page save and seller chat remain wired', /toggleSaveVehicle\(vehicle\.id\)/.test(page) && /openChat\(vehicle\.id\)/.test(page)],
  ['Existing card theme tokens retain KAYAD navy and teal', /#0a3340/i.test(css) && /#176b87/i.test(css)],
  ['No object-fit crop remains in primary card or gallery renderers', !/object-cover/.test(card) && !/object-cover/.test(modal) && !/object-cover/.test(page)],
];
for (const [label, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`);
console.log(`\n${checks.filter(([,p])=>p).length}/${checks.length} checks passed`);
if (checks.some(([,p])=>!p)) process.exit(1);
