// Gate: no customer-facing "KAYAD" (the brand is KAYARD KE). See scripts/lib/brandScan.mjs for what is allowed and why.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanBrand, ALLOWED } from './lib/brandScan.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hits = scanBrand(root);
// Customer-facing text SEEDED into the database by older migrations (ticker, platform name, email/SMS templates, FAQs) is corrected by a forward migration.
const migPath = path.join(root, 'supabase/migrations/20261121150000_brand_kayard_ke_seeded_customer_content.sql');
const mig = fs.existsSync(migPath) ? fs.readFileSync(migPath, 'utf8') : '';
for (const t of ['system_settings', 'hero_presentation', 'communication_templates', 'cms_faqs', 'website_settings']) {
  if (!mig.includes(t)) { console.error(`FAIL brand correction migration does not cover ${t}`); process.exit(1); }
}
if (hits.length) {
  console.error(`FAIL ${hits.length} customer-facing KAYAD occurrence(s):`);
  hits.slice(0, 40).forEach((h) => console.error(`  ${h.file}:${h.line}  ${h.text}`));
  process.exit(1);
}
console.log(`PASS no customer-facing KAYAD occurrences (${ALLOWED.length} documented legacy exceptions)`);
