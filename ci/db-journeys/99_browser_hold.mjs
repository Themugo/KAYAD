// Seeds a disposable database for BROWSER testing (responsive / dark / accessibility) and keeps the stack alive.
// No-op unless KAYARD_BROWSER_HOLD=<seconds> is set, so the normal gate never blocks on it. Writes out/browser-seed.json
// (example.test accounts only, disposable password).
import fs from 'node:fs';
import crypto from 'node:crypto';
import { makeUser, q, uid, PW } from './lib.mjs';
const hold = Number(process.env.KAYARD_BROWSER_HOLD || 0);
if (!hold) { console.log('99_browser_hold: skipped (KAYARD_BROWSER_HOLD not set)'); process.exit(0); }
const mkDealer = async (tag) => { const d = await makeUser({ tag, role: 'dealer', extra: { businessName: `Browser ${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } }); q(`update users set status='approved' where id='${d.id}'`); q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${d.id}'`); return d; };
const dealer = await mkDealer('bdealer');
const personal = await makeUser({ tag: 'bpersonal' });
const buyer = await makeUser({ tag: 'bbuyer' });
for (let i = 1; i <= 4; i++) q(`insert into cars(title,brand,model,year,price,status,dealer_id,sold,images) values ('Browser car ${i}','Toyota','Prado',201${i},${3000000 + i * 100000},'available','${dealer.id}',false,'[]'::jsonb)`);
const roles = {};
for (const r of ['viewer', 'sales_agent', 'finance_officer', 'manager']) {
  const u = await makeUser({ tag: 'b' + r.slice(0, 5) });
  await dealer.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: u.email, role: r } });
  const tok = crypto.randomBytes(32).toString('hex');
  q(`update dealer_teams set invite_token_hash='${crypto.createHash('sha256').update(tok).digest('hex')}' where invite_email='${u.email}'`);
  await u.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok } });
  roles[r] = u.email;
}
fs.writeFileSync(new URL('./out/browser-seed.json', import.meta.url), JSON.stringify({ password: PW, dealer: dealer.email, personal: personal.email, buyer: buyer.email, team: roles }, null, 1));
console.log('seeded; holding for', hold, 's');
await new Promise((r) => setTimeout(r, hold * 1000));
process.exit(0);
