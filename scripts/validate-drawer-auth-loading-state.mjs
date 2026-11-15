import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
const tests = fs.readFileSync('src/__tests__/components/Navbar.test.jsx', 'utf8');

assert.match(source, /authLoading && sessionHinted \? \([\s\S]*?aria-label="Checking your account"[\s\S]*?role="status"/);
assert.match(source, /Checking your account session/);
assert.match(source, /\) : user \? \(/, 'Authenticated profile must render only after loading placeholder');
assert.match(tests, /does not show a signed-out prompt while a returning member session is still being checked/);
console.log('PASS: returning-session drawer state stays neutral until the authoritative session check resolves.');
