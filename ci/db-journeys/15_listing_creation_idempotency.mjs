// Exactly-once listing creation against a REAL disposable schema, real PostgREST and the real backend.
// Covers the free dealer path (cars.creation_idempotency_key + uq_cars_owner_creation_key) and the paid path (kayad_create_dealer_listing_atomic).
// The global dealer-listing policy is switched for the paid-path section and ALWAYS restored.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { makeUser, q, qAsync, check, finish, listingForm, uid, B } from './lib.mjs';

const PGBENCH = process.env.PGBENCH_BIN || ['/usr/lib/postgresql/16/bin/pgbench', '/usr/lib/postgresql/17/bin/pgbench', '/usr/lib/postgresql/15/bin/pgbench'].find((x) => fs.existsSync(x)) || 'pgbench';
const PGD = process.env.KAYAD_JOURNEY_DB || process.env.PGDATABASE || 'kayad_t';
const mkDealer = async (tag) => {
  const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `Idem ${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
  q(`update users set status='approved' where id='${d.id}'`);
  q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`);
  await d.raw('/api/v1/auth/login', { method: 'POST', body: { email: d.email, password: 'Str0ng!Passw0rd' } }); d.csrf = null;
  return d;
};
const post = (d, title, key, extra = {}) => { const f = listingForm(title); for (const [k, v] of Object.entries(extra)) f.append(k, v); return d.raw('/api/cars', { method: 'POST', form: f, headers: key ? { 'Idempotency-Key': key } : {} }); };
const count = (id) => Number(q(`select count(*) from cars where dealer_id='${id}'`));
const shape = (id) => q(`select count(*)||'/'||count(distinct listing_number)||'/'||coalesce(min(listing_number),0)||'/'||coalesce(max(listing_number),0) from cars where dealer_id='${id}'`);
const K = (s) => `idem-${s}-${uid()}${uid()}`;
const idOf = (r) => r.j?.data?.id || r.j?.data?._id;

// ---- Free path ---------------------------------------------------------------------------------------------------------------------
const A = await mkDealer('a'); const Bd = await mkDealer('b');

// 1 + 10: concurrent duplicates, same owner, same key, same payload
const k1 = K('conc');
const conc = await Promise.all(Array.from({ length: 8 }, () => post(A, 'Concurrent duplicate', k1)));
const created = conc.filter((r) => r.status === 201); const replayed = conc.filter((r) => r.status === 200);
console.log(`INFO free path: 8 simultaneous identical submissions -> statuses ${conc.map((r) => r.status).join(',')}; listings in database ${count(A.id)}`);
check('T1 concurrent duplicates (free): exactly one listing exists', count(A.id) === 1, [conc.map((r) => r.status), count(A.id)]);
check('T1 exactly one 201, every other request is a 200 replay of the same listing id', created.length === 1 && replayed.length === 7 && new Set(conc.map(idOf)).size === 1, conc.map((r) => [r.status, idOf(r)]));
check('T10 listing number: one listing, number 1, no gap', shape(A.id) === '1/1/1/1', shape(A.id));

// 2: same key same payload, later retry
const again = await post(A, 'Concurrent duplicate', k1);
check('T2 same key + same payload later: 200 replay, same id, header set, no new listing', again.status === 200 && idOf(again) === idOf(created[0]) && again.headers.get('idempotent-replay') === 'true' && count(A.id) === 1, [again.status, count(A.id)]);

// 3: same key different payload
const diff = await post(A, 'A different listing entirely', k1);
check('T3 same key + different payload: 409 IDEMPOTENCY_KEY_REUSED, nothing created', diff.status === 409 && diff.j?.code === 'IDEMPOTENCY_KEY_REUSED' && count(A.id) === 1, [diff.status, diff.j]);

// 4: different owners, same key
const bRes = await post(Bd, 'Concurrent duplicate', k1);
check('T4 different owner + same key: independent scope, new listing for B', bRes.status === 201 && idOf(bRes) !== idOf(created[0]) && count(Bd.id) === 1 && count(A.id) === 1, [bRes.status, count(Bd.id)]);
const bReplay = await post(Bd, 'Concurrent duplicate', k1);
check('T4 B replay returns B\'s own listing, never A\'s', bReplay.status === 200 && idOf(bReplay) === idOf(bRes) && idOf(bReplay) !== idOf(created[0]));

// 5: different keys
const d1 = await post(A, 'Second listing', K('d1')); const d2 = await post(A, 'Second listing', K('d2'));
check('T5 different keys are separate operations (both create)', d1.status === 201 && d2.status === 201 && count(A.id) === 3, [d1.status, d2.status, count(A.id)]);

