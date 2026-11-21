import { execFileSync } from 'child_process';
const scripts=[
 'validate-marketplace-initiative.mjs',
 'validate-listing-lifecycle-integrity.mjs',
 'validate-marketplace-service-boundary.mjs',
 'validate-transactions-money-initiative.mjs',
 'validate-payment-gateway-lifecycle.mjs',
 'validate-payment-escrow-domain.mjs',
 'validate-ownership-passport-domain.mjs',
 'validate-domain-lifecycle-integrity.mjs',
 'validate-transaction-integrity.mjs',
 'validate-inspection-marketplace.mjs',
 'validate-dispute-integrity.mjs',
 'validate-wave2-invariants.mjs',
 'validate-marketplace-convergence.mjs',
 'validate-marketplace-ui-convergence.mjs',
];
let failed=0;
for(const s of scripts){
 console.log(`\n=== ${s} ===`);
 try{execFileSync(process.execPath,[`scripts/${s}`],{stdio:'inherit'});}catch{failed++;}
}
console.log(`\nMARKETPLACE PHASE-10 GATE: ${failed===0?'PASS':'FAIL'} (${scripts.length-failed}/${scripts.length} validators passed)`);
if(failed)process.exit(1);
