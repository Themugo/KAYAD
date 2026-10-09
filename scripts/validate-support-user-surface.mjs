import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const pass = label => console.log(`PASS ${label}`);
const fail = label => { console.error(`FAIL ${label}`); process.exitCode = 1; };

const support = read('src/features/SupportView.tsx');
const faq = read('src/features/SupportFAQ.tsx');
const api = read('src/services/supportApi.ts');
const app = read('src/App.tsx');
const controller = read('backend/services/support/supportPolicy.js') + read('backend/services/support/supportSerializers.js');
const migration = read('supabase/migrations/20260908113000_communications_support_lifecycle_hardening.sql');

const bannedClaims = [
  '150-Point', '150-Pt', 'CBK-regulated', '100% Buyer Protection Guarantee',
  '100% money-back guarantee', 'NCBA Bank Kenya', 'Stanbic Bank Kenya',
  'Equity Bank Asset Finance', '12.5% p.a.', '+254 700 000 999', 'Westlands Business Hub',
];

if (app.includes("React.lazy(() => import('./features/SupportView'))")) pass('App mounts the canonical SupportView'); else fail('canonical SupportView mount');
if (support.includes('createSupportCase') && support.includes('getMySupportCases') && support.includes('getSupportCase') && support.includes('replyToSupportCase') && support.includes('rateSupportCase')) pass('user support surface uses canonical case APIs'); else fail('support case API coverage');
if (support.includes('Open a support case') && support.includes('Track support to resolution')) pass('support page exposes end-to-end case flow'); else fail('end-to-end case flow');
if (support.includes('Auctions') && support.includes('Inspection') && support.includes('Escrow') && support.includes('Financing') && support.includes('service_provider')) pass('support covers core KAYAD business surfaces'); else fail('business surface coverage');
if (support.includes('Do not send passwords, OTPs')) pass('sensitive-data guidance is present'); else fail('sensitive-data guidance');
if (api.includes('/api/support/my-tickets') && api.includes('/messages`')) pass('support API exposes owned-case retrieval and replies'); else fail('support API retrieval/reply');
if (controller.includes('ticketNumber: t.ticket_number')) pass('user ticket projection exposes stable case reference'); else fail('ticket reference projection');
if (controller.includes('waiting_on_user') && controller.includes('waiting_on_internal')) pass('controller status vocabulary matches canonical support lifecycle'); else fail('support status vocabulary');
if (controller.includes('["low", "medium", "high", "urgent"]')) pass('controller priority vocabulary matches database contract'); else fail('support priority vocabulary');
if (!exists('src/features/SupportView/index.ts') && !exists('src/features/SupportView/components/SupportView.tsx') && !exists('src/components/support/SupportPage.tsx')) pass('duplicate legacy support implementations removed'); else fail('duplicate support implementations remain');
const supportText = `${support}\n${faq}`;
const banned = bannedClaims.filter(term => supportText.toLowerCase().includes(term.toLowerCase()));
if (banned.length === 0) pass('unsupported trust/contact claims absent from user support surface'); else fail(`unsupported claims remain: ${banned.join(', ')}`);
if (migration.includes("'waiting_on_user'") && migration.includes("'waiting_on_internal'") && migration.includes("'medium'")) pass('database support lifecycle contract is available'); else fail('database support lifecycle contract');

const unsupportedTiming = ['1h first-response', '1-hour first-response', '24-hour resolution', "'1 hour'", "'24 hours'", '24/7'];
const timing = unsupportedTiming.filter(t => supportText.includes(t));
if (timing.length === 0) pass('no hard-coded response/resolution time promises'); else fail(`hard-coded timing claims: ${timing.join(', ')}`);
if (support.includes('idempotencyKey')) pass('case creation is retry-safe'); else fail('idempotent creation');
if (!support.includes('Reference: ${')) pass('reference is a real linked field, not text prepended to the description'); else fail('reference prepended to description');

if (process.exitCode) process.exit(process.exitCode);
console.log('Support user-surface validation: PASS');
