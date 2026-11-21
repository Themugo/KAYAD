// Silent-aggregation audit (2026-11-21): proves Model.aggregate() results against known fixtures in a real database.
// Runs the backend model layer directly against the disposable PostgREST (needs SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from run.sh; loopback only).
import { q, check, finish, uid } from './lib.mjs';
if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(process.env.SUPABASE_URL || '')) throw new Error('Refusing to run: SUPABASE_URL must be a loopback PostgREST');
const { initSupabase } = await import('../../backend/utils/supabase.js');
initSupabase();
const { default: Payment } = await import('../../backend/models/Payment.js');
const { default: AuditLog } = await import('../../backend/models/AuditLog.js');
const tag = uid();
// ---- fixtures: 1300 payments (> PostgREST max-rows 1000) with known totals
const userId = q(`insert into users(name,email,role) values ('agg ${tag}','agg-${tag}@example.test','user') returning id`);
q(`insert into payments(user_id,type,amount,phone,status,created_at)
   select '${userId}','purchase', (g%7+1)*1000, '254712345678',
          case when g%3=0 then 'success' when g%3=1 then 'refunded' else 'failed' end,
          case when g<=300 then now()-interval '60 days' else now()-interval '2 days' end
   from generate_series(1,1300) g`);
const truth = (sql) => Number(q(sql));
const T_ALL = truth(`select count(*) from payments where user_id='${userId}'`);
const T_SUM_ALL = truth(`select sum(amount) from payments where user_id='${userId}'`);
const T_SUCCESS_SUM = truth(`select sum(amount) from payments where user_id='${userId}' and status='success'`);
const T_RECENT = truth(`select count(*) from payments where user_id='${userId}' and created_at >= now()-interval '30 days'`);
const T_RECENT_SUCCESS_SUM = truth(`select sum(amount) from payments where user_id='${userId}' and status='success' and created_at >= now()-interval '30 days'`);
const T_IN = truth(`select sum(amount) from payments where user_id='${userId}' and status in ('success','refunded')`);
const T_AVG = truth(`select avg(amount) from payments where user_id='${userId}'`);
const T_MAX = truth(`select max(amount) from payments where user_id='${userId}'`);
const since = new Date(Date.now() - 30 * 864e5);
const infra = (r) => r && r.error && /not initialized|ECONN|fetch failed/i.test(r.error);
const loud = (r) => !!(r && r.error) && !infra(r);
const run = async (label, fn) => { try { return await fn(); } catch (e) { return { error: String(e.message || e) }; } };
const only = (rows) => (Array.isArray(rows) ? rows : []);
const val = (rows, k) => only(rows).find((r) => r._id === null || r._id === undefined)?.[k];

