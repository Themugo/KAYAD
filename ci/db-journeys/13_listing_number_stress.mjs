// Listing-number integrity and concurrency against a REAL (disposable) schema.
// Scope is the CURRENT per-owner scheme (owner decision D-17 is still open; this file does not change the scope).
// Real concurrency: pgbench opens 32 separate database connections inserting at the same time (database level) and the
// API is hit with parallel requests (application level). Volumes are printed so the report can quote them exactly.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { makeUser, q, qAsync, check, finish, listingForm, uid } from './lib.mjs';

// pgbench ships with PostgreSQL; PGBENCH_BIN overrides, otherwise PATH, otherwise the Debian/Ubuntu server package location.
const PGBENCH = process.env.PGBENCH_BIN || (() => { try { execFileSync('pgbench', ['--version'], { stdio: 'ignore' }); return 'pgbench'; } catch { const g = ['/usr/lib/postgresql/17/bin/pgbench', '/usr/lib/postgresql/16/bin/pgbench', '/usr/lib/postgresql/15/bin/pgbench', '/usr/lib/postgresql/14/bin/pgbench'].find((x) => existsSync(x)); return g || 'pgbench'; } })();
const PGH = process.env.PGHOST || '127.0.0.1';
const PGP = process.env.PGPORT || '54329';
const PGU = process.env.PGUSER || 'postgres';
const PGD = process.env.KAYAD_JOURNEY_DB || process.env.PGDATABASE || 'kayad_t';

const mkDealer = async (tag) => {
  const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `Stress ${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
  q(`update users set status='approved' where id='${d.id}'`);
  q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`);
  await d.raw('/api/v1/auth/login', { method: 'POST', body: { email: d.email, password: 'Str0ng!Passw0rd' } }); d.csrf = null;
  return d;
};
const ins = (owner, t) => `insert into cars(title,brand,model,year,price,status,dealer_id,sold) values ('${t}','Mazda','CX-5',2019,1,'available','${owner}',false)`;
const shape = (owner) => q(`select count(*)||'/'||count(distinct listing_number)||'/'||coalesce(min(listing_number),0)||'/'||coalesce(max(listing_number),0) from cars where dealer_id='${owner}'`);
const counter = (owner) => Number(q(`select coalesce((select last_number from dealer_listing_counters where dealer_id='${owner}'),0)`));

// ---- S1 sequential -------------------------------------------------------------------------------------------------------
const S = await mkDealer('seq');
for (let i = 0; i < 25; i++) q(ins(S.id, `S${i}`));
check('S1 sequential: 25 inserts give 1..25 with no gap or duplicate', shape(S.id) === '25/25/1/25', shape(S.id));

// ---- S2 parallel at database level (pgbench, 32 connections) ---------------------------------------------------------------
const OWNERS = 8; const CLIENTS = 32; const TX_PER_CLIENT = 250; const TOTAL = CLIENTS * TX_PER_CLIENT;
const dealers = []; for (let i = 0; i < OWNERS; i++) dealers.push(await mkDealer('par' + i));
q(`drop table if exists stress_owners`); q(`create table stress_owners(n int primary key, id uuid not null)`);
dealers.forEach((d, i) => q(`insert into stress_owners values (${i + 1}, '${d.id}')`));
const script = `\\set n random(1, ${OWNERS})\ninsert into cars(title,brand,model,year,price,status,dealer_id,sold) select 'P','Mazda','CX-5',2019,1,'available',id,false from stress_owners where n = :n;\n`;
const sf = `/tmp/kayad_stress_${uid()}.sql`; (await import('node:fs')).writeFileSync(sf, script);
const t0 = Date.now();
const out = execFileSync(PGBENCH, ['-h', PGH, '-p', PGP, '-U', PGU, '-n', '-c', String(CLIENTS), '-j', '4', '-t', String(TX_PER_CLIENT), '-f', sf, PGD], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`INFO pgbench: ${CLIENTS} concurrent connections x ${TX_PER_CLIENT} transactions = ${TOTAL} inserts across ${OWNERS} owners in ${secs}s`);
console.log('INFO ' + out.split('\n').filter((l) => /transactions actually processed|failed|latency average|tps/.test(l)).join(' | '));
const perOwner = dealers.map((d) => shape(d.id).split('/').map(Number));
const allRows = perOwner.reduce((a, r) => a + r[0], 0);
check(`S2 parallel: all ${TOTAL} concurrent inserts committed`, allRows === TOTAL, allRows);
check('S2 parallel: for every owner, rows = distinct numbers = max and min is 1 (no duplicate, no gap)', perOwner.every(([c, d, mn, mx]) => c === d && d === mx && mn === 1), perOwner);
check('S2 parallel: counters equal the highest number for each owner', dealers.every((d) => counter(d.id) === Number(shape(d.id).split('/')[3])));
check('S2 database-enforced: the unique index rejects a manual duplicate', !(await qAsync(`insert into cars(title,brand,model,year,price,status,dealer_id,sold,listing_number) values ('dup','Mazda','CX-5',2019,1,'available','${dealers[0].id}',false,1)`)).ok);

