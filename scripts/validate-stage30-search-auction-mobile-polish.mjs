import fs from 'node:fs';
import assert from 'node:assert/strict';
const auctionCss = fs.readFileSync('src/styles/auction-premium.css', 'utf8');
const themeCss = fs.readFileSync('src/styles/kayad-theme-convergence.css', 'utf8');
const auction = fs.readFileSync('src/features/AuctionsView.tsx', 'utf8');
const marketplace = fs.readFileSync('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx', 'utf8');
const checks = [
  ['auction styling remains scoped to phone breakpoint', /@media\s*\(max-width:\s*640px\)[\s\S]*?\.auction-market-header/.test(auctionCss)],
  ['auction tabs remain horizontally scrollable on phones', /\.auction-segment-grid\s*\{[^}]*overflow-x:\s*auto/.test(auctionCss)],
  ['auction search and refresh remain usable on phones', /\.auction-searchbar\s*\{[^}]*flex-direction:\s*column/.test(auctionCss)],
  ['auction reduced-motion preference is respected', /prefers-reduced-motion:\s*reduce/.test(auctionCss)],
  ['auction still loads live/scheduled/completed from canonical service', /fetchList\(\{ page: 1, limit: 100, status: 'live' \}\)/.test(auction) && /status: 'draft'/.test(auction) && /status: 'ended'/.test(auction)],
  ['auction lists preserve independent failure states', /Promise\.allSettled/.test(auction) && /setFailed\(/.test(auction)],
  ['auction bidding/navigation still opens canonical detail route', /navigate\(`\/auction\/\$\{encodeURIComponent/.test(auction)],
  ['saved auction toggle still calls canonical favorites API', /toggleFavorite\(id\)/.test(auction)],
  ['marketplace toolbar polish is mobile-only', /@media\s*\(max-width:\s*639px\)[\s\S]*?\.kayad-market-toolbar/.test(themeCss)],
  ['sort select keeps real controlled state and accessible label', /value=\{sortBy\}[\s\S]*?onChange=\{\(e\) => setSortBy/.test(marketplace) && /aria-label="Sort inventory"/.test(marketplace)],
  ['real vehicle feed remains canonical', /getCars\(/.test(marketplace) && /mapBackendCarToVehicle/.test(marketplace)],
  ['desktop marketplace rules are not globally overwritten', /@media\s*\(max-width:\s*639px\)\s*\{[\s\S]*?\.kayad-market-toolbar/.test(themeCss) && /\.kayad-market-toolbar\s*\{[^}]*grid-template-columns/s.test(themeCss) === false],
];
for (const [label, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`); if (!pass) process.exitCode = 1; }
console.log(`\nStage 30 source contract checks: ${checks.filter(([,p])=>p).length}/${checks.length} PASS`);
