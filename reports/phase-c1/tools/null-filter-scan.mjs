// Phase C.1 audit tool (not shipped as a validator): find query-filter values that can be `null` at runtime.
// Phase C changed both query layers so a null filter value compiles to `IS NULL` instead of being dropped.
// Callers that used `x || null` / `x ?? null` / `c ? v : null` to mean "no filter" would silently change behaviour.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = process.argv[2];
const require = createRequire(path.join(root, 'package.json'));
const { parse } = require('@babel/parser');

const DB_FILTER_ARG = { findAll: 'options', findOne: 1, count: 1, updateMany: 1, distinct: 2 };
const MODEL_FILTER_ARG = { find: 0, findOne: 0, countDocuments: 0, count: 0, exists: 0, deleteMany: 0, deleteOne: 0, updateMany: 0, updateOne: 0, findOneAndUpdate: 0, findOneAndDelete: 0, findOneAndRemove: 0, estimatedDocumentCount: -1 };

const rows = [];
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!['node_modules', 'tests', 'testing', '__tests__', 'coverage'].includes(e.name)) walk(p); } else if (/\.(m?js)$/.test(e.name) && !/\.test\.|\.spec\./.test(e.name)) files.push(p); } })(path.join(root, 'backend'));

const src = (s, n) => s.slice(n.start, n.end).replace(/\s+/g, ' ');
function nullability(n) {
  if (!n) return null;
  if (n.type === 'NullLiteral') return 'LITERAL_NULL';
  if (n.type === 'LogicalExpression' && (n.operator === '||' || n.operator === '??') && n.right.type === 'NullLiteral') return 'FALLBACK_NULL';
  if (n.type === 'ConditionalExpression' && (n.consequent.type === 'NullLiteral' || n.alternate.type === 'NullLiteral')) return 'TERNARY_NULL';
  return null;
}
function visit(node, fn, parent) { if (!node || typeof node.type !== 'string') return; fn(node, parent); for (const k of Object.keys(node)) { if (k === 'loc' || k === 'start' || k === 'end') continue; const v = node[k]; if (Array.isArray(v)) v.forEach((c) => visit(c, fn, node)); else if (v && typeof v.type === 'string') visit(v, fn, node); } }

for (const file of files) {
  const s = fs.readFileSync(file, 'utf8');
  let ast; try { ast = parse(s, { sourceType: 'module', plugins: ['jsx', 'topLevelAwait', 'importAttributes'], errorRecovery: true }); } catch { continue; }
  const importsDb = /from\s*["'][./]*db\/index\.js["']/.test(s);
  // variable -> object literal, and later member assignments X.prop = expr
  const objVars = new Map(); const memberAssign = [];
  visit(ast, (n) => {
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init && n.init.type === 'ObjectExpression') objVars.set(n.id.name, n.init);
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && n.left.object.type === 'Identifier' && !n.left.computed && n.left.property.type === 'Identifier') memberAssign.push(n);
  });
  const report = (call, objNode, how) => {
    const props = [];
    if (objNode?.type === 'ObjectExpression') objNode.properties.forEach((p) => { if (p.type === 'ObjectProperty') props.push({ key: p.key.name || p.key.value, value: p.value, at: p }); });
    if (objNode?.type === 'Identifier') {
      const lit = objVars.get(objNode.name);
      if (lit) lit.properties.forEach((p) => { if (p.type === 'ObjectProperty') props.push({ key: p.key.name || p.key.value, value: p.value, at: p }); });
      memberAssign.filter((a) => a.left.object.name === objNode.name).forEach((a) => props.push({ key: a.left.property.name, value: a.right, at: a }));
    }
    for (const p of props) {
      const kind = nullability(p.value);
      if (!kind) continue;
      const line = s.slice(0, p.at.start).split('\n').length;
      rows.push({ file: path.relative(root, file), line, call: how, key: p.key, kind, expr: src(s, p.value).slice(0, 120) });
    }
  };
  // Broad pass: any object-literal argument (or its `filters`/`where` member) of a query-like call, incl. wrappers.
  visit(ast, (n) => {
    if (n.type !== 'CallExpression') return;
    const c = n.callee; const name = c.type === 'Identifier' ? c.name : (c.type === 'MemberExpression' && !c.computed && c.property.type === 'Identifier' ? c.property.name : '');
    if (!/^(count|counts|find|findAll|findOne|list|query|where|filter|search|exists|countDocuments|safeCount|countRows|fetch|select|get)[A-Za-z]*$/.test(name)) return;
    if (importsDb && name in DB_FILTER_ARG) return; // covered precisely below
    if (c.type === 'MemberExpression' && name in MODEL_FILTER_ARG) return;
    n.arguments.forEach((a) => { if (a.type === 'ObjectExpression') { const f = a.properties.find((p) => p.key && ['filters','where','filter'].includes(p.key.name)); report(n, f ? f.value : a, `wrapper:${name}`); } });
  });
  visit(ast, (n) => {
    if (n.type !== 'CallExpression') return;
    const c = n.callee;
    if (c.type === 'Identifier' && importsDb && c.name in DB_FILTER_ARG) {
      const pos = DB_FILTER_ARG[c.name];
      if (pos === 'options') { const o = n.arguments[1]; if (o?.type === 'ObjectExpression') { const f = o.properties.find((p) => p.key && (p.key.name === 'filters')); if (f) report(n, f.value, `db.${c.name}`); } }
      else report(n, n.arguments[pos], `db.${c.name}`);
    }
    if (c.type === 'MemberExpression' && !c.computed && c.property.type === 'Identifier' && c.property.name in MODEL_FILTER_ARG && MODEL_FILTER_ARG[c.property.name] >= 0) {
      const objName = c.object.type === 'Identifier' ? c.object.name : '';
      if (/^[A-Z]/.test(objName) || c.object.type === 'CallExpression') report(n, n.arguments[MODEL_FILTER_ARG[c.property.name]], `${objName || 'model'}.${c.property.name}`);
    }
  });
}
const out = process.argv[3];
fs.writeFileSync(out, ['file,line,call,filter_key,kind,expression', ...rows.map((r) => [r.file, r.line, r.call, r.key, r.kind, JSON.stringify(r.expr)].join(','))].join('\n') + '\n');
const by = rows.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + 1), a), {});
console.log(`scanned ${files.length} backend source files; nullable filter values: ${rows.length}`, by);
