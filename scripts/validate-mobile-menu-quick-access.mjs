import fs from 'node:fs';
import assert from 'node:assert/strict';

const navbar = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
const tests = fs.readFileSync('src/__tests__/components/Navbar.test.jsx', 'utf8');

const count = (source, pattern) => (source.match(pattern) || []).length;
assert.equal(count(navbar, /Price Alerts/g), 1, 'Price Alerts must have one canonical menu entry');
assert.equal(count(navbar, /Compare Vehicles/g), 1, 'Compare Vehicles must have one canonical menu entry');
assert.match(navbar, /aria-labelledby="kayad-drawer-quick-access"/, 'Quick Access section must remain labelled');
assert.match(navbar, /onOpenAlerts\(\); setMobileMenuOpen\(false\)/, 'Price Alerts must preserve its existing action and close the drawer');
assert.match(navbar, /onOpenCompare\(\); setMobileMenuOpen\(false\)/, 'Compare must preserve its existing action and close the drawer');
assert.match(navbar, /kayad-drawer-quick-access[\s\S]*?Price Alerts[\s\S]*?Compare Vehicles/, 'Quick Access must contain both shortcuts in stable order');
assert.doesNotMatch(navbar, /Dealer workspace[\s\S]{0,1800}Compare Vehicles/, 'Compare must not be duplicated in role workspace');
assert.match(tests, /keeps Price Alerts and Compare Vehicles together in Quick Access without role-specific duplicates/, 'Regression test must cover Quick Access grouping');
console.log('PASS: one Price Alerts action, one Compare Vehicles action, shared Quick Access grouping, preserved callbacks and regression coverage.');