const rTotal = await run('total', () => Payment.aggregate([{ $match: { user: userId } }, { $group: { _id: null, n: { $sum: 1 }, s: { $sum: '$amount' } } }]));
check(`aggregate sums ALL ${T_ALL} rows (not just the first 1000): count`, val(rTotal, 'n') === T_ALL, { got: val(rTotal, 'n'), want: T_ALL, rTotal });
check('aggregate sums ALL rows: amount sum', val(rTotal, 's') === T_SUM_ALL, { got: val(rTotal, 's'), want: T_SUM_ALL });
const rStatus = await run('status', () => Payment.aggregate([{ $match: { user: userId } }, { $group: { _id: '$status', s: { $sum: '$amount' }, n: { $sum: 1 } } }]));
const succ = only(rStatus).find((r) => r._id === 'success');
check('group by status: success amount sum equals SQL', succ?.s === T_SUCCESS_SUM, { got: succ?.s, want: T_SUCCESS_SUM, rStatus });
const rGte = await run('gte', () => Payment.aggregate([{ $match: { user: userId, createdAt: { $gte: since } } }, { $group: { _id: null, n: { $sum: 1 } } }]));
check('$match createdAt $gte returns the rows in range (count)', val(rGte, 'n') === T_RECENT, { got: val(rGte, 'n'), want: T_RECENT, rGte });
const rGteS = await run('gte2', () => Payment.aggregate([{ $match: { user: userId, status: 'success', createdAt: { $gte: since } } }, { $group: { _id: null, s: { $sum: '$amount' } } }]));
check('$match status + createdAt $gte: success amount sum equals SQL', val(rGteS, 's') === T_RECENT_SUCCESS_SUM, { got: val(rGteS, 's'), want: T_RECENT_SUCCESS_SUM, rGteS });
const rIn = await run('in', () => Payment.aggregate([{ $match: { user: userId, status: { $in: ['success', 'refunded'] } } }, { $group: { _id: null, s: { $sum: '$amount' } } }]));
check('$match status $in equals SQL', val(rIn, 's') === T_IN, { got: val(rIn, 's'), want: T_IN, rIn });
const rAvg = await run('avg', () => Payment.aggregate([{ $match: { user: userId } }, { $group: { _id: null, a: { $avg: '$amount' } } }]));
check('$avg equals SQL average', Math.abs((val(rAvg, 'a') ?? NaN) - T_AVG) < 0.01, { got: val(rAvg, 'a'), want: T_AVG });
const rMax = await run('max', () => Payment.aggregate([{ $match: { user: userId } }, { $group: { _id: null, m: { $max: '$amount' } } }]));
check('$max is supported or refused loudly (never silently ignored)', val(rMax, 'm') === T_MAX || loud(rMax), rMax);
const rUnwind = await run('unwind', () => Payment.aggregate([{ $match: { user: userId } }, { $unwind: '$metadata.x' }, { $group: { _id: null, n: { $sum: 1 } } }]));
check('an unsupported stage ($unwind) is refused loudly, not ignored', loud(rUnwind), rUnwind);
const rCount = await run('count', () => Payment.aggregate([{ $match: { user: userId } }, { $count: 'n' }]));
check('$count stage is supported (n equals SQL) or refused loudly', (Array.isArray(rCount) && rCount[0]?.n === T_ALL) || loud(rCount), rCount);
const rFacet = await run('facet', () => Payment.aggregate([{ $match: { user: userId } }, { $facet: { c: [{ $count: 'n' }] } }]));
check('$facet is supported (counts equal SQL) or refused loudly', (Array.isArray(rFacet) && rFacet[0]?.c?.[0]?.n === T_ALL) || loud(rFacet), rFacet);
const rCompound = await run('compound', () => Payment.aggregate([{ $match: { user: userId } }, { $group: { _id: { s: '$status', t: '$type' }, n: { $sum: 1 } } }]));
check('compound $group _id is supported (3 groups) or refused loudly', (Array.isArray(rCompound) && rCompound.length === 3) || loud(rCompound), rCompound);
const rSortStr = await run('sortstr', () => Payment.aggregate([{ $match: { user: userId } }, { $group: { _id: '$status', n: { $sum: 1 } } }, { $sort: { _id: 1 } }]));
check('$sort by a string key orders alphabetically', Array.isArray(rSortStr) && rSortStr.map((r) => r._id).join() === 'failed,refunded,success', rSortStr);
const rNoLeak = only(rStatus).every((r) => !Object.keys(r).some((k) => k.startsWith('_avg')));
check('no internal accumulator fields leak into results', rNoLeak, rStatus);
const rZero = await run('gtezero', () => Payment.aggregate([{ $match: { user: userId, amount: { $gte: 0 } } }, { $group: { _id: null, n: { $sum: 1 } } }]));
check('$gte: 0 is honoured (falsy operand)', val(rZero, 'n') === T_ALL, { got: val(rZero, 'n'), want: T_ALL, rZero });
// ---- AuditLog, the pattern used by the audit dashboard
q(`insert into audit_logs(action,created_at) select case when g%2=0 then 'login' else 'update' end, now()-interval '1 day' from generate_series(1,1100) g`);
const T_LOGIN = truth(`select count(*) from audit_logs where action='login'`);
const rAudit = await run('audit', () => AuditLog.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$action', count: { $sum: 1 } } }, { $sort: { count: -1 } }]));
check('audit dashboard pattern (match $gte + group count) equals SQL', only(rAudit).find((r) => r._id === 'login')?.count === T_LOGIN, { got: only(rAudit), want: T_LOGIN });
q(`delete from payments where user_id='${userId}'`); q(`delete from users where id='${userId}'`);
finish('aggregate-shim');
