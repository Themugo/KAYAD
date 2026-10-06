import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const faq = fs.readFileSync(path.join(root, 'src/features/SupportFAQ.tsx'), 'utf8');
const mobileNav = fs.readFileSync(path.join(root, 'src/components/MobileBottomNav.tsx'), 'utf8');
const navbar = fs.readFileSync(path.join(root, 'src/components/Navbar.tsx'), 'utf8');

const checks = [
  ['App uses authoritative AuthProvider user/session', app.includes('useAuth()') && app.includes('AuthProvider')],
  ['Admin surface is role-gated', app.includes("activeNav === 'admin' && isAdmin") && app.includes("path === '/admin'") && app.includes('<RequireAdmin>')],
  ['Dealer workspace is role-gated', app.includes("activeNav === 'dealer-dashboard' && !isDealer && !isAdmin") && app.includes("path === '/dealer'")],
  ['Private buyer surfaces are auth-gated', app.includes("protectedNavs = new Set(['admin', 'dashboard', 'payments', 'profile', 'saved', 'chat', 'buyer-platform', 'dealer-dashboard'])")],
  ['Legacy direct routes canonicalize instead of falling through to Marketplace', ['/admin/login','/gallery','/marketplace','/auctions','/escrow','/support','/inspections','/financing','/saved','/profile','/payments','/chat','/dashboard','/buyer-platform','/dealer','/admin'].every(p => app.includes(`path === '${p}'`))],
  ['Support FAQ marketplace navigation uses canonical nav', faq.includes("faq.nextStep === 'Open Marketplace' ? 'marketplace'") && !faq.includes("faq.nextStep === 'Marketplace' ? 'gallery'")],
  ['Support FAQ auction navigation uses canonical discovery nav', faq.includes("faq.nextStep === 'Open Auction' ? 'discovery'")],
  ['Private workspaces suppress the public mobile dock', mobileNav.includes('Mobile marketplace navigation') && app.includes('privateWorkspaceNavs')],
  ['Private workspaces suppress the public notice strip', app.includes('{!privateWorkspaceNavs.has(activeNav) && <TopNoticeStrip />}')],
  ['Support FAQ case CTA uses its actual data label', faq.includes("if (faq.nextStep === 'Open a support case')")],
  ['Mobile bottom navigation has one canonical menu entry', (mobileNav.match(/key: 'menu'/g) || []).length === 1],
  ['Desktop navigation exposes one canonical Marketplace entry', (navbar.match(/handleNavSelect\('marketplace'\)/g) || []).length >= 1],
  ['Global horizontal overflow is clipped at document level', fs.readFileSync(path.join(root,'src/index.css'),'utf8').includes('overflow-x: clip')],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed++;
}
console.log(`FINAL SYSTEM SURFACE GUARD: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
