import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const view = fs.readFileSync('src/features/DealersView/components/DealersView.tsx', 'utf8');
const route = fs.readFileSync('backend/routes/userRoutes.js', 'utf8');

assert.match(app, /<DealersView\s+onSelectDealerVehicles=\{handleSelectDealerVehicles\}\s*\/>/);
assert.match(app, /if \(dealerId\) setDealerScope\(\{ id: dealerId, name: dealerName \}\)/);
assert.match(view, /api\.get\('\/users\/dealers'\)/);
assert.doesNotMatch(view, /DealerBusinessView|MANAGEMENT CONSOLE/, 'public directory must not expose the dealer management console');
assert.match(view, /KAYAD approved dealer/);
assert.doesNotMatch(view, /100% Audited Sellers|Every enterprise dealership.*verified/i);
assert.match(view, /onSelectDealerVehicles\(dealer\.name, dealer\.id\)/);
assert.match(route, /router\.get\(\s*"\/dealers"/);
assert.match(route, /role: "dealer"/);
assert.match(route, /status: "approved"/);
assert.match(route, /dealerApprovedAt: \{ \$ne: null \}/);
assert.match(route, /isBanned: \{ \$ne: true \}/);
assert.match(route, /\.select\("_id name businessName avatar location bio dealerApprovedAt"\)/);
const publicDealerRoute = route.slice(route.indexOf('router.get(\n  "/dealers"'), route.indexOf('router.get(\n  "/search"'));
assert.doesNotMatch(publicDealerRoute, /\.select\([^\n]*(email|phone|password|documents)/i);

console.log('Public dealer directory validation passed (15 assertions).');
