#!/usr/bin/env node

import fs from 'fs';

const appPath = 'src/App.tsx';
const source = fs.readFileSync(appPath, 'utf8');
const jsxSource = source.replace(/\b[A-Za-z_$][\w$]*<[^>\n]+>/g, '');

const declared = new Set(['Fragment']);

function addImportNames(importClause) {
  const clause = importClause.trim();

  if (!clause || clause.startsWith('type ')) return;

  const defaultMatch = clause.match(/^([A-Za-z_$][\w$]*)/);
  if (defaultMatch) declared.add(defaultMatch[1]);

  const namedMatch = clause.match(/\{([\s\S]*?)\}/);
  if (namedMatch) {
    namedMatch[1]
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        if (part.startsWith('type ')) return;
        const alias = part.match(/\bas\s+([A-Za-z_$][\w$]*)$/);
        declared.add(alias ? alias[1] : part.replace(/^type\s+/, '').split(/\s+/)[0]);
      });
  }
}

for (const match of source.matchAll(/^import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"];?/gm)) {
  addImportNames(match[1]);
}

for (const match of source.matchAll(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) {
  declared.add(match[1]);
}

const jsxTags = [...jsxSource.matchAll(/<\s*([A-Z][A-Za-z0-9_$]*)\b/g)].map((match) => match[1]);
const missing = [...new Set(jsxTags.filter((name) => !declared.has(name)))];

const routePaths = [...source.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]);
const duplicateRoutes = [...new Set(routePaths.filter((path, index) => routePaths.indexOf(path) !== index))];

let failed = false;

if (missing.length > 0) {
  failed = true;
  console.error(`Missing JSX imports/declarations in ${appPath}:`);
  missing.forEach((name) => console.error(`  - ${name}`));
}

if (duplicateRoutes.length > 0) {
  failed = true;
  console.error(`Duplicate route paths in ${appPath}:`);
  duplicateRoutes.forEach((path) => console.error(`  - ${path}`));
}

if (failed) {
  process.exit(1);
}

console.log(`Route sanity check passed: ${routePaths.length} routes, ${new Set(jsxTags).size} JSX component symbols.`);