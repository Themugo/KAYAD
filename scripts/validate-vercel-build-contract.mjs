import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const failures = [];
const pass = (name) => console.log(`PASS ${name}`);
const fail = (name) => failures.push(name);
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const pkg = JSON.parse(read('package.json'));
const vercel = JSON.parse(read('vercel.json'));

if (pkg.engines?.node === '>=22.22.2') pass('Node release contract');
else fail('Node release contract must remain >=22.22.2');

if (vercel.$schema === 'https://openapi.vercel.sh/vercel.json') pass('Vercel configuration schema');
else fail('Vercel configuration schema');
if (vercel.framework === 'vite' && vercel.installCommand === 'npm ci' && vercel.buildCommand === 'npm run build' && vercel.outputDirectory === 'dist') pass('Vercel build contract');
else fail('Vercel build contract');

const rewrites = vercel.rewrites || [];
const api = rewrites.findIndex((r) => r.source === '/api/:path*' && r.destination === 'https://api.kayad.space/api/:path*');
const spa = rewrites.findIndex((r) => r.destination === '/index.html');
if (api >= 0 && spa > api) pass('API rewrite precedes SPA fallback');
else fail('API rewrite precedes SPA fallback');

const sourceFiles = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(name)) walk(full);
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(name)) sourceFiles.push(full);
  }
}
walk(path.join(root, 'src'));

let syntaxErrors = 0;
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  // Declaration files are valid TypeScript but cannot be emitted by transpileModule.
  // Parse them directly; transpile executable source files.
  const diagnostics = file.endsWith('.d.ts')
    ? ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS).parseDiagnostics
    : ts.transpileModule(text, {
        fileName: file,
        reportDiagnostics: true,
        compilerOptions: {
          allowJs: true,
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      }).diagnostics || [];
  for (const diagnostic of diagnostics) {
    if (diagnostic.category !== ts.DiagnosticCategory.Error) continue;
    syntaxErrors += 1;
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
    fail(`Frontend syntax: ${path.relative(root, file)} — ${message}`);
  }
}
if (syntaxErrors === 0) pass(`Frontend transpile syntax (${sourceFiles.length} files)`);

// Resolve every relative import in the frontend so missing files fail before Vercel.
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const unresolved = [];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const re = /(?:from\s+|import\s*\(\s*|require\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
  for (const match of text.matchAll(re)) {
    const spec = match[1];
    const base = path.normalize(path.join(path.dirname(file), spec));
    const candidates = [base, ...extensions.map((ext) => `${base}${ext}`), ...extensions.map((ext) => path.join(base, `index${ext}`))];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) unresolved.push(`${path.relative(root, file)} -> ${spec}`);
  }
}
if (unresolved.length === 0) pass('Frontend relative-import resolution');
else unresolved.slice(0, 20).forEach((item) => fail(`Unresolved frontend import: ${item}`));

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log('Vercel build contract validation: PASS');