// no key: unchanged behaviour
const n1 = await post(A, 'No key', null); const n2 = await post(A, 'No key', null);
check('no Idempotency-Key: behaviour unchanged (each submission is a new listing)', n1.status === 201 && n2.status === 201 && count(A.id) === 5);

// invalid key
const bad = await post(A, 'Bad key', 'short');
check('invalid Idempotency-Key is refused with 400 and creates nothing', bad.status === 400 && bad.j?.code === 'INVALID_IDEMPOTENCY_KEY' && count(A.id) === 5, [bad.status, bad.j]);

// 6 + 7: failure then retry with the same key
const k6 = K('fail');
const missing = await A.raw('/api/cars', { method: 'POST', form: (() => { const f = listingForm('No price'); f.delete('price'); return f; })(), headers: { 'Idempotency-Key': k6 } });
check('T6 validation failure creates nothing and leaves no idempotency record', missing.status >= 400 && count(A.id) === 5 && Number(q(`select count(*) from cars where creation_idempotency_key='${k6}'`)) === 0, [missing.status]);
const retry6 = await post(A, 'No price', k6);
check('T6 retry with the same key after the failure succeeds (201), one new listing', retry6.status === 201 && count(A.id) === 6, [retry6.status, count(A.id)]);
const vinFirst = await post(Bd, 'VIN holder', K('vin1'), { vin: 'JMZKE' + uid().toUpperCase().slice(0, 12) });
const vin = 'JMZKF' + uid().toUpperCase().slice(0, 12);
await post(Bd, 'VIN taken', K('vin2'), { vin });
const k7 = K('dupvin');
const dupVin = await post(A, 'Dup VIN attempt', k7, { vin });
check('T7 database constraint failure (duplicate VIN) is refused and consumes no key', dupVin.status === 409 && Number(q(`select count(*) from cars where creation_idempotency_key='${k7}'`)) === 0, [dupVin.status, dupVin.j]);
const retry7 = await post(A, 'Dup VIN attempt', k7, { vin: 'JMZKG' + uid().toUpperCase().slice(0, 12) });
check('T7 retry with the same key and a corrected payload succeeds', retry7.status === 201, [retry7.status, retry7.j]);
void vinFirst;

// 8 + 9: durable across reconnects (every database session terminated); a real backend process restart is NOT exercised by this harness
const before = count(A.id);
q(`select count(pg_terminate_backend(pid)) from pg_stat_activity where datname='${PGD}' and pid <> pg_backend_pid()`);
const afterReconnect = await post(A, 'Concurrent duplicate', k1);
check('T9 after every database session was terminated, the same key still replays (state is in the database)', afterReconnect.status === 200 && idOf(afterReconnect) === idOf(created[0]) && count(A.id) === before, [afterReconnect.status]);
console.log('INFO T8 backend process restart: NOT EXERCISED by this harness (the idempotency state lives only in PostgreSQL, so a restart cannot lose it; T9 proves the reconnect case)');

// 11: immutability
check('T11 listing_number immutable', !(await qAsync(`update cars set listing_number = 999 where id='${idOf(created[0])}'`)).ok);
check('T11 creation key and hash are immutable', !(await qAsync(`update cars set creation_idempotency_key='x-changed-${uid()}' where id='${idOf(created[0])}'`)).ok && !(await qAsync(`update cars set creation_request_hash='deadbeef' where id='${idOf(created[0])}'`)).ok);
check('T11 normal edits keep both', q(`update cars set title='Edited', price=3 where id='${idOf(created[0])}' returning creation_idempotency_key='${k1}' and listing_number=1`) === 't');
check('T10 numbers stay unique and contiguous per owner after all of the above', ['A', 'B'].every((x) => { const id = (x === 'A' ? A : Bd).id; const [c, dn, mn, mx] = shape(id).split('/').map(Number); return c === dn && mn === 1 && mx === c; }), [shape(A.id), shape(Bd.id)]);

// 13: authentication and authorisation on replay
const anon = await fetch(B + '/api/cars', { method: 'POST', headers: { 'Idempotency-Key': k1 }, body: listingForm('Concurrent duplicate') });
check('T13 unauthenticated replay is refused (401/403), no listing data returned', [401, 403].includes(anon.status), anon.status);
const stranger = await makeUser({ tag: 'stranger', role: 'user' });
const strangerTry = await post(stranger, 'Concurrent duplicate', k1);
check('T13 another account presenting the same key never receives the owner\'s listing', idOf(strangerTry) !== idOf(created[0]), [strangerTry.status]);

