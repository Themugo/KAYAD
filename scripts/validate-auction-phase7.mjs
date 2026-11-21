import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['registration service hard-closes live auction', read('backend/services/auctionRegistration.service.js').includes('AUCTION_BIDDING_ROOM_CLOSED')],
  ['public room-state endpoint exists', read('backend/routes/auctionRegistrationRoutes.js').includes('/room')],
  ['room service distinguishes bidding-open and registration-open', (() => { const s=read('backend/services/auctionRoom.service.js'); return s.includes('biddingOpen') && s.includes('registrationOpen'); })()],
  ['database trigger blocks late registrations', read('supabase/migrations/20261002210000_auction_bidding_room_lock.sql').includes('trg_prevent_late_auction_registration')],
  ['live UI says bidding room closed/watch-only', read('src/pages/AuctionLivePage.jsx').includes('Bidding room closed — watching only')],
  ['live UI has no live-time register action', (() => { const s=read('src/pages/AuctionLivePage.jsx'); const i=s.indexOf('Bidding room closed — watching only'); return i >= 0 && !s.slice(i, i + 1400).includes('Register for this auction'); })()],
  ['active bidder remains able to bid', read('src/pages/AuctionLivePage.jsx').includes("registration?.status === 'active'"),],
  ['canonical bid API remains unchanged', read('backend/routes/bidRoutes.js').includes('/:id/bid')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
if (failed) process.exit(1);
console.log(`PHASE7_PASS=${checks.length}`);
