import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const required = [
  'BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'REDIS_URL',
  'BREVO_API_KEY',
  'BREVO_FROM_EMAIL',
  'BREVO_FROM_NAME',
  'AT_API_KEY',
  'AT_USERNAME',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
  'TWILIO_WHATSAPP_CONTENT_SID',
  'PROVIDER_CERT_EMAIL',
  'PROVIDER_CERT_PHONE',
  'E2E_BUYER_EMAIL',
  'E2E_BUYER_PASSWORD',
  'E2E_DEALER_EMAIL',
  'E2E_DEALER_PASSWORD',
  'E2E_RELEASE_CAR_ID',
];

const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Phase 6 live certification refused to run.');
  console.error(`Missing ${missing.length} required environment variable(s):`);
  for (const key of missing) console.error(` - ${key}`);
  console.error('No provider, payment, or escrow result is being inferred.');
  process.exit(2);
}

const run = (cmd,args,env={}) => {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd,args,{stdio:'inherit',cwd:root,env:{...process.env,...env},shell:process.platform==='win32'});
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run(process.execPath,['scripts/validate-phase6-release.mjs']);
run(process.execPath,['scripts/validate-phase3-infrastructure.mjs']);
run(process.execPath,['scripts/validate-phase4-transaction-certification.mjs']);
run(process.execPath,['scripts/certify-phase4-lifecycle.mjs']);
run(process.execPath,['scripts/validate-phase5-e2e.mjs']);
run(process.execPath,['scripts/certify-phase5-browser-contract.mjs']);
run(process.execPath,['scripts/validate-communications-provider-certification.mjs'],{PROVIDER_CERT_CHANNELS:'email,sms,whatsapp'});

const e2eDir = path.join(root,'e2e');
if (!fs.existsSync(path.join(e2eDir,'package.json'))) {
  console.error('Missing e2e/package.json');
  process.exit(1);
}

run(process.platform==='win32'?'npm.cmd':'npm',['--prefix','e2e','test','--','--project=chromium','--grep','KAYAD Phase 5'],{
  E2E_RELEASE:'1',
  E2E_WITH_BACKEND:'1',
  BASE_URL: process.env.BASE_URL,
});

console.log('\nPHASE 6 LIVE CERTIFICATION COMMAND CHAIN COMPLETED');
