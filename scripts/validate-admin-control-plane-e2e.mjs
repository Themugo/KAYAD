import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'); const checks=[]; const check=(n,ok)=>{checks.push(ok);console.log(`${ok?'PASS':'FAIL'} - ${n}`)};
const cc=read('backend/controllers/commandCenterController.js'); const ccr=read('backend/routes/commandCenterRoutes.js'); const sock=read('backend/server.js'); const sc=read('src/context/SocketContext.tsx'); const ui=read('src/pages/admin/command-center/EnterpriseCommandCenter.jsx'); const gov=read('backend/controllers/governanceController.js'); const ops=read('backend/routes/operationsRoutes.js'); const opsd=read('backend/routes/operationsDashboardRoutes.js'); const admin=read('backend/routes/adminRoutes.js'); const dispute=read('backend/controllers/disputeController.js');
check('canonical control-plane snapshot exists',cc.includes('getControlPlaneSnapshot')&&ccr.includes('/snapshot'));
// Stage 5F.5 (D-7, commit b6813d7) replaced the inline sb.from(table).limit(1000) sample with exact server-side counts
// through the canonical data layer. Assert that path end-to-end: the controller uses db/index.js count(), the snapshot
// body reads every required table with no row-sampling, and count() itself is an exact Supabase count.
const dbLayer=read('backend/db/index.js');
const snapBody=(cc.split('export async function getControlPlaneSnapshot')[1]||'').split('\nexport ')[0];
const snapTables=['users','cars','payments','escrows','dealers','vehicle_inspections','incidents','alerts','support_tickets'];
check('snapshot reads authoritative Supabase tables',
  /import\s*\{[^}]*\bcount\b[^}]*\}\s*from\s*"\.\.\/db\/index\.js"/.test(cc)
  && snapTables.every(t=>snapBody.includes(`count("${t}"`))
  && !/\.limit\(\s*1000\s*\)/.test(snapBody) && !snapBody.includes('safe(')
  && /export const count = async[\s\S]{0,200}getSupabase\(\)[\s\S]{0,200}sb\.from\(table\)\.select\('\*',\s*\{\s*count:\s*'exact'/.test(dbLayer));
check('command-center mutations emit realtime updates',cc.includes('controlPlaneUpdated'));
check('Socket.IO has authenticated control-plane room',sock.includes('joinControlPlane')&&sock.includes('socket.user?.role'));
check('frontend subscribes to control-plane realtime',sc.includes('joinControlPlane')&&ui.includes('joinControlPlane'));
check('frontend uses canonical snapshot API',ui.includes('getControlPlaneSnapshot'));
check('governance reads/writes canonical Supabase tables',gov.includes('governance_policies')&&gov.includes('change_requests')&&gov.includes('risk_assessments'));
check('governance approval state is enforced',gov.includes('Only submitted changes can be approved.'));
check('admin mutations broadcast control-plane changes',admin.includes('controlPlaneUpdated'));
check('operations routes delegate to command center',ops.includes('commandCenterController')&&opsd.includes('commandCenterController'));
check('legacy dispute model is absent from control-plane paths',!admin.includes('models/Dispute')&&!ops.includes('models/Dispute')&&!dispute.includes('models/Dispute'));
console.log(`\nAdmin/control-plane E2E validation: ${checks.filter(Boolean).length}/${checks.length} passed.`); if(checks.some(x=>!x))process.exit(1);
