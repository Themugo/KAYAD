import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const buyer = fs.readFileSync(path.join(root, 'src/features/OwnershipPlatform/pages/PersonalBuyingModule.tsx'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const hub = fs.readFileSync(path.join(root, 'src/components/DashboardHub.tsx'), 'utf8');
const bidApi = fs.readFileSync(path.join(root, 'src/services/bidApi.ts'), 'utf8');
const escrow = fs.readFileSync(path.join(root, 'src/features/escrow/ParticipantEscrowDesk.tsx'), 'utf8');
const checks = [
  ['No standalone buyer dashboard route remains in App', !app.includes("activeNav === 'buyer-platform'") && !app.includes('BuyerPlatform')],
  ['Legacy buyer route redirects into DashboardHub Buying section', app.includes("if (path === '/buyer-platform') return <RequireAuth><Navigate to=\"/?nav=dashboard&section=buying\"")],
  ['Buying content is mounted only as a section inside DashboardHub', /PersonalBuyingTools/.test(hub) && /section=\{personalSection/.test(hub)],
  ['Personal buying module reuses the App-level saved-vehicle collection', /savedVehicles=\{savedVehiclesList\}/.test(hub) && /savedVehiclesSessionUserId/.test(buyer) && !buyer.includes('getFavorites()')],
  ['Ownership snapshot is supplied once by DashboardHub', /ownershipDashboard=\{snapshot\}/.test(hub) && /ownershipDashboard\?\.currentVehicles/.test(buyer)],
  ['Buyer bid history uses canonical fetchMyBids service', buyer.includes('fetchMyBids()') && bidApi.includes("'/api/bids/my'")],
  ['Auction discovery remains the existing public auction surface', buyer.includes("onNavigate?.('discovery')")],
  ['Inspection workspace remains embedded in the personal account', buyer.includes('<InspectionsView') && buyer.includes('viewMode="account"')],
  ['Participant escrow and account financing remain embedded', buyer.includes('<ParticipantEscrowDesk') && escrow.includes('getMyEscrowOverview()') && buyer.includes('<FinanceMarketplace')],
  ['Participant escrow summary is supplied by the unified dashboard without a duplicate initial fetch', /escrowOverview=\{personalEscrowOverview\}/.test(hub) && /initialData=\{escrowOverview\}/.test(buyer) && /initialDataLoading/.test(escrow)],
  ['Saved vehicle and owned-vehicle data are masked by account identity', /savedVehiclesSessionUserId === userId/.test(buyer) && /ownershipSessionKey === userId/.test(buyer) && /visibleFavorites = userId && savedVehiclesSessionUserId === userId/.test(buyer)],
  ['Unavailable bid history is not presented as a false empty list', buyer.includes('bid history is temporarily unavailable')],
  ['No second buyer dashboard hero or summary panel remains', !buyer.includes('Welcome{user.name') && !buyer.includes('Buying activity summary') && buyer.includes('data-kayad-personal-buying-module')],
];
let failures = 0;
for (const [label, passed] of checks) { console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`); if (!passed) failures++; }
console.log(`\nPersonal buying module convergence: ${checks.length - failures}/${checks.length} passed`);
if (failures) process.exitCode = 1;
