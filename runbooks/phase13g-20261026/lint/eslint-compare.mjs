/* eslint-disable no-undef -- Node-run analysis script; not part of the shipped application bundle */
// PHASE 13G — reproducible ESLint baseline comparison. Usage: node eslint-compare.mjs <baseline.json> <final.json> <baselineRoot> <finalRoot>
// Output: totals, counts by severity and by rule, per-file deltas, and NEW violations (file+rule+message not present in the baseline).
import fs from "node:fs";
const [bf, ff, br, fr] = process.argv.slice(2); const load = (f, root) => JSON.parse(fs.readFileSync(f, "utf8")).map((r) => ({ ...r, rel: r.filePath.replace(root + "/", "") }));
const B = load(bf, br), F = load(ff, fr);
const tally = (R) => { const t = { errors: 0, warnings: 0, files: R.length, filesWithProblems: 0, byRule: {} }; for (const r of R) { t.errors += r.errorCount; t.warnings += r.warningCount; if (r.errorCount + r.warningCount) t.filesWithProblems++; for (const m of r.messages) { const k = (m.ruleId || "(parse/other)") + (m.severity === 2 ? " [error]" : " [warn]"); t.byRule[k] = (t.byRule[k] || 0) + 1; } } return t; };
const tb = tally(B), tf = tally(F); console.log(`BASELINE errors=${tb.errors} warnings=${tb.warnings} files=${tb.files} filesWithProblems=${tb.filesWithProblems}`); console.log(`FINAL    errors=${tf.errors} warnings=${tf.warnings} files=${tf.files} filesWithProblems=${tf.filesWithProblems}`);
// first line of the message only: multi-line React-compiler messages embed source excerpts that shift with unrelated edits
const sig = (r, m) => `${r.rel}|${m.ruleId}|${String(m.message).split("\n")[0]}`;  const bset = new Map(); for (const r of B) for (const m of r.messages) bset.set(sig(r, m), (bset.get(sig(r, m)) || 0) + 1);
const fresh = []; const fcount = new Map(); for (const r of F) for (const m of r.messages) { const s = sig(r, m); fcount.set(s, (fcount.get(s) || 0) + 1); if ((fcount.get(s)) > (bset.get(s) || 0)) fresh.push({ file: r.rel, line: m.line, rule: m.ruleId, severity: m.severity === 2 ? "error" : "warn", message: m.message.slice(0, 140) }); }
console.log(`NEW violations (not in baseline by file+rule+message): ${fresh.length}`); for (const n of fresh.slice(0, 60)) console.log(`  ${n.severity} ${n.file}:${n.line} ${n.rule} ${n.message}`);
const gone = []; const fset = new Map(); for (const r of F) for (const m of r.messages) fset.set(sig(r, m), (fset.get(sig(r, m)) || 0) + 1); for (const [s, c] of bset) if ((fset.get(s) || 0) < c) gone.push(s); console.log(`RESOLVED violations: ${gone.length}`);
console.log("TOP RULES (final):"); for (const [k, v] of Object.entries(tf.byRule).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(v).padStart(6)} ${k} (baseline ${tb.byRule[k] || 0})`);
fs.writeFileSync(ff.replace(/\.json$/, ".summary.json"), JSON.stringify({ baseline: { errors: tb.errors, warnings: tb.warnings }, final: { errors: tf.errors, warnings: tf.warnings }, newViolations: fresh, resolved: gone.length, byRuleFinal: tf.byRule, byRuleBaseline: tb.byRule }, null, 1));
