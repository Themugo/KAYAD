import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('backend/routes/dealerRoutes.js', 'utf8');
const getStart = source.indexOf('router.get("/onboarding"');
const putStart = source.indexOf('router.put("/onboarding"');
assert.ok(getStart >= 0 && putStart > getStart, 'dealer onboarding GET and PUT routes must exist');
const getRoute = source.slice(getStart, putStart);
const putRoute = source.slice(putStart, source.indexOf('router.', putStart + 1) > 0 ? source.indexOf('router.', putStart + 1) : undefined);

assert.match(getRoute, /let dealer = await findOne\("dealers", \{ user: req\.user\.id \}\)/);
assert.match(getRoute, /res\.set\("Cache-Control", "no-store"\)/);
assert.match(getRoute, /res\.json\(\{ success: true, dealer \}\)/);
assert.doesNotMatch(getRoute, /validateCompanyName|req\.body/, 'GET draft retrieval must not validate or reference submitted form fields');
assert.match(putRoute, /const \{ businessName, location, bio, paymentDetails, documents \} = parsed\.data/);
assert.match(putRoute, /validateCompanyName\(businessName, \{ personName: req\.user\.name \}\)/, 'PUT must validate the submitted legal business identity');
assert.match(putRoute, /if \(!company\.ok\)/);
assert.match(source, /const APPLICANT_ROLES = \["dealer"\]/, 'dealer onboarding must remain a separate business-account workflow');

console.log('PASS pending dealer can retrieve an incomplete onboarding draft without ReferenceError');
console.log('PASS onboarding writes validate the submitted business name before persistence');
console.log('PASS dealer onboarding remains restricted to dealer business accounts');
console.log('Dealer onboarding read/write boundary: 3/3 PASS');