// 15: database-level race, 32 connections all inserting the SAME owner+key at once
const key15 = K('bench'); const owner15 = A.id;
const sql = `insert into cars(title,brand,model,year,price,status,dealer_id,sold,creation_idempotency_key,creation_request_hash) values ('Bench','Mazda','CX-5',2019,1,'available','${owner15}',false,'${key15}','hash-bench') on conflict (dealer_id, creation_idempotency_key) where creation_idempotency_key is not null do nothing;\n`;
const sf = `/tmp/kayad_idem_${uid()}.sql`; fs.writeFileSync(sf, sql);
const out = execFileSync(PGBENCH, ['-h', process.env.PGHOST || '127.0.0.1', '-p', process.env.PGPORT || '54329', '-U', process.env.PGUSER || 'postgres', '-n', '-c', '32', '-j', '4', '-t', '50', '-f', sf, PGD], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
fs.unlinkSync(sf);
const rows15 = Number(q(`select count(*) from cars where dealer_id='${owner15}' and creation_idempotency_key='${key15}'`));
console.log(`INFO T15 pgbench: 32 connections x 50 attempts = 1,600 simultaneous inserts of one (owner,key): rows stored ${rows15}; ` + out.split('\n').filter((l) => /transactions actually processed|failed/.test(l)).join(' | '));
check('T15 high concurrency: 1,600 attempts across 32 connections store exactly one row for the key', rows15 === 1, rows15);
check('T15 the unique index, not the application, enforces it (a plain duplicate insert is refused)', !(await qAsync(`insert into cars(title,brand,model,year,price,status,dealer_id,sold,creation_idempotency_key,creation_request_hash) values ('X','Mazda','CX-5',2019,1,'available','${owner15}',false,'${key15}','h')`)).ok);

// ---- Paid path -----------------------------------------------------------------------------------------------------------------------
const POLICY = `insert into system_settings(key,value,description) values ('dealer_listing_policy','{"schemaVersion":1,"subscriptionRequired":true}','journey') on conflict (key) do update set value=excluded.value`;
let paidOk = true;
try {
  q(POLICY);
  const P = await mkDealer('paid'); const P2 = await mkDealer('paid2');
  for (const d of [P, P2]) q(`insert into dealer_subscriptions(dealer, plan_id, plan_name, amount, listing_max, status, expires_at) values ('${d.id}','journey','Journey plan',0,50,'active', now() + interval '30 days')`);
  const kp = K('paid');
  const paid = await Promise.all(Array.from({ length: 6 }, () => post(P, 'Paid duplicate', kp)));
  console.log(`INFO paid path: 6 simultaneous identical submissions -> statuses ${paid.map((r) => r.status).join(',')}; listings ${count(P.id)}`);
  check('T12 paid path: concurrent duplicates create exactly one listing (one 201, rest 200 replays)', count(P.id) === 1 && paid.filter((r) => r.status === 201).length === 1 && paid.filter((r) => r.status === 200).length === 5, [paid.map((r) => r.status), count(P.id)]);
  const reserved = Number(q(`select count(*) from listing_entitlement_reservations where dealer_id='${P.id}'`));
  const used = q(`select coalesce(listing_count,0) from users where id='${P.id}'`);
  check('T12/T14 exactly one entitlement reservation and listing_count incremented once (no duplicate side effect)', reserved === 1 && Number(used) === 1, [reserved, used]);
  const pDiff = await post(P, 'Paid different', kp);
  check('T12 paid path: same key + different payload is refused (409), no listing, no extra reservation', pDiff.status === 409 && pDiff.j?.code === 'IDEMPOTENCY_KEY_REUSED' && count(P.id) === 1, [pDiff.status, pDiff.j]);
  const pOther = await post(P2, 'Paid duplicate', kp);
  check('T4/T12 paid path: another dealer using the same key gets its own listing (before this change it received the first dealer\'s listing)', pOther.status === 201 && idOf(pOther) !== idOf(paid.find((r) => r.status === 201)) && count(P2.id) === 1, [pOther.status]);
  const pRe = await post(P, 'Paid duplicate', kp);
  check('T12 paid path: later retry replays the same listing', pRe.status === 200 && count(P.id) === 1, [pRe.status]);
  check('T14 no payment rows were created by any listing creation or replay', Number(q(`select count(*) from payments where car_id in (select id from cars where dealer_id in ('${P.id}','${P2.id}','${A.id}','${Bd.id}'))`)) === 0);
} catch (e) { paidOk = false; console.log('FAIL paid-path section crashed: ' + (e?.stack || e)); } finally { q(`delete from system_settings where key='dealer_listing_policy'`); }
check('paid-path section ran to completion', paidOk);
finish('15_listing_creation_idempotency');
