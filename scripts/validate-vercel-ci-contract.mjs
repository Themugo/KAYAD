import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const css = fs.readFileSync('src/styles/auction-experience-2.css', 'utf8');
const failures = [];
const pass = (name) => console.log(`PASS ${name}`);
const fail = (name) => failures.push(name);

if (pkg.engines?.node === '>=22.22.2') pass('Package Node engine matches repository/Vercel 22.x baseline'); else fail('Package Node engine range');
if (workflow.includes('npm install -g vercel@60.1.3')) pass('Vercel CLI pinned to 60.1.3'); else fail('Vercel CLI pin');
if (workflow.includes('vercel --version')) pass('Vercel CLI version verification'); else fail('Vercel CLI version verification');
if (workflow.includes('VERCEL_TOKEN') && workflow.includes('VERCEL_ORG_ID') && workflow.includes('VERCEL_PROJECT_ID')) pass('Vercel credentials and target IDs required'); else fail('Vercel credential/project targeting contract');
if (workflow.includes('id: deploy') && workflow.includes('VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}') && workflow.includes('VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}') && workflow.includes('VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}')) pass('Deployment step receives Vercel secrets'); else fail('Deployment step secret environment');
if (workflow.includes('vercel link --yes --project=') && workflow.includes('--scope=')) pass('Non-interactive project linking'); else fail('Non-interactive project linking');
if (workflow.includes('vercel pull --yes --environment=production')) pass('Production settings pull'); else fail('Production settings pull');
if (workflow.includes('vercel build --prod')) pass('Production Vercel build'); else fail('Production Vercel build');
if (workflow.includes('vercel deploy --prebuilt --prod')) pass('Prebuilt production deployment'); else fail('Prebuilt production deployment');
if (workflow.includes('npm run verify:production')) pass('Post-deployment verification'); else fail('Post-deployment verification');
const deployJob = workflow.slice(workflow.indexOf('  deploy-vercel:'));
if (deployJob.includes('Install repository dependencies') && deployJob.includes('run: npm ci')) pass('Deployment verification job installs repository dependencies'); else fail('Deployment verification job dependency installation');
if (deployJob.includes("grep -Eo 'https://[^[:space:]]+'")) pass('Deployment URL extraction requires an HTTPS URL'); else fail('Deployment URL extraction');
if (/\.auction-wow-gallery-shade\{[^}]*background:linear-gradient\([^;]+\)\}/.test(css)) pass('Auction WOW gallery shade CSS syntax'); else fail('Auction WOW gallery shade CSS syntax');

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log('Vercel CI contract validation: PASS');
