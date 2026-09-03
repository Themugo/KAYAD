import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const browse = read('src/pages/BrowsePage.jsx');
const buyer = read('src/pages/BuyerDashboard.jsx');
const dashboard = read('src/features/DashboardView/components/DashboardView.tsx');
const api = read('src/api/api.exports.ts');
const routes = read('backend/routes/savedSearchRoutes.js');

const checks = [
  ['Browse imports savedSearchAPI', browse.includes("import { carsAPI, BRANDS, savedSearchAPI } from '../api/api';")],
  ['Browse creates saved searches through API', browse.includes('savedSearchAPI.create({ name, filters: savedFilters, notifyOnNewMatch: true })')],
  ['Browse no longer writes saved searches to localStorage', !browse.includes('kayad_saved_searches')],
  ['Buyer dashboard imports savedSearchAPI', buyer.includes('savedSearchAPI')],
  ['Buyer dashboard loads server saved searches', buyer.includes('savedSearchAPI.list()')],
  ['Buyer dashboard deletes by server ID', buyer.includes('savedSearchAPI.remove(id)')],
  ['Buyer dashboard no longer writes saved searches to localStorage', !buyer.includes('kayad_saved_searches')],
  ['Primary dashboard loads server saved searches', dashboard.includes('savedSearchAPI.list()')],
  ['Primary dashboard maps backend saved-search records', dashboard.includes('item._id || item.id') && dashboard.includes('item.notify !== false')],
  ['Primary dashboard updates new-listing alert through API', dashboard.includes('savedSearchAPI.toggleAlerts(item.id, next)')],
  ['Primary dashboard does not claim price-drop alert support', !dashboard.includes('Price Drop Alerts') && !dashboard.includes('notifyOnPriceDrop')],
  ['Saved-search API exposes list/create/update/delete', api.includes("list:   ()") && api.includes("create: (body: any)") && api.includes("update: (id: string") && api.includes("remove: (id: string)" )],
  ['Saved-search backend is authenticated', routes.includes('router.use(protect);')],
  ['Saved-search backend scopes records to current user', routes.includes('{ user: req.user.id }')],
  ['Phase 47 App ref regression remains absent', read('src/App.tsx').includes('React.useRef(new Set<string>())') && !read('src/App.tsx').includes('React.useRef<Set<string>>')],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (ok) passed++;
}
console.log(`\nPhase 48 validation: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
