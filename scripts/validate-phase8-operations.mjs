#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures=[]; const checks=[];
const exists=p=>fs.existsSync(path.join(root,p));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const check=(name,ok,detail='')=>{checks.push([name,ok,detail]);if(!ok)failures.push(`${name}${detail?`: ${detail}`:''}`)};

check('Structured logging', exists('backend/infrastructure/logging/index.js') && exists('backend/infrastructure/logging/pino.config.js') && /pino/.test(read('backend/infrastructure/logging/pino.config.js')));
check('Sentry integration', exists('backend/config/sentry.js') && /SENTRY_DSN/.test(read('backend/config/sentry.js')) && /safeCaptureException/.test(read('backend/config/sentry.js')));
check('Prometheus metrics', exists('backend/routes/prometheusMetrics.js') && /getAllMetrics/.test(read('backend/routes/prometheusMetrics.js')) && /prometheus/.test(read('backend/server.js')));
check('Alert routing uses canonical providers', /BREVO_API_KEY/.test(read('backend/config/alerting.js')) && /AT_API_KEY/.test(read('backend/config/alerting.js')));
check('Alert object/positional compatibility', /structured = titleOrAlert/.test(read('backend/config/alerting.js')) && /safeLevel/.test(read('backend/config/alerting.js')));
check('Queue retries and DLQ', /attempts: 3/.test(read('backend/config/queue.js')) && /getDeadLetterQueue/.test(read('backend/config/queue.js')));
check('Worker lifecycle', exists('backend/infrastructure/queues/workerManager.js') && /startAllWorkers/.test(read('backend/infrastructure/queues/workerManager.js')) && /stopAllWorkers/.test(read('backend/infrastructure/queues/workerManager.js')));
check('Backup helpers', exists('scripts/backup-database.sh') && exists('scripts/backup-database.bat') && exists('scripts/verify-backup-artifact.mjs'));
check('Recovery runbooks', exists('runbooks/database-failure.md') && exists('runbooks/deployment-rollback.md') && exists('runbooks/third-party-outage.md') && exists('DISASTER_RECOVERY.md'));
check('Current email provider in DR docs', !/SendGrid|sendgrid/i.test(read('DISASTER_RECOVERY.md')+read('runbooks/third-party-outage.md')));
check('Production rollback endpoints are configurable', /BACKEND_URL/.test(read('runbooks/deployment-rollback.md')) && /FRONTEND_URL/.test(read('runbooks/deployment-rollback.md')));
check('Recovery tooling retained', exists('scripts/validate-recovery-repair.mjs') && exists('APPLY_RECOVERY_TO_REPO.cmd'));
check('Production security gate retained', exists('scripts/validate-phase7-security-release.mjs'));
check('Phase 6 release gate retained', exists('scripts/validate-phase6-release.mjs') && exists('scripts/certify-phase6-live.mjs'));
check('No private-key material in operational files', !/(BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,})/.test(read('backend/config/alerting.js')+read('backend/config/sentry.js')));

console.log('===== KAYAD PHASE 8 OPERATIONS & RECOVERY CERTIFICATION =====');
for(const [n,o,d] of checks) console.log(`${o?'PASS':'FAIL'} | ${n}${d?` | ${d}`:''}`);
console.log(`\nRESULT: ${checks.length-failures.length}/${checks.length} PASS`);
if(failures.length){console.error('\nFailures:\n- '+failures.join('\n- '));process.exit(1)}
