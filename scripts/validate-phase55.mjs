import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [
  ['dealer controller imports canonical InspectionOrder model', () => {
    const s = fs.readFileSync(path.join(root, 'backend/controllers/dealerPlatformController.js'), 'utf8');
    return s.includes('import InspectionOrder from "../models/InspectionOrder.js";');
  }],
  ['auction endpoint is dealer scoped and reads real cars', () => {
    const s = fs.readFileSync(path.join(root, 'backend/controllers/dealerPlatformController.js'), 'utf8');
    return s.includes('Car.find({ dealer: dealerId, auctionStatus: { $ne: "none" } })');
  }],
  ['inspection endpoint is dealer scoped through dealer vehicles', () => {
    const s = fs.readFileSync(path.join(root, 'backend/controllers/dealerPlatformController.js'), 'utf8');
    return s.includes('Car.find({ dealer: dealerId })') && s.includes('InspectionOrder.find({ carId: { $in: carIds } })');
  }],
  ['analytics endpoint computes from real listings, leads and released escrows', () => {
    const s = fs.readFileSync(path.join(root, 'backend/controllers/dealerPlatformController.js'), 'utf8');
    return s.includes('Car.find({ dealer: dealerId })') && s.includes('Lead.find({ dealer: dealerId })') && s.includes('Escrow.find({ seller: dealerId, status: "released" })');
  }],
  ['analytics endpoint has no legacy fabricated headline totals', () => {
    const s = fs.readFileSync(path.join(root, 'backend/controllers/dealerPlatformController.js'), 'utf8');
    const section = s.slice(s.indexOf('export async function getDealerAnalytics'), s.indexOf('// ============================================================\n// TEAM MANAGEMENT'));
    return !section.includes('12845') && !section.includes('187500000') && !section.includes('156');
  }],
  ['dealer API exposes real operations endpoints', () => {
    const s = fs.readFileSync(path.join(root, 'src/services/dealerPlatformApi.js'), 'utf8');
    return ['getAuctionInventory', 'getInspectionOrders', 'getDealerAnalytics'].every((x) => s.includes(x));
  }],
  ['live dealer dashboard loads auctions, inspections and analytics from API', () => {
    const s = fs.readFileSync(path.join(root, 'src/pages/dealer/dashboard/DealerDashboard.tsx'), 'utf8');
    return s.includes("dealerApi.getAuctionInventory") && s.includes("dealerApi.getInspectionOrders") && s.includes("dealerApi.getDealerAnalytics");
  }],
  ['finance, team and settings do not display fabricated records', () => {
    const s = fs.readFileSync(path.join(root, 'src/pages/dealer/dashboard/DealerDashboard.tsx'), 'utf8');
    return s.includes('not backed by a canonical dealer-scoped data contract yet') && s.includes('KAYAD will not display simulated records here');
  }],
  ['overview no longer falls back to invented headline values', () => {
    const s = fs.readFileSync(path.join(root, 'src/pages/dealer/dashboard/DealerDashboard.tsx'), 'utf8');
    const overview = s.slice(s.indexOf("{activeSection === 'overview'"), s.indexOf("{activeSection === 'inventory'"));
    return !overview.includes('|| 47') && !overview.includes("|| '12,845'") && !overview.includes('|| 156') && !overview.includes('187500000');
  }],
  ['phase 55 documentation exists', () => fs.existsSync(path.join(root, 'PHASE_55_COMPLETE.md'))],
];

let passed = 0;
for (const [name, fn] of checks) {
  try {
    const ok = Boolean(fn());
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
    if (ok) passed++;
  } catch (err) {
    console.log(`FAIL: ${name} (${err.message})`);
  }
}
console.log(`Phase 55 validation: ${passed}/${checks.length} passed`);
process.exitCode = passed === checks.length ? 0 : 1;
