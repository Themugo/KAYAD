import fs from 'node:fs';
import assert from 'node:assert/strict';

const profile = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
const tests = fs.readFileSync('src/__tests__/pages/ProfileAccountSettings.test.tsx', 'utf8');

assert.match(profile, /const handleCancelEdit = \(\) => \{[\s\S]*?setEditingField\(null\);[\s\S]*?setEditValue\(''\);[\s\S]*?setStepUpPassword\(''\);[\s\S]*?\};/);
assert.equal((profile.match(/onClick=\{handleCancelEdit\}/g) || []).length, 1, 'The shared editable row must expose exactly one Cancel control');
for (const field of ['name', 'phone', 'location']) assert.match(profile, new RegExp(`renderEditableRow\\('${field}'`), `The ${field} editor must use the shared editable row (and therefore expose Cancel)`);
assert.match(profile, /const handleEdit = \(field: (?:string|EditableField), currentValue: string\) => \{[\s\S]*?setStepUpPassword\(''\);/);
assert.match(tests, /cancels an in-progress phone edit and clears temporary step-up credentials/);
console.log('PASS: individual profile edit cancellation and temporary credential cleanup');
