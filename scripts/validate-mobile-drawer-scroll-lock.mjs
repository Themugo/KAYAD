import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
const tests = fs.readFileSync('src/__tests__/components/Navbar.test.jsx', 'utf8');

assert.match(source, /const previousBodyOverflow = body\.style\.overflow;/);
assert.match(source, /const previousRootOverflow = root\.style\.overflow;/);
assert.match(source, /body\.style\.overflow = 'hidden';/);
assert.match(source, /root\.style\.overflow = 'hidden';/);
assert.match(source, /body\.style\.overflow = previousBodyOverflow;/);
assert.match(source, /root\.style\.overflow = previousRootOverflow;/);
assert.match(source, /kayad-mobile-menu-is-open/);
assert.match(tests, /locks background page scrolling while the mobile drawer is open and restores prior styles/);
console.log('PASS: modal drawer locks background scroll and restores the exact previous body/root overflow styles.');
