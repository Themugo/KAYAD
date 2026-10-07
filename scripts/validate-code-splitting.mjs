import fs from 'node:fs';
const app = fs.readFileSync('src/App.tsx', 'utf8');
// FinancingView.tsx is intentionally retained as a content-audited legacy
// compatibility surface (see validate-finance-domain-end-to-end.mjs and
// validate-recovery-repair.mjs, which check it stays truthful/non-fabricated)
// but is no longer a routed lazy chunk in App.tsx — the canonical, actively
// mounted buyer financing surface converged onto FinancePlatform. It is
// deliberately excluded from both lists below.
const imports = [
  './features/AuctionsView','./features/EscrowView','./features/InspectionsView','./features/DealersView','./features/ChatView','./features/AdminView','./features/SupportView','./features/PaymentHistoryView','./pages/KAYADLive','./features/OwnershipPlatform','./features/PrivateSellerPlatform','./pages/dealer/dashboard/DealerDashboard','./features/FinancePlatform','./features/InspectionMarketplace/pages/InspectionMarketplacePage'
];
let failed=0;
for(const path of imports){const ok=app.includes(`React.lazy(() => import('${path}')`); console.log(`${ok?'PASS':'FAIL'} lazy ${path}`); if(!ok) failed++;}
const canonicalDiscovery = app.includes("{activeNav === 'discovery' && (") && app.includes('<AuctionsView user={user} onOpenAuth={handleOpenAuth} />');
console.log(`${canonicalDiscovery?'PASS':'FAIL'} discovery uses canonical AuctionsView surface`); if(!canonicalDiscovery) failed++;
const okSusp=app.includes('<Suspense fallback='); console.log(`${okSusp?'PASS':'FAIL'} Suspense boundary`); if(!okSusp) failed++;
const eager=['AuctionsView','EscrowView','InspectionsView','DealersView','ChatView','AdminView','SupportView','PaymentHistoryView','KAYADLive','PrivateSellerPlatform','DealerDashboard','InspectionMarketplacePage'];
for(const name of eager){const ok=!new RegExp(`import\\s+${name}\\s+from`).test(app); console.log(`${ok?'PASS':'FAIL'} no eager import ${name}`); if(!ok) failed++;}
if(failed) process.exit(1); console.log(`\nCode splitting validation: PASS`);
