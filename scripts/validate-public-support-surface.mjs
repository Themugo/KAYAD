import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const routes = read('backend/routes/cmsRoutes.js');
const controller = read('backend/controllers/cmsController.js');
const limiter = read('backend/middleware/rateLimiter.js');
const serializers = read('backend/services/support/supportSerializers.js');
const support = read('src/features/SupportView.tsx');
const faq = read('src/features/SupportFAQ.tsx');
const faqApi = read('src/services/cmsFaqApi.ts');
const ticker = read('src/components/TopNoticeStrip.tsx');
const supportTests = read('src/__tests__/features/support/supportView.test.tsx');
const faqTests = read('src/__tests__/features/support/supportFaq.test.tsx');

const checks = [
  ['public FAQ list route precedes auth middleware', routes.indexOf('router.get("/faqs", asyncHandler(getFaqs));') >= 0 && routes.indexOf('router.get("/faqs", asyncHandler(getFaqs));') < routes.indexOf('router.use(protect)')],
  ['public FAQ detail route precedes auth middleware', routes.indexOf('router.get("/faqs/:id", validateObjectId, asyncHandler(getFaqById));') >= 0 && routes.indexOf('router.get("/faqs/:id", validateObjectId, asyncHandler(getFaqById));') < routes.indexOf('router.use(protect)')],
  ['FAQ write routes remain behind auth middleware', routes.indexOf('router.post("/faqs", allowRoles') > routes.indexOf('router.use(protect)') && routes.includes('router.delete("/faqs/:id", validateObjectId, allowRoles("admin", "superadmin")')],
  ['public FAQ reads use explicit allow-list projection', controller.includes('function publicFaqProjection(faq)') && controller.includes('faqs.map(publicFaqProjection)') && controller.includes('res.json(publicFaqProjection(faq))')],
  ['public FAQ projection excludes editor identity fields', (() => { const block = controller.slice(controller.indexOf('function publicFaqProjection'), controller.indexOf('export async function getFaqs')); return !block.includes('createdBy:') && !block.includes('updatedBy:') && block.includes('question: faq.question') && block.includes('nextStep: faq.nextStep'); })()],
  ['anonymous popularity tracking is rate-limited by client IP', routes.includes('router.post("/faqs/:id/popularity", faqPopularityLimiter') && limiter.includes('export const faqPopularityLimiter') && limiter.includes('ipKeyGenerator(req.ip)')],
  ['customer message projection strips internal notes', serializers.includes('.filter((m) => m && m.isInternal !== true)')],
  ['support list is scoped to current account', support.includes('ticketsOwnerId === userId') && support.includes('selectedTicketOwnerId === userId')],
  ['stale list and detail responses are discarded', support.includes('ticketsRequestId.current !== requestId') && support.includes('ticketRequestId.current !== requestId') && support.includes('accountGeneration.current !== generation')],
  ['account switch clears customer case and draft state', support.includes('setTickets([])') && support.includes('setSelectedTicket(null)') && support.includes('setSubject(\'\')') && support.includes('setIssue(\'\')')],
  ['server failures are presented without raw backend detail', support.includes("case 'server': return 'Support is temporarily unavailable. Please try again shortly.'")],
  ['failed case detail has retry and return actions', support.includes('ticketLoadError') && support.includes('Try again') && support.includes('Back to your cases')],
  ['active and closed cases have separate headings', support.includes('activeCases.map(renderTicket)') && support.includes('pastCases.map(renderTicket)') && support.includes('Resolved &amp; closed')],
  ['FAQ account fallback is categorized correctly', faq.includes("id: 'faq-account-1',\n    category: 'account'")],
  ['FAQ fallback includes case reopen guidance', faq.includes('Can I reopen a case after it is marked resolved?')],
  ['CMS category aliases normalize to supported filters', faq.includes("if (key === 'account_access') return 'account'") && faq.includes("if (key === 'auction') return 'auctions'")],
  ['FAQ disclosure controls expose expanded state', faq.includes('aria-expanded={expanded}')],
  ['malformed CMS FAQ rows cannot break public help rendering', faqApi.includes('if (!Array.isArray(body?.data)) return []') && faqApi.includes("typeof item.question === 'string'")],
  ['marquee duplicate loop is hidden from assistive technology', ticker.includes('aria-hidden={index >= fallback.length ? true : undefined}') && ticker.includes('aria-hidden={index >= slots.length ? true : undefined}')],
  ['account-switch regression test exists', supportTests.includes('hides the previous account case list and selected conversation immediately on account switch') && supportTests.includes('ignores a delayed case-list response from the previous account')],
  ['public FAQ category regression tests exist', faqTests.includes('bundled account-access help in the Account & access filter') && faqTests.includes('normalizes legacy CMS category spellings')],
];

let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed += 1;
}
console.log(`Public support surface validation: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exitCode = 1;
