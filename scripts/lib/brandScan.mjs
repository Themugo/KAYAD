// Customer-facing brand scan. The brand is "KAYARD KE" (short form "KAYARD"); "KAYAD" is incorrect in anything a customer can read.
// Deliberately NOT a blind search: technical identifiers (CSS classes kayad-*, storage keys, DB names, env vars, API paths, persisted
// reference-code prefixes such as KAYAD-IR-) are legacy compatibility and are allowed. Comments are not customer-facing.
import fs from 'node:fs';
import path from 'node:path';

const WORD = /(?<![A-Za-z0-9_\-./#@])(KAYAD|Kayad)(?![A-Za-z0-9_])/g;
const SCAN_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.html', '.webmanifest', '.txt', '.xml', '.svg']);
const SKIP_DIR = new Set(['node_modules', 'dist', '.git', '__tests__', 'tests', 'test', 'coverage', 'out', 'evidence']);

/** Allowed, with the reason each is kept. A hit is allowed when the line matches `test`. */
export const ALLOWED = [
  { why: 'Persisted reference/code prefix (KAYAD-XXX-…): stored in unique, length-limited columns; renaming risks overflow and mixed history', test: (line, m) => /^-(?:[A-Za-z$]|KE)/.test(line.slice(m.index + m[0].length)) },
  { why: 'Legacy-value detector for admin branding migration (must keep matching the OLD stored value)', test: (line) => /=== 'KAYAD'\)|includes\('KAYAD Motors Kenya Ltd\.'\)|title !== "KAYAD \| Kenya's/.test(line) },
  { why: 'M-Pesa AccountReference and inspection booking-reference prefix: appear on customer statements/records and are reconciled; owner decision required', test: (line) => /AccountReference|const prefix = 'KAYAD/.test(line) },
];

const isComment = (line) => /^\s*(\/\/|\*|\/\*|#|<!--)/.test(line);

export function scanBrand(root, { dirs = ['src', 'backend', 'public'], files = ['index.html'] } = {}) {
  const hits = [];
  const visit = (file) => {
    if (!SCAN_EXT.has(path.extname(file))) return;
    const rel = path.relative(root, file);
    if (/\.test\.|\.spec\.|package(-lock)?\.json$/.test(rel)) return;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (isComment(line)) return;
      for (const m of line.matchAll(WORD)) {
        if (ALLOWED.some((a) => a.test(line, m))) continue;
        hits.push({ file: rel, line: i + 1, text: line.trim().slice(0, 160) });
      }
    });
  };
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) { if (!SKIP_DIR.has(entry.name)) walk(path.join(dir, entry.name)); } else visit(path.join(dir, entry.name));
    }
  };
  dirs.forEach((d) => walk(path.join(root, d)));
  files.forEach((f) => fs.existsSync(path.join(root, f)) && visit(path.join(root, f)));
  return hits;
}
