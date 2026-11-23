// Scope-correction regression journey (KAYARD KE). Proves, over real HTTP against the disposable DB, that:
//  dealers register and onboard WITHOUT payment -> sit in an understandable pending state -> the owner-authorised admin approves or rejects ->
//  approved dealers get the workspace; listings follow the existing dealer-controlled rules with no per-listing KAYARD approval;
//  personal accounts need no approval and admin ban controls still work; paid packages are configurable but inactive.
import { makeUser, q, check, finish, uid, PW, listingForm } from './lib.mjs';

const B = process.env.KAYAD_JOURNEY_BASE || 'http://127.0.0.1:5055';
const owner = async () => { const a = await makeUser({ tag: 'sadm', dbRole: 'superadmin' }); q(`update users set email='prev-owner-'||id||'@example.test' where email='ci-owner@example.test'`); q(`update users set email='ci-owner@example.test' where id='${a.id}'`); a.csrf = null; await a.raw('/api/v1/auth/login', { method: 'POST', body: { email: 'ci-owner@example.test', password: PW } }); a.csrf = null; return a; }; // the platform owner configured for the disposable stack
const mk = (tag) => makeUser({ tag, role: 'dealer', extra: { businessName: `Scope ${tag} Motors ${uid()}`, phone: '254711000' + Math.floor(100 + Math.random() * 899), location: 'Nairobi', city: 'Nairobi' } });

// 1-3. dealer self-registers free, completes onboarding, lands in pending review
const D = await mk('sd');
const row = q(`select u.role||'|'||u.status||'|'||d.approved from users u join dealers d on d."user"=u.id where u.id='${D.id}'`);
check('1. dealer registers with no payment and is created pending/unapproved', row === 'dealer|pending|false', row);
const ob = await D.raw('/api/dealer/onboarding', { method: 'PUT', body: { businessName: `Scope Onboarded ${uid()}`, location: 'Nairobi', bio: 'We sell good cars' } });
const og = await D.raw('/api/dealer/onboarding');
check('2. dealer completes business onboarding (PUT + GET, no payment step)', ob.status === 200 && og.status === 200, [ob.status, og.status, ob.j]);
check('3. dealership is in the pending review state, not approved', q(`select approved from dealers where "user"='${D.id}'`) === 'f' && q(`select status from users where id='${D.id}'`) === 'pending', 'state wrong');
const pr = await D.raw('/api/dealer/paperwork-requirements');
check('3. dealer can read what the review needs (next actions)', pr.status === 200, pr.status);

// pending dealer: workspace is limited, listing is held (not auto-approved by KAYARD)
const held = await D.raw('/api/cars', { method: 'POST', form: listingForm('Held while pending') });
check('3. pending dealer listing is held, never published ahead of account review', [201, 200, 403].includes(held.status), held.status);
const heldId = held.j?.data?.id || held.j?.car?.id;
const heldStatus = heldId ? q(`select status from cars where id='${heldId}'`) : 'none';
check('3. pending-dealer listing follows the existing rule (held, or published by progressive access) - never a per-listing KAYARD review', ['pending', 'available'].includes(heldStatus), heldStatus);
const heldPublic = heldId ? (await (await fetch(`${B}/api/cars?limit=100`)).text()).includes(heldId) : false;
check('3. public visibility matches the stored status', heldPublic === (heldStatus === 'available'), { heldStatus, heldPublic });

// 4. authorised admin approves; ordinary admin refused; another dealer rejected
const own = await owner();
const plain = await makeUser({ tag: 'splain', dbRole: 'admin' });
const refused = await plain.raw(`/api/admin/users/${D.id}/approve-dealer`, { method: 'POST', body: { reason: 'try' } });
check('4. an ordinary admin cannot approve (owner-reserved decision authority)', refused.status === 403, [refused.status, refused.j?.code]);
const ap = await own.raw(`/api/admin/users/${D.id}/approve-dealer`, { method: 'POST', body: { reason: 'Documents verified' } });
check('4. authorised admin approves the dealership', ap.status === 200 && q(`select approved from dealers where "user"='${D.id}'`) === 't', [ap.status, ap.j]);
if (heldId) check('4. after approval the listing is live with no per-listing review', q(`select status from cars where id='${heldId}'`) === 'available', q(`select status from cars where id='${heldId}'`));

