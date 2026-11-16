import fs from 'node:fs';
import assert from 'node:assert/strict';

const profile = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
const phoneVerification = fs.readFileSync('src/components/PhoneVerification.tsx', 'utf8');
const api = fs.readFileSync('src/services/phoneVerificationApi.ts', 'utf8');

assert.match(profile, /<PhoneVerification\s+key=\{user\.phone\s*\|\|\s*'no-phone'\}\s*\/>/, 'Phone verification must remount when the saved account phone changes');
assert.match(phoneVerification, /getPhoneVerificationStatus\(\)/, 'Verification UI must read status from the server');
assert.match(phoneVerification, /useEffect\(\(\)\s*=>\s*\{\s*loadStatus\(\);\s*\},\s*\[\]\)/, 'A newly mounted verification UI must reload server status');
assert.match(api, /GET \/api\/v1\/auth\/phone-status/, 'Phone status must use the canonical authenticated API');
console.log('PASS: individual profile refreshes phone verification after phone changes');
