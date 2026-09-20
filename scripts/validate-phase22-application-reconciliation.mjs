import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const required = [
 'supabase/migrations/20260920220000_phase22_reconciliation.sql',
 'backend/inspection/services/phase22Service.js',
 'backend/inspection/controllers/phase22Controller.js',
 'backend/inspection/routes/phase22Routes.js',
];
const checks = [
 ['migration', required[0]],
 ['phase22 service', required[1]],
 ['phase22 controller', required[2]],
 ['phase22 routes', required[3]],
];
for (const [label, file] of checks) if (!fs.existsSync(path.join(root,file))) throw new Error(`FAIL ${label}: ${file}`);
const service = fs.readFileSync(path.join(root, required[1]), 'utf8');
for (const rpc of ['kayad_create_inspection_provider_application','kayad_find_nearby_inspection_providers','kayad_get_inspection_report_access','kayad_purchase_inspection_report_download','kayad_submit_inspection_review_atomic','kayad_open_inspection_dispute_atomic','kayad_add_inspection_dispute_evidence_atomic','kayad_transition_service_job_atomic','kayad_open_service_job_dispute_atomic','kayad_add_service_job_dispute_evidence_atomic','kayad_admin_resolve_service_job_dispute_atomic']) if (!service.includes(rpc)) throw new Error(`FAIL missing RPC wiring: ${rpc}`);
const routes=fs.readFileSync(path.join(root, required[3]), 'utf8');
for (const fragment of ['/providers/register','/providers/nearby','/reports/:reportId/access','/reports/:reportId/purchase','/bookings/:bookingId/disputes','/service-jobs/:jobId/disputes']) if (!routes.includes(fragment)) throw new Error(`FAIL missing route: ${fragment}`);
console.log('PHASE22_APPLICATION_RECONCILIATION_PASS');
