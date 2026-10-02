import fs from 'node:fs';
import process from 'node:process';

const view = fs.readFileSync('src/features/AuctionsView.tsx','utf8');
const bidApi = fs.readFileSync('src/services/bidApi.ts','utf8');
const report = fs.existsSync('API_DATABASE_CONTRACT_REPORT.md') ? fs.readFileSync('API_DATABASE_CONTRACT_REPORT.md','utf8') : '';
const livePage = fs.readFileSync('src/pages/AuctionLivePage.jsx','utf8');
const checks = [
  ['canonical auction discovery uses real auction transport', view.includes("fetchList({ page: 1, limit: 100, status: 'live' })")],
  ['canonical live auction page uses canonical bid transport', livePage.includes("import { placeBid, BidApiError } from '../services/bidApi'") && livePage.includes('await placeBid(id, amount')],
  ['bid request sends the real car-scoped endpoint', bidApi.includes('/api/bids/${carId}/bid')],
  ['successful bid response triggers pending payment confirmation UI', livePage.includes('setBidConfirmation(true)') && livePage.includes('M-Pesa confirmation')],
  ['live auction page refreshes authoritative bid state through the auction bid transport', livePage.includes('fetchAuctionBids(id)')],
  ['legacy audit report does not claim canonical auction UI has no real bid call', !report.includes('canonical auction UI never calls any of this backend at all') && !report.includes('canonical auction UI has no real bid call')],
];

let passed=0;
for (const [name, ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok) passed++; }
console.log(`${passed}/${checks.length} checks passed`);
if(passed!==checks.length) process.exit(1);
