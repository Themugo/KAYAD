// DA-04: dealer banking save -> read-back -> refresh -> re-login, owner-only access, masking, no stale cache, tenant isolation.
import crypto from 'node:crypto';
import { makeUser, q, check, finish, Client, uid } from './lib.mjs';

const mkDealer = async (tag) => {
  const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `Bank ${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });
  q(`update users set status='approved' where id='${d.id}'`); q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`);
  await d.raw('/api/v1/auth/login', { method: 'POST', body: { email: d.email, password: 'Str0ng!Passw0rd' } }); d.csrf = null; return d;
};
const A = await mkDealer('banka'); const B = await mkDealer('bankb');
const get = (c) => c.raw('/api/dealer/settlement');

const before = await get(A);
check('a new dealer has no payout details and configured=false', before.status === 200 && before.j.settlement.configured === false && before.j.settlement.bankName === '', before.j);
check('banking GET is never cached by browsers or proxies', /no-store/.test(before.headers.get('cache-control') || ''));
const put = await A.raw('/api/dealer/settlement', { method: 'PUT', body: { paymentDetails: { bankName: 'Journey Bank', accountName: 'Journey Motors Ltd', accountNumber: '0123456789012', paybillNumber: '123456', mpesaPhone: '0712345678' } } });
check('owner saves banking details', put.status === 200 && put.j.success, put.j);
const after = await get(A);
check('read-back immediately after save shows the saved values (no stale cached blank)', after.j.settlement.bankName === 'Journey Bank' && after.j.settlement.paymentDetails.accountNumber === '0123456789012' && after.j.settlement.configured === true, after.j);
check('masked presentation fields never contain the full account number', after.j.settlement.bankAccountMasked.endsWith('9012') && !after.j.settlement.bankAccountMasked.includes('012345') && after.j.settlement.mpesaBusinessMasked.endsWith('3456'));
check('persisted in dealers.payment_details', JSON.parse(q(`select payment_details from dealers where "user"='${A.id}'`)).bankName === 'Journey Bank');
await A.raw('/api/v1/auth/logout', { method: 'POST' }); A.csrf = null;
const A2 = new Client(); await A2.raw('/api/v1/auth/login', { method: 'POST', body: { email: A.email, password: 'Str0ng!Passw0rd' } });
const relog = await get(A2);
check('after logout and re-login the details are still there', relog.j?.settlement?.bankName === 'Journey Bank' && relog.j.settlement.paymentDetails.mpesaPhone === '0712345678', relog.j);
const upd = await A2.raw('/api/dealer/settlement', { method: 'PUT', body: { bankName: 'Second Bank' } });
check('update merges (does not erase other fields) and read-back reflects it at once', upd.status === 200 && (await get(A2)).j.settlement.bankName === 'Second Bank' && (await get(A2)).j.settlement.paymentDetails.accountName === 'Journey Motors Ltd');
check('invalid paybill is rejected with a field error and nothing changes', (await A2.raw('/api/dealer/settlement', { method: 'PUT', body: { paymentDetails: { paybillNumber: '12' } } })).j?.errors?.paybillNumber && (await get(A2)).j.settlement.paymentDetails.paybillNumber === '123456');
check('clearing a field persists', (await A2.raw('/api/dealer/settlement', { method: 'PUT', body: { paymentDetails: { mpesaPhone: '' } } })).status === 200 && (await get(A2)).j.settlement.paymentDetails.mpesaPhone === '');
check("another dealer sees only their own (empty) details", (await get(B)).j.settlement.configured === false);
check('anonymous is refused', (await get(new Client())).status === 401);

// staff (every built-in role) can never read or change banking
for (const role of ['manager', 'finance_officer', 'sales_agent', 'lot_agent', 'viewer']) {
  const u = await makeUser({ tag: 'st' + role.slice(0, 3) });
  const inv = await A2.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: u.email, role } });
  const tok = crypto.randomBytes(32).toString('hex');
  q(`update dealer_teams set invite_token_hash='${crypto.createHash('sha256').update(tok).digest('hex')}' where invite_email='${u.email}'`);
  const acc = await u.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok } });
  const g = await get(u); const p = await u.raw('/api/dealer/settlement', { method: 'PUT', body: { bankName: 'Hacked' } });
  check(`staff role ${role}: cannot read or change banking (invite ${inv.status}, accept ${acc.status})`, inv.status === 201 && acc.status === 200 && [401, 403, 404].includes(g.status) && [401, 403, 404].includes(p.status) && !JSON.stringify(g.j).includes('Journey'), [g.status, p.status]);
}
check('banking unchanged after every staff attempt', (await get(A2)).j.settlement.bankName === 'Second Bank');
check('banking changes are audited without the values', Number(q(`select count(*) from audit_logs where action='update_settlement'`)) >= 3 && !q(`select string_agg(details::text,' ') from audit_logs where action='update_settlement'`).includes('0123456789012'));
finish('10_dealer_banking');
