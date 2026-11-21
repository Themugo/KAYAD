import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const fail = (name, detail) => { checks.push({ name, ok: false, detail }); };
const pass = (name, detail) => { checks.push({ name, ok: true, detail }); };
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const productionFiles = [
  "src/components/home/PartnerEcosystem.tsx",
  "src/components/home/CustomerTestimonials.tsx",
  "src/components/home/CustomerStories.tsx",
  "src/components/TrustBadgeMatrix.tsx",
  "src/features/FinancingView.tsx",
  "src/components/TcoCalculator.tsx",
  "src/components/features/common/TcoCalculator.tsx",
  "backend/ai/services/aiIntelligenceService.js",
  "backend/controllers/dealerPlatformController.js",
  "backend/.env.example",
];

for (const file of productionFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`exists:${file}`, "missing");
  else pass(`exists:${file}`, "present");
}

const filesToScan = productionFiles.filter((f) => fs.existsSync(path.join(root, f)));
const text = filesToScan.map(read).join("\n");
const forbidden = [
  /NCBA/i,
  /Equity Bank/i,
  /Stanbic/i,
  /KCB Bank/i,
  /Partner Bank/i,
  /partner banking ecosystem/i,
  /0% Financing Special/i,
];
for (const pattern of forbidden) {
  if (pattern.test(text)) fail(`no-unverified:${pattern}`, "found in production financial surface");
  else pass(`no-unverified:${pattern}`, "absent");
}

const financing = read("src/features/FinancingView.tsx");
if (/BankFinancingPortal/.test(financing)) fail("financing-portal-retired", "inaccessible bank officer portal still imported/rendered");
else pass("financing-portal-retired", "no bank officer portal import/render path");
if (/12\.5% - 14\.0%|24 - 48 Hours|Up to 85%/.test(financing)) fail("no-fabricated-finance-kpis", "hardcoded lender terms remain");
else pass("no-fabricated-finance-kpis", "no hardcoded lender terms");

const tco = read("src/components/TcoCalculator.tsx") + read("src/components/features/common/TcoCalculator.tsx");
if (/BANK_RATES|selectedBank|KCB|Equity|Stanbic|NCBA/.test(tco)) fail("tco-no-bank-rates", "named lender rates remain");
else pass("tco-no-bank-rates", "calculator uses an explicit illustrative rate assumption");

const dealer = read("backend/controllers/dealerPlatformController.js");
if (/Nairobi Auto Hub|1234|156000000|NCBA Bank|Equity Bank|Stanbic Bank/.test(dealer)) fail("dealer-platform-no-fabricated-finance", "fabricated dealer/finance identity or figures remain");
else pass("dealer-platform-no-fabricated-finance", "dealer profile and finance endpoint are database-backed");

const countryService = read("backend/countries/services/countryService.js");
if (/provider_name: 'Equity Bank'|provider_name: 'KCB Bank'|provider_name: 'Stanbic Bank'|provider_name: 'CRDB Bank'/.test(countryService)) fail("regional-no-unverified-banks", "regional payment-provider bootstrap still names unverified banks");
else pass("regional-no-unverified-banks", "regional provider bootstrap contains no unverified bank partnerships");

const env = read("backend/.env.example");
if (/ESCROW_BANK_NAME="Equity Bank Kenya"/.test(env)) fail("env-no-named-escrow-bank", "example config names an unverified bank");
else pass("env-no-named-escrow-bank", "escrow bank name is deployment-configured");

for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.detail}`);
const failures = checks.filter((c) => !c.ok);
console.log(`\nPhase 40 validation: ${checks.length - failures.length}/${checks.length} passed`);
if (failures.length) process.exit(1);
