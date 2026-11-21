import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'src');
const extensions = new Set(['.css', '.scss', '.ts', '.tsx', '.js', '.jsx', '.html']);
const forbidden = [
  ['legacy warm utility', /\b(?:bg|text|border|border-l|from|via|to|ring|fill|stroke|shadow|decoration|outline|placeholder|divide|accent)-(?:amber|yellow|gold|orange)-\d{2,3}(?:\/\d+)?\b/i],
  ['legacy warm hex', /#(?:fbbf24|f59e0b|d97706|eab308|ca8a04|b45309|92400e|d4c4a8|ff9f43|e6c288|f97316|fb923c|f0a500|d96b43|c77b58|d4af37|f5e6b3|c8962a|e8b84b|d4a843|ffd700|e67e22|f39c12|f6f1e8|f5f0e8|c4a484|e2ddd5|17244b|1e3a5f)\b/i],
  ['unified-accent regression', /#(?:3b82f6|2563eb|60a5fa|0f6ed8|159bc7|00b0b5|06b6d4|8b5cf6|ec4899|f472b6|dbeafe|eef4fa|eaf5f7|f8fbff|f2f8fb)\b/i],
  ['true-black visual utility', /\b(?:bg|from|via|to|text|border|ring|fill|stroke)-(?:black)(?:\/\d+)?\b/i],
  ['true-black visual token', /(?:background(?:-color)?|color|border-color|outline-color|fill|stroke)\s*:\s*#(?:000|000000|0a0a0a|111|111111|1a1a1a|0c0c0c|080808|050505)\b/i],
  ['black-based overlay/shadow', /(?:rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,|rgb\(\s*0\s+0\s+0\s*\/|box-shadow\s*:[^;]*black)/i],
  ['legacy dark surface utility', /\b(?:bg|from|via|to)-(?:slate|gray|zinc|neutral|stone|charcoal)-(?:800|900|950)(?:\/\d+)?\b/i],
  ['unmigrated gold CSS variable consumer', /var\(\s*--gold(?:-[a-z0-9-]+)?\s*\)/i],
  ['unescaped arbitrary class selector', /\.(?:bg|text|border|from|via|to|ring|fill|stroke)-\[#/i],
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['__tests__', 'tests', 'test', 'fixtures', '__snapshots__', 'node_modules'].includes(entry.name)) continue;
      result.push(...walk(full));
    } else if (extensions.has(path.extname(entry.name).toLowerCase()) && !/\.(?:test|spec)\.[^.]+$/i.test(entry.name)) {
      result.push(full);
    }
  }
  return result;
}

const violations = [];
const sourceFiles = walk(sourceRoot);
const explicitSurfaceFiles = [
  'index.html',
  'tailwind.config.js',
  'backend/db/cms.schema.sql',
  'backend/services/advertising.service.js',
  'backend/services/email.service.js',
  'backend/services/pdfService.js',
  'backend/services/reminderAutomationService.js',
  'backend/controllers/contactController.js',
  'backend/controllers/lowCodeController.js',
  'backend/controllers/platformFactoryController.js',
  'backend/controllers/vxpController.js',
  'backend/controllers/xosController.js',
  'backend/mediaEventEngine/monitoring/dashboard.js',
];
const assetFiles = walk(path.join(root, 'public')).filter((file) => ['.svg', '.css', '.html'].includes(path.extname(file).toLowerCase()));
const surfaceFiles = [...new Set([...sourceFiles, ...assetFiles, ...explicitSurfaceFiles.map((file) => path.join(root, file)).filter(fs.existsSync)])];

for (const file of surfaceFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const relative = path.relative(root, file).split(path.sep).join('/');

  // These two files deliberately contain literal colors as data, not rendered theme:
  // BrandingContext migrates old saved settings; SearchSidebar lists vehicle paint colors.
  if (relative === 'src/context/BrandingContext.tsx') {
    content = content.replace(/const LEGACY_BRAND_COLOR_MAP: Record<string, string> = \{[\s\S]*?\n\};/, '/* legacy map omitted from rendered-palette validation */');
  }
  if (relative === 'src/components/SearchSidebar.tsx') {
    content = content.replace(/const\s+COLOR_MAP\s*=\s*\{[\s\S]*?\n\};/, '/* vehicle paint swatches are product data, not UI theme */');
  }

  for (const [label, pattern] of forbidden) {
    const match = pattern.exec(content);
    if (match) violations.push(`${relative}: ${label} (${match[0]})`);
  }
}

const indexCss = fs.readFileSync(path.join(sourceRoot, 'index.css'), 'utf8');
for (const token of [
  '--brand: #176B87', '--brand-light: #13B8A6', '--brand-dark: #0A3340',
  '--brand-100: #DDF4F0', '--kayad-overlay: rgba(10, 51, 64, 0.72)',
  '--blue: var(--brand)', '--orange: var(--brand)', '--gold: var(--brand)',
]) {
  if (!indexCss.includes(token)) violations.push(`src/index.css: missing canonical token ${token}`);
}
const branding = fs.readFileSync(path.join(sourceRoot, 'context', 'BrandingContext.tsx'), 'utf8');
for (const token of ['normalizeBrandingConfig(configBranding)', "'--brand-glow-strong'", "'--brand-900'"]) {
  if (!branding.includes(token)) violations.push(`src/context/BrandingContext.tsx: missing migration/runtime token ${token}`);
}
const migrationPath = path.join(root, 'supabase/migrations/20261010130000_kayad_slate_teal_theme_convergence.sql');
if (!fs.existsSync(migrationPath)) {
  violations.push('missing additive site-theme convergence migration');
} else {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  for (const token of ["'#176B87'", "'#13B8A6'", "'#F6FAF9'", "to_regclass('public.cms_theme_configs')", "to_regclass('public.website_settings')"]) {
    if (!migration.includes(token)) violations.push(`theme migration: missing ${token}`);
  }
}
const favicon = fs.readFileSync(path.join(root, 'public/favicon.svg'), 'utf8');
for (const token of ['#0A3340', '#176B87', '#13B8A6']) {
  if (!favicon.includes(token)) violations.push(`public/favicon.svg: missing canonical token ${token}`);
}

if (violations.length) {
  console.error(`Brand palette convergence: FAIL (${violations.length} issue(s))`);
  for (const issue of violations) console.error(` - ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Brand palette convergence: PASS (${sourceFiles.length} frontend source files + ${surfaceFiles.length - sourceFiles.length} shared assets/service surfaces scanned)`);
  console.log('Canonical palette: deep teal #0A3340 · slate teal #176B87 · accent #13B8A6 · mint surfaces #F6FAF9 / #DDF4F0');
  console.log('Legacy warm/dark visual palettes and unrelated blue/purple/pink accents are converged; legacy branding data and vehicle paint swatches are preserved as data.');
}
