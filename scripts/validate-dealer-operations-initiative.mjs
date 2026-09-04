import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['dealer controller exists', fs.existsSync(path.join(root, 'backend/controllers/dealerPlatformController.js'))],
  ['dealer routes exist', fs.existsSync(path.join(root, 'backend/routes/dealerPlatformRoutes.js'))],
  ['inventory reads dealer scope', read('backend/controllers/dealerPlatformController.js').includes('Car.find(filter)') && read('backend/controllers/dealerPlatformController.js').includes('dealer: req.user.id')],
  ['listing mutations use canonical car controller', read('backend/controllers/dealerPlatformController.js').includes('return createCar(req, res)') && read('backend/controllers/dealerPlatformController.js').includes('return updateCar(req, res)') && read('backend/controllers/dealerPlatformController.js').includes('return deleteCar(req, res)')],
  ['lead updates persist', read('backend/controllers/dealerPlatformController.js').includes('Lead.findByIdAndUpdate(leadId, updates')],
  ['unsupported CRM notes are explicit', read('backend/controllers/dealerPlatformController.js').includes('DEALER_CRM_NOTE_UNAVAILABLE')],
  ['unsupported CRM tasks are explicit', read('backend/controllers/dealerPlatformController.js').includes('DEALER_CRM_TASK_UNAVAILABLE')],
  ['unsupported marketing is explicit', read('backend/controllers/dealerPlatformController.js').includes('DEALER_MARKETING_UNAVAILABLE')],
  ['unsupported team is explicit', read('backend/controllers/dealerPlatformController.js').includes('DEALER_TEAM_UNAVAILABLE')],
  ['unsupported subscription is explicit', read('backend/controllers/dealerPlatformController.js').includes('DEALER_SUBSCRIPTION_UNAVAILABLE')],
  ['unsupported finance is explicit', read('backend/controllers/dealerPlatformController.js').includes('DEALER_FINANCE_UNAVAILABLE')],
  ['AI is not fabricated', read('backend/controllers/dealerPlatformController.js').includes('DEALER_COPILOT_UNAVAILABLE') && read('backend/controllers/dealerPlatformController.js').includes('DEALER_AI_RECOMMENDATIONS_UNAVAILABLE')],
  ['reputation reads real reviews', read('backend/controllers/dealerPlatformController.js').includes('Review.find({ dealer: req.user.id })')],
  ['dealer settings uses dealer profile API', read('src/pages/dealer/DealerSettings.jsx').includes('dealerApi.getDealerProfile') && read('src/pages/dealer/DealerSettings.jsx').includes('dealerApi.updateDealerProfile')],
  ['dealer routes require dealer role', read('backend/routes/dealerPlatformRoutes.js').includes('dealerOnly')],
];
let failed = 0;
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`), failed += ok ? 0 : 1;
console.log(`\nDealer Operations Initiative: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
