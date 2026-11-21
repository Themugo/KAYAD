import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const files = [
  'public/security.txt',
  'public/.well-known/security.txt',
].map((file) => path.join(root, file));
const contents = files.map((file) => fs.readFileSync(file, 'utf8'));
assert.equal(contents[0], contents[1], 'Both security.txt files must be identical');
const value = contents[0];
assert.match(value, /^Contact: mailto:security@kayad\.space$/m);
assert.match(value, /^Canonical: https:\/\/www\.kayad\.space\/.well-known\/security\.txt$/m);
assert.match(value, /^Expires: 2027-09-12T00:00:00Z$/m);
assert.doesNotMatch(value, /topline/i, 'No Topline contact or domain may remain');
console.log('security.txt validation passed: 2 files identical; KAYAD contact, canonical URL and expiry verified.');
