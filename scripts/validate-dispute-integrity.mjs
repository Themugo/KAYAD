import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const controller = read('backend/controllers/disputeController.js');
const routes = read('backend/routes/disputeRoutes.js');
const checks = [
  ['canonical dispute UI has real API-backed evidence upload', /disputeAPI\.uploadEvidence/.test(read('src/components/EvidenceUpload.jsx'))],
  ['canonical dispute UI has real mediation API', /disputeAPI\.startMediation|disputeAPI\.completeMediation/.test(read('src/components/MediationPanel.jsx'))],
  ['canonical dispute UI has real resolution API', /disputeAPI\.resolve/.test(read('src/components/ResolutionPanel.jsx'))],
  ['canonical dispute UI has real appeal API', /disputeAPI\.appeal|disputeAPI\.reviewAppeal/.test(read('src/components/AppealPanel.jsx'))],
  ['dispute details enforce party/staff access', /involved\(e,actor\(req\)\).*staff\.includes\(role\(req\)\)/.test(controller)],
  ['evidence item remains scoped to requested escrow dispute', /getEscrow\(req\.params\.id\).*disputeEvidence/.test(controller)],
  ['evidence mutations remain scoped to requested escrow', /eq\('id',e\.id\)/.test(controller)],
  ['successful mediation transitions to resolved', /buyerSatisfied&&sellerSatisfied.*p_next_status:'resolved'/.test(controller)],
  ['common duplicate TS dispute panels removed', !fs.existsSync('src/components/features/common/MediationPanel.tsx')],
  ['legacy Mongoose dispute implementation is absent from active controller', !/from ['"].*models\/Dispute/.test(controller) && !/from ['"].*models\/Evidence/.test(controller)],
  ['dispute routes expose canonical escrow-centric workflow', /kayad_transition_dispute_atomic/.test(controller) && /kayad_resolve_dispute_atomic/.test(controller) && /\/evidence/.test(routes)],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}: ${name}`);if(!ok)failed++;}
console.log(`\nDispute integrity: ${checks.length-failed}/${checks.length} checks passed`);
process.exitCode=failed?1:0;
