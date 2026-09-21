import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const service = read('backend/services/dispute.service.js');
const controller = read('backend/controllers/disputeController.js');
const atomic = read('backend/utils/atomicTransactions.js');
const routes = read('backend/routes/disputeRoutes.js');
const migrationDir = path.join(root, 'supabase/migrations');
const migrations = fs.readdirSync(migrationDir).filter((f) => f.includes('dispute_escrow_consolidation'));
const activeEscrowSurface = read('src/features/EscrowView.tsx');
const evidencePanel = read('src/components/EvidenceUpload.jsx');

assert(service.includes('export async function openDispute'), 'canonical openDispute service missing');
assert(service.includes('export async function getEscrowDispute'), 'canonical getEscrowDispute service missing');
assert(service.includes('export async function resolveDispute'), 'canonical resolveDispute service missing');
assert(service.includes('export async function submitAppeal'), 'canonical appeal service missing');
assert(atomic.includes('kayad_resolve_dispute_atomic'), 'atomic dispute resolution RPC wrapper missing');
assert(migrations.length === 1, 'canonical dispute consolidation migration missing or duplicated');
assert(routes.includes('router.post("/"') && routes.includes('router.get("/:id"'), 'canonical dispute create/detail routes missing');
assert(routes.includes('router.patch("/:id/status"'), 'canonical dispute transition route missing');
assert(routes.includes('"/:id/evidence"'), 'canonical dispute evidence route missing');
assert(controller.includes('resolveDispute') && controller.includes('submitAppeal'), 'canonical dispute controller actions missing');
assert(activeEscrowSurface.includes('disputeEscrow') && activeEscrowSurface.includes('EvidenceUpload'), 'active escrow surface is not wired to the canonical dispute flow');
assert(evidencePanel.includes('disputeAPI.uploadEvidence'), 'evidence panel is not API-backed');
assert(!fs.existsSync(path.join(root, 'backend/models/Dispute.js')), 'legacy Dispute model still exists');
assert(!fs.existsSync(path.join(root, 'backend/models/Evidence.js')), 'legacy Evidence model still exists');
assert(!fs.existsSync(path.join(root, 'backend/services/resolution.service.js')), 'legacy resolution service still exists');

console.log('Dispute canonical lifecycle validation: PASS');
console.log(`Canonical consolidation migration: ${migrations[0]}`);
console.log('Canonical escrow-backed dispute service: PASS');
console.log('Active escrow dispute surface: PASS');
console.log('API-backed evidence flow: PASS');
console.log('Legacy dispute/evidence models: removed');
console.log('Atomic resolution path: PASS');
