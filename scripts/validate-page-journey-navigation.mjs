import fs from 'node:fs';
import assert from 'node:assert/strict';
const component = fs.readFileSync('src/components/navigation/PageJourneyNavigation.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const checks = [
  ['shared navigation component is mounted in the primary application shell', app.includes("import PageJourneyNavigation from './components/navigation/PageJourneyNavigation'") && app.includes('<PageJourneyNavigation />')],
  ['previous control uses router history back', /onClick=\{\(\) => canGoBack \? navigate\(-1\)/.test(component)],
  ['forward control uses router history forward', /onClick=\{\(\) => navigate\(1\)\}/.test(component)],
  ['home fallback is available', /navigate\('\/'\)/.test(component)],
  ['recent destinations render as accessible tabs', component.includes('role="tablist"') && component.includes('role="tab"') && component.includes('aria-selected={active}')],
  ['recent tabs preserve route query and hash', component.includes('location.search') && component.includes('location.hash')],
  ['tab history is bounded to six entries', component.includes('.slice(-6)')],
  ['navigation controls have accessible labels', component.includes('aria-label="Go to previous page"') && component.includes('aria-label="Go forward to next page"')],
];
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log(`\n${checks.length}/${checks.length} page journey navigation checks passed.`);
