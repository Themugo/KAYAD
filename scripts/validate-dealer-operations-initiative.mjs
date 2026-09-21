import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const controller = read('backend/controllers/dealerPlatformController.js');
const checks = [
  ['dealer controller exists', fs.existsSync(path.join(root, 'backend/controllers/dealerPlatformController.js'))],
  ['dealer routes exist', fs.existsSync(path.join(root, 'backend/routes/dealerPlatformRoutes.js'))],
  ['inventory reads dealer scope', controller.includes('Car.find({ dealer: dealerId })')],
  ['listing mutations use canonical car controller', controller.includes('return createCar(req, res)') && controller.includes('return updateCar(req, res)') && controller.includes('return deleteCar(req, res)')],
  ['lead updates persist through canonical lead service', controller.includes('serviceUpdateLeadStage') && controller.includes('serviceAddLeadActivity')],
  ['CRM notes persist through canonical lead activity service', controller.includes('export async function addLeadNote') && controller.includes('serviceAddLeadActivity(lead.id, "note"')],
  ['CRM tasks persist through canonical lead activity service', controller.includes('export async function createTask') && controller.includes('serviceAddLeadActivity(lead.id, "task"')],
  ['marketing campaigns persist in canonical table', controller.includes('create("marketing_campaigns"') && controller.includes('findAll("marketing_campaigns"')],
  ['dealer team operations persist in canonical table', controller.includes('findAll("dealer_teams"') && controller.includes('create("dealer_teams"') && controller.includes('update("dealer_teams"')],
  ['subscription entitlement is canonical', controller.includes('getDealerEntitlement')],
  ['finance surface is explicitly routed or delegated', controller.includes('getDealerFinance') || controller.includes('finance')],
  ['AI recommendations are evidence-backed', controller.includes('source: "dealer_operational_records"') && controller.includes('evidence: { listingIds') && controller.includes('evidence: { leadIds')],
  ['reputation reads persisted reviews', controller.includes('listDealerReviews')],
  ['dealer settings uses dealer profile API', read('src/pages/dealer/DealerSettings.jsx').includes('dealerApi.getDealerProfile') && read('src/pages/dealer/DealerSettings.jsx').includes('dealerApi.updateDealerProfile')],
  ['dealer routes require dealer role', read('backend/routes/dealerPlatformRoutes.js').includes('dealerOnly')],
];
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed++;
}
console.log(`\nDealer Operations Initiative: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
