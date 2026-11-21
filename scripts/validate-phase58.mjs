import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

check('repository package exists', fs.existsSync(path.join(root, 'package.json')));
check('backend package exists', fs.existsSync(path.join(root, 'backend', 'package.json')));
check('frontend build script exists', Boolean(readJson('package.json').scripts?.build));
check('frontend lint script exists', Boolean(readJson('package.json').scripts?.lint));
check('backend start script exists', Boolean(readJson('backend/package.json').scripts?.start));
check('Node engine is 22+', /(?:>=|\^|~)?22/.test(readJson('package.json').engines?.node ?? '') && /22/.test(readJson('backend/package.json').engines?.node ?? ''));
check('backend Dockerfile exists', fs.existsSync(path.join(root, 'backend', 'Dockerfile')));
check('frontend Dockerfile exists', fs.existsSync(path.join(root, 'Dockerfile.frontend')));
check('Vercel config is valid JSON', (() => { try { readJson('vercel.json'); return true; } catch { return false; } })());
check('Render config exists', fs.existsSync(path.join(root, 'render.yaml')));
check('pre-deploy uses configured lint command', fs.readFileSync(path.join(root, 'scripts', 'pre-deploy-check.js'), 'utf8').includes("execSync('npm run lint'"));
check('deployment health supports HTTP and HTTPS', (() => { const s = fs.readFileSync(path.join(root, 'scripts', 'deployment-validation.js'), 'utf8'); return s.includes("parsedUrl.protocol === 'http:'") && s.includes("parsedUrl.protocol === 'https:'"); })());
check('no fake production deployment URLs in config', (() => { const files = ['vercel.json','render.yaml']; return files.every(f => !fs.readFileSync(path.join(root,f),'utf8').includes('example.com')); })());

console.log(`\nPhase 58 validation: ${passed}/${passed + failed} checks passed.`);
if (failed) process.exit(1);
