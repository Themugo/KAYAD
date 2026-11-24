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
const IMG = ['/hero/kayad-prado.png', '/hero/kayad-mercedes-gle-clean.png', '/hero/kayad-land-cruiser-clean.png', '/hero/kayad-mercedes-gle.png', '/hero/kayad-land-cruiser.png', '/hero/kayad-prado.png', '/hero/kayad-mercedes-gle-clean.png', '/hero/kayad-land-cruiser-clean.png'];
const CARS = [['2020 Mazda CX-5', 'Mazda', 'CX-5', 2020, 1900000, 124000, 'Diesel', 'Automatic', 'Kiambu Rd'], ['2016 Land Cruiser V8', 'Toyota', 'Land Cruiser', 2016, 3500000, 165000, 'Petrol', 'Automatic', 'Nairobi'],
  ['2019 Toyota Prado TX-L Executive Edition With Sunroof And Full Leather Package Extended Name For Testing', 'Toyota', 'Prado', 2019, 98500000, 88000, 'Diesel', 'Automatic', 'Westlands, Nairobi'], ['2018 Mercedes GLE', 'Mercedes', 'GLE', 2018, 6200000, 54000, 'Petrol', 'Automatic', 'Karen'],
  ['2015 Toyota Fielder', 'Toyota', 'Fielder', 2015, 890000, 142000, 'Petrol', 'Automatic', 'Mombasa'], ['2021 Land Cruiser 300', 'Toyota', 'Land Cruiser', 2021, 21000000, 12000, 'Diesel', 'Automatic', 'Nairobi'], ['2017 Subaru Forester', 'Subaru', 'Forester', 2017, 2100000, 98000, 'Petrol', 'CVT', 'Nakuru'], ['2014 Nissan X-Trail', 'Nissan', 'X-Trail', 2014, 1250000, 160000, 'Petrol', 'Automatic', 'Eldoret']];
CARS.forEach(([t, b, m, y, price, km, fuel, tr, city], i) => q(`insert into cars(title,brand,model,year,price,mileage,fuel,transmission,location_city,status,approved,dealer_id,sold,images) values ('${t.replace(/'/g, "''")}','${b}','${m}',${y},${price},${km},'${fuel}','${tr}','${city}','available',true,'${dealer.id}',false,'[{"url":"${IMG[i]}","publicId":"p${i}"},{"url":"${IMG[(i + 1) % 8]}","publicId":"q${i}"}]'::jsonb)`));
const roles = {};
for (const r of ['viewer', 'sales_agent', 'finance_officer', 'manager']) {
  const u = await makeUser({ tag: 'b' + r.slice(0, 5) });
  await dealer.raw('/api/dealer-platform/team/invite', { method: 'POST', body: { email: u.email, role: r } });
  const tok = crypto.randomBytes(32).toString('hex');
  q(`update dealer_teams set invite_token_hash='${crypto.createHash('sha256').update(tok).digest('hex')}' where invite_email='${u.email}'`);
  await u.raw('/api/dealer-platform/team/accept', { method: 'POST', body: { token: tok } });
  roles[r] = u.email;
}
// Platform staff identities for admin-console browser checks (disposable, example.test only). The Super Admin is the configured owner identity.
const sadm = await makeUser({ tag: 'badmin', dbRole: 'superadmin' });
q(`update users set email='prev-owner-'||id||'@example.test' where email='ci-owner@example.test'`);
q(`update users set email='ci-owner@example.test', name='James Mugo' where id='${sadm.id}'`);
const moderator = await makeUser({ tag: 'bmod', dbRole: 'moderator' });
const platform = { superadmin: 'ci-owner@example.test', moderator: moderator.email };
fs.writeFileSync(new URL('./out/browser-seed.json', import.meta.url), JSON.stringify({ password: PW, dealer: dealer.email, personal: personal.email, buyer: buyer.email, team: roles, platform }, null, 1));
console.log('seeded; holding for', hold, 's');
await new Promise((r) => setTimeout(r, hold * 1000));
process.exit(0);
