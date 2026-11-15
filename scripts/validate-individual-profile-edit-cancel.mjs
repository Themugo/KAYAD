import fs from 'node:fs';
import assert from 'node:assert/strict';

const profile = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
const tests = fs.readFileSync('src/__tests__/pages/ProfileAccountSettings.test.tsx', 'utf8');

assert.match(profile, /const handleCancelEdit = \(\) => \{[\s\S]*?setEditingField\(null\);[\s\S]*?setEditValue\(''\);[\s\S]*?setStepUpPassword\(''\);[\s\S]*?\};/);
assert.equal((profile.match(/onClick=\{handleCancelEdit\}/g) || []).length, 3, 'Name, phone and location editors must expose Cancel');
assert.match(profile, /const handleEdit = \(field: string, currentValue: string\) => \{[\s\S]*?setStepUpPassword\(''\);/);
assert.match(tests, /cancels an in-progress phone edit and clears temporary step-up credentials/);
console.log('PASS: individual profile edit cancellation and temporary credential cleanup');
