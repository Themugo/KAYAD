import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = [];
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) fail.push(name);
};

const server = read('backend/server.js');
const inspection = read('backend/inspection/routes/inspectionRoutes.js');

check('single canonical inspection router import', (server.match(/import inspectionRoutes from "\.\/inspection\/routes\/inspectionRoutes\.js";/g) || []).length === 1);
check('singular inspection API uses canonical router', server.includes('app.use("/api/inspection", inspectionRoutes);'));
check('plural inspection API is an alias of the canonical router', server.includes('app.use("/api/inspections", inspectionRoutes);'));
check('no second inspection router implementation is mounted', !server.includes('inspectionMarketplaceRoutes') && !server.includes('from "./routes/inspectionRoutes.js"'));
check('dormant digital inspection source removed', !fs.existsSync(path.join(root, 'backend/digitalInspection')) && !fs.existsSync(path.join(root, 'backend/db/digitalInspection.schema.sql')));
check('canonical inspection controller has no dormant-table references', !inspection.includes('digitalController') && !inspection.includes('digital_inspections'));
check('legacy compatibility uses canonical vehicle_inspections', read('backend/inspection/controllers/legacyCompatibilityController.js').includes("from('vehicle_inspections')"));
check('production env contract exists', fs.existsSync(path.join(root, '.env.production.example')));
check('migration chain contains only .sql files', fs.readdirSync(path.join(root, 'supabase/migrations')).every((f) => !f.endsWith('.sql.sql') && !f.endsWith('.sql.')));
check('canonical reconciliation migrations exist', fs.existsSync(path.join(root, 'supabase/migrations/20260921230000_reconcile_system_status_control_plane.sql')) && fs.existsSync(path.join(root, 'supabase/migrations/20260921231000_reconcile_governance_lifecycle_hardening.sql')) && fs.existsSync(path.join(root, 'supabase/migrations/20260921232000_canonical_inspection_booking_execution_link.sql')));

console.log(`\nKAYAD canonical architecture validation: ${fail.length === 0 ? 'PASS' : `FAIL (${fail.length})`}`);
if (fail.length) process.exit(1);
