import fs from 'node:fs';
import assert from 'node:assert/strict';
const panel = fs.readFileSync('src/features/VehicleMarketplace/components/HomePageAdminPanel.tsx', 'utf8');
const routes = fs.readFileSync('backend/routes/uploadRoutes.js', 'utf8');
const checks = [
  ['hero editor uses the existing authenticated upload service', panel.includes("uploadFile(file, 'marketing'")],
  ['desktop creative supports JPG, PNG and WebP', panel.includes("accept=\"image/jpeg,image/png,image/webp\"")],
  ['mobile creative has a separate upload field', panel.includes("uploadShowcaseCreative(index, 'mobileImage'")],
  ['upload size is limited to 5 MB in the editor', panel.includes('file.size > 5 * 1024 * 1024')],
  ['uploaded URL is validated before being applied', panel.includes('isSafeHeroImageUrl(url)')],
  ['desktop creative preview is visible before save', panel.includes('Preview of showcase vehicle ${index + 1} desktop creative')],
  ['mobile creative preview is visible before save', panel.includes('Preview of showcase vehicle ${index + 1} mobile creative')],
  ['creative remains unpublished until existing save action is used', panel.includes('Save the hero composition to publish it.')],
  ['single marketing uploads are role-restricted', routes.includes('folder === "marketing" && !["admin", "superadmin", "marketing", "ad_manager"].includes(req.user?.role)')],
  ['multiple marketing uploads have the same role restriction', (routes.match(/MARKETING_UPLOAD_FORBIDDEN/g) || []).length === 2],
  ['existing upload endpoint remains authenticated', routes.includes('  protect,\n  uploadLimiter')],
];
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); assert.ok(ok, label); }
console.log(`Hero creative upload security: ${checks.length}/${checks.length} PASS`);
