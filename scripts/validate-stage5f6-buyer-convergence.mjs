import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const buyer = fs.readFileSync(path.join(root, 'src/features/OwnershipPlatform/pages/BuyerPlatform.tsx'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const bidApi = fs.readFileSync(path.join(root, 'src/services/bidApi.ts'), 'utf8');
const escrow = fs.readFileSync(path.join(root, 'src/features/escrow/ParticipantEscrowDesk.tsx'), 'utf8');
const inspections = fs.readFileSync(path.join(root, 'src/features/InspectionsView.tsx'), 'utf8');
const checks = [
  ['Active App route still mounts the existing BuyerPlatform', app.includes("activeNav === 'buyer-platform'") && app.includes('<BuyerPlatform')],
  ['BuyerPlatform reuses the canonical favorites API', buyer.includes("from '../../../services/favoriteApi'") && buyer.includes('getFavorites()')],
  ['BuyerPlatform reuses the existing ownership dashboard API', buyer.includes('getOwnershipDashboard()')],
  ['Buyer bid summary uses canonical fetchMyBids service', buyer.includes("from '../../../services/bidApi'") && buyer.includes('fetchMyBids()') && bidApi.includes("'/api/bids/my'")],
  ['Dashboard has direct existing auction navigation', buyer.includes("onNavigate?.('discovery')")],
  ['Dashboard has direct existing marketplace navigation', buyer.includes("onNavigate?.('marketplace')")],
  ['Dashboard exposes existing inspection workspace/navigation', buyer.includes('<InspectionsView') && buyer.includes("onNavigate?.('inspections')")],
  ['Dashboard reuses participant-scoped escrow workspace', buyer.includes('<ParticipantEscrowDesk') && escrow.includes('getMyEscrowOverview()')],
  ['Dashboard reuses existing account financing component', buyer.includes('<FinanceMarketplace')],
  ['Dashboard has truthful unavailable bid state', buyer.includes("failedResources.includes('auction bids')") && buyer.includes('bid history is temporarily unavailable')],
  ['Dashboard avoids a second bid/auction/escrow API implementation', !/fetch\(['"`]\/api\/(?:bids|auctions|escrow)\//.test(buyer)],
  ['Inspection workflow remains the existing account-mode component', buyer.includes('viewMode="account"') && fs.readFileSync(path.join(root, 'src/services/inspectionApi.ts'), 'utf8').includes("'/api/inspections/my'")],
  ['Dashboard uses accessible icon controls and focus indicators', buyer.includes('focus-visible:ring-2') && buyer.includes('aria-hidden="true"')],
  ['Buyer sections support in-page purchase and inspection navigation', buyer.includes('id="buyer-escrow-workspace"') && buyer.includes('id="buyer-inspection-workspace"')],
];
let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failures++;
}
console.log(`\nStage 5F.6 source contract: ${checks.length - failures}/${checks.length} checks passed`);
if (failures) process.exitCode = 1;