// ---- S3 rollback and failed insert do not consume numbers ----------------------------------------------------------------------
const R = await mkDealer('rb'); q(ins(R.id, 'R1')); q(ins(R.id, 'R2'));
const before = counter(R.id);
q(`begin; ${ins(R.id, 'R-rolled-back')}; rollback;`);
check('S3 rollback: counter unchanged after a rolled-back insert', counter(R.id) === before, [before, counter(R.id)]);
const bad = await qAsync(`insert into cars(title,brand,model,year,price,status,dealer_id,sold) values (NULL,'Mazda','CX-5',2019,1,'available','${R.id}',false)`);
check('S3 failed insert (constraint violation) is refused and consumes no number', !bad.ok && counter(R.id) === before, [bad.ok, counter(R.id)]);
q(ins(R.id, 'R3'));
check('S3 retry after failure takes the next contiguous number', shape(R.id) === '3/3/1/3', shape(R.id));

// ---- S4 reconnect: every other database session is terminated, numbering continues from the persisted counter --------------
const before2 = counter(R.id);
q(`select count(pg_terminate_backend(pid)) from pg_stat_activity where datname='${PGD}' and pid <> pg_backend_pid()`);
q(ins(R.id, 'R4'));
check('S4 reconnect: after all sessions were terminated the next number continues the sequence', counter(R.id) === before2 + 1 && shape(R.id) === '4/4/1/4', shape(R.id));

// ---- S5 application level: parallel API creation and duplicate submission ---------------------------------------------------------
const A = await mkDealer('api');
const N_API = 12;
const posts = await Promise.all(Array.from({ length: N_API }, (_, i) => A.raw('/api/cars', { method: 'POST', form: listingForm('API stress ' + i) })));
console.log(`INFO API: ${N_API} parallel POST /api/cars -> statuses ${posts.map((p) => p.status).join(',')}`);
const okPosts = posts.filter((p) => p.status === 201).length;
const apiShape = shape(A.id).split('/').map(Number);
check('S5 API parallel: every accepted creation has a distinct contiguous number', okPosts > 0 && apiShape[0] === okPosts && apiShape[1] === okPosts && apiShape[2] === 1 && apiShape[3] === okPosts, [okPosts, apiShape]);

const D = await mkDealer('dup');
const key = 'dup-' + uid();
const dupForm = () => listingForm('Duplicate submission ' + key);
const dups = await Promise.all([0, 1].map(() => D.raw('/api/cars', { method: 'POST', form: dupForm(), headers: { 'Idempotency-Key': key } })));
const dupRows = Number(q(`select count(*) from cars where dealer_id='${D.id}'`));
console.log(`INFO duplicate submission with one Idempotency-Key: statuses ${dups.map((d) => d.status).join(',')}, listings created ${dupRows}`);
check('S5 duplicate submission: numbering stays unique and contiguous whatever the outcome', dupRows >= 1 && shape(D.id) === `${dupRows}/${dupRows}/1/${dupRows}`, [dups.map((d) => d.status), dupRows, shape(D.id)]);
// DEF-01 is fixed (reports/FINAL-COMPLETION/01-IDEMPOTENCY-REPAIR.md): a simultaneous duplicate submission with one Idempotency-Key creates exactly one listing.
check('S5 duplicate submission (same Idempotency-Key) creates exactly one listing', dupRows === 1 && dups.filter((d) => d.status === 201).length === 1, [dups.map((d) => d.status), dupRows]);

// ---- S6 different owners are independent -----------------------------------------------------------------------------------------
check('S6 different owners: every owner has its own sequence starting at 1', [S, R, A, D, ...dealers].every((o) => shape(o.id).split('/')[2] === '1'));

// ---- S7 immutability under load ------------------------------------------------------------------------------------------------
const r = await qAsync(`update cars set listing_number = listing_number + 1000 where dealer_id='${dealers[0].id}'`);
check('S7 numbers cannot be changed by bulk update', !r.ok);
const edit = q(`update cars set title='edited', price=2 where dealer_id='${S.id}' and listing_number=1 returning listing_number`);
check('S7 editing other fields keeps the number', edit === '1', edit);

q(`drop table if exists stress_owners`);
try { (await import('node:fs')).unlinkSync(sf); } catch { /* ignore */ }
finish('13_listing_number_stress');
