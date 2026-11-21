import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const css = read('src/styles/kayad-theme-convergence.css');
const auctionCss = read('src/styles/auction-premium.css');
const support = read('src/features/SupportView.tsx');
const index = read('src/index.css');
const app = read('src/App.tsx');
const checks = [
  ['canonical theme stylesheet is imported after Tailwind utilities', index.indexOf('@import "tailwindcss";') < index.indexOf('@import "./styles/kayad-theme-convergence.css";')],
  ['reference palette retains Automotive Services hero token', css.includes('--kayad-theme-hero: var(--kayad-brand-dark, #12576D)')],
  ['reference palette retains mint CTA token', css.includes('--kayad-theme-accent: var(--kayad-brand-accent, #13B8A6)')],
  ['Support command hero consumes canonical brand hero class', support.includes('className="kayad-brand-hero px-5 py-7 sm:px-8 sm:py-8 text-white relative overflow-hidden"')],
  ['Marketplace theme scope is route-specific', css.includes('.kayad-public-shell[data-kayad-surface="marketplace"]')],
  ['Marketplace heading colors map to KAYAD semantic tokens', css.includes('.text-navy-900, .text-navy-800') && css.includes('color: var(--kayad-theme-ink)')],
  ['Marketplace accent controls map to brand token', css.includes('.bg-navy-900, .bg-navy-800, .bg-navy-700, .bg-navy-600') && css.includes('background-color: var(--kayad-brand)')],
  ['Auction base palette consumes shared KAYAD tokens', auctionCss.includes('--ap-ink:var(--kayad-theme-ink,#0A3340)')],
  ['Auction header uses the same hero gradient tokens', auctionCss.includes('linear-gradient(112deg,var(--kayad-theme-hero,#12576D) 0%,var(--kayad-theme-hero-end,#176B87) 100%)')],
  ['Auction route overrides its active segment with canonical mint', css.includes('.kayad-public-shell[data-kayad-surface="auctions"] .auction-segment.is-active')],
  ['Semantic status and role accents are explicitly preserved', css.includes('preserving the homepage image-led composition, auction lifecycle semantics,') && css.includes('role accents and semantic success/warning/error states')],
  ['Homepage hero remains image-led and unflattened', !css.includes('.kayad-public-shell[data-kayad-surface="marketplace"] .kayad-brand-hero')],
  ['Main app continues using canonical route-scoped public shell', app.includes('data-kayad-surface={activeNav}') && app.includes('kayad-public-shell')],
  ['Focus treatment remains in shared theme layer', css.includes(':focus-visible')],
  ['Reduced-motion support remains in shared theme layer', css.includes('prefers-reduced-motion: reduce')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`RESULT ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exitCode = 1;