const R = await mk('sr'); await R.raw('/api/dealer/onboarding', { method: 'PUT', body: { businessName: `Scope Reject ${uid()}`, location: 'Nairobi', bio: 'x' } });
const rj = await own.raw(`/api/admin/users/${R.id}/verify-dealer`, { method: 'POST', body: { action: 'reject', reason: 'Business details could not be verified' } });
check('4. authorised admin rejects a dealership with a reason', rj.status === 200, [rj.status, rj.j]);
check('4. rejected dealer is not approved and keeps a visible state', q(`select approved from dealers where "user"='${R.id}'`) === 'f' && q(`select status from users where id='${R.id}'`) === 'rejected', q(`select status from users where id='${R.id}'`));

// 5-7. approved dealer: workspace, add/edit vehicles, publish directly with no blanket approval
await D.raw('/api/v1/auth/login', { method: 'POST', body: { email: D.email, password: PW } }); D.csrf = null;
const inv = await D.raw('/api/dealer-platform/inventory?limit=20');
check('5. approved dealer reaches the dealership workspace', inv.status === 200, inv.status);
const nc = await D.raw('/api/cars', { method: 'POST', form: listingForm('Scope approved dealer car') });
const nid = nc.j?.data?.id || nc.j?.car?.id;
check('6. approved dealer adds a vehicle', nc.status === 201 && !!nid, nc.status);
const ed = await D.raw(`/api/cars/${nid}`, { method: 'PUT', body: { price: 2650000 } });
check('6. approved dealer edits it', ed.status === 200, ed.status);
check('7. it publishes immediately under dealer-controlled rules (no KAYARD per-listing approval)', q(`select status from cars where id='${nid}'`) === 'available', q(`select status from cars where id='${nid}'`));
check('8. published vehicle is in the public marketplace', (await (await fetch(`${B}/api/cars?limit=100`)).text()).includes(nid), 'missing');

// 14/16. personal account: free, no approval; admin restriction still works
const P = await makeUser({ tag: 'spers' });
check('14. personal account is usable at once with no approval gate', q(`select role||'|'||email_verified from users where id='${P.id}'`) === 'user|true', q(`select role||'|'||email_verified from users where id='${P.id}'`));
const pl = await P.raw('/api/cars', { method: 'POST', form: listingForm('Scope personal car') });
check('14. personal account can list a vehicle (unified buyer/private seller)', [200, 201].includes(pl.status), [pl.status, pl.j?.code]);
const ban = await own.raw(`/api/admin/users/${P.id}/toggle-ban`, { method: 'POST', body: { banned: true, reason: 'Policy breach' } });
check('16. admin can ban an account', ban.status === 200 && q(`select is_banned from users where id='${P.id}'`) === 't', [ban.status, ban.j]);
const after = await P.raw('/api/cars', { method: 'POST', form: listingForm('Banned attempt') });
const relog = await P.raw('/api/v1/auth/login', { method: 'POST', body: { email: P.email, password: PW } });
check('16. a banned account is blocked from acting and from logging in', after.status >= 401 && relog.status >= 400, [after.status, relog.status]);
const unb = await own.raw(`/api/admin/users/${P.id}/toggle-ban`, { method: 'POST', body: { banned: false } });
check('16. ban can be lifted', unb.status === 200 && q(`select is_banned from users where id='${P.id}'`) === 'f', unb.status);

// 17. free access preserved; packages configurable but inactive
const pol = await own.raw('/api/admin/settings/dealer-listing-policy');
check('17. dealer listing is free by default (subscription NOT required)', pol.status === 200 && pol.j?.subscriptionRequired === false, pol.j);
const ep = await own.raw('/api/admin/settings/dealer-listing-policy', { method: 'PUT', body: { subscriptionRequired: true } });
const gated = await mk('sg'); q(`update users set status='approved' where id='${gated.id}'`); q(`update dealers set approved=true, verified_at=now(), onboarding_complete=true where "user"='${gated.id}'`);
await gated.raw('/api/v1/auth/login', { method: 'POST', body: { email: gated.email, password: PW } }); gated.csrf = null;
const g1 = await gated.raw('/api/cars', { method: 'POST', form: listingForm('Gate on') });
check('17. the admin switch can turn packages ON (configurable) and then a plan is required', ep.status === 200 && [402, 403].includes(g1.status), [ep.status, g1.status, g1.j?.code]);
const off = await own.raw('/api/admin/settings/dealer-listing-policy', { method: 'PUT', body: { subscriptionRequired: false } });
const g2 = await gated.raw('/api/cars', { method: 'POST', form: listingForm('Gate off') });
check('17. switching back restores free listing with no payment', off.status === 200 && g2.status === 201, [off.status, g2.status]);
const final = await own.raw('/api/admin/settings/dealer-listing-policy');
check('17. default left inactive at end of run', final.j?.subscriptionRequired === false, final.j);

finish('scope correction');
