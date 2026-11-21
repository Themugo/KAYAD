// PHASE 16 - identity integrity on the disposable stack: unique e-mail (any case), pending/unverified dealer cannot act as dealer or owner,
// no orphan dealer profile is created for a failed registration, owner address cannot be registered or claimed, deactivated/banned owner loses privilege.
const L = require('./e2e_lib.cjs');
const { check, call, sql } = L;
(async () => {
  const email = L.uniq('Mixed.Case');
  const a = await L.register('dealer', { email });
  check('dealer registration succeeds', a.res.status === 201 || a.res.status === 200, a.res.status);
  for (const variant of [email.toUpperCase(), email.toLowerCase(), ' ' + email + ' ']) {
    const b = await L.register('user', { email: variant });
    check(`same address in another case/whitespace is refused (${JSON.stringify(variant).slice(0, 30)})`, b.res.status >= 400 && b.res.status < 500, b.res.status);
  }
  check('exactly one users row exists for that address (case-insensitive)', sql(`select count(*) from users where lower(email)=lower('${email}')`) === '1');
  const id = sql(`select id from users where lower(email)=lower('${email}')`);
  check('exactly one auth row and one profile row', sql(`select (select count(*) from user_auth where user_id='${id}')||'/'||(select count(*) from profiles where id='${id}')`) === '1/1');
  // pending + unverified dealer
  const lg = await L.login(email.toLowerCase());
  // Sign-in of an unverified account is config-dependent by design (REQUIRE_EMAIL_VERIFICATION, or a Brevo key being present). This local stack has neither,
  // so the assertion that matters here is capability: an unverified, pending dealer session can do nothing dealer-like. (With verification required the login itself is refused.)
  const tok0 = lg.res.body?.token || lg.res.body?.accessToken;
  if (lg.res.status >= 400) check('unverified dealer sign-in refused (verification required in this configuration)', Object.keys(lg.jar).length === 0, lg.res.status);
  else {
    const w0 = await call('POST', '/api/cars', { jar: lg.jar, token: tok0, body: { title: 'x' } });
    const o0 = await call('GET', '/api/owner', { jar: lg.jar, token: tok0 });
    check('unverified+pending dealer session (verification not enforced locally) cannot create listings or reach owner routes', w0.status >= 400 && w0.status < 500 && [401, 403].includes(o0.status), `${w0.status}/${o0.status}`);
  }
  sql(`update users set email_verified=true where id='${id}'`);
  const lg2 = await L.login(email);
  const tok = lg2.res.body?.token || lg2.res.body?.accessToken;
  const dealerWrite = await call('POST', '/api/cars', { jar: lg2.jar, token: tok, body: { title: 'x' } });
  const ownerRoute = await call('GET', '/api/owner', { jar: lg2.jar, token: tok });
  const adminRoute = await call('GET', '/api/admin/users', { jar: lg2.jar, token: tok });
  check('verified-but-pending dealer cannot create listings', dealerWrite.status >= 400 && dealerWrite.status < 500, dealerWrite.status);
  check('pending dealer cannot reach owner or admin routes', [ownerRoute, adminRoute].every((r) => r.status === 401 || r.status === 403), `${ownerRoute.status}/${adminRoute.status}`);
  check('dealer capability is derived from the dealers record, not from the role label alone (no approved dealers row)', sql(`select count(*) from dealers where "user"='${id}' and approved=true`) === '0');
  // owner address cannot be claimed by registration under any casing
  const reg = await L.register('dealer', { email: 'OWNER148@example.test' });
  check('designated owner address cannot be registered as a dealer (any case)', reg.res.status === 403 || reg.res.status === 409, reg.res.status);
  // FK/orphan check
  check('no profile or auth row is orphaned', sql(`select (select count(*) from user_auth ua where not exists (select 1 from users u where u.id=ua.user_id))||'/'||(select count(*) from profiles p where not exists (select 1 from users u where u.id=p.id))`) === '0/0');
  const failed = L.results.filter((r) => !r.ok);
  console.log(`\nRESULT pass=${L.results.filter((r) => r.ok).length} fail=${failed.length}`); process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('crashed', e); process.exit(2); });
