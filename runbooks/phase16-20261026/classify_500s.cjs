// Phase 16 - classify every HTTP 500 in a role-matrix probe. Each 500 route is re-called as an authorised admin while the backend log is
// tailed; the logged cause decides the class. A 500 is NOT treated as a security finding unless the cause is an authorisation failure.
const fs = require('fs');
const L = require('./e2e_lib.cjs');
const { call, sql } = L;
const ZERO = '00000000-0000-0000-0000-000000000000';
const [,, matrixPath, logPath, outPath, hostedPath] = process.argv;
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const hosted = hostedPath ? JSON.parse(fs.readFileSync(hostedPath, 'utf8')) : {};
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
(async () => {
  const u = await L.register('user', {}); await L.verifyEmailViaToken(u.email);
  u.id = u.id || sql(`select id from users where email='${u.email}'`);
  sql(`update users set role='admin', status='approved', email_verified=true where id='${u.id}'`);
  const jar = (await L.login(u.email)).jar;
  const rows = matrix.filter((r) => Object.values(r.status).includes(500));
  const out = [];
  for (const r of rows) {
    const path = r.path.replace(/:[A-Za-z_]+/g, ZERO);
    const before = fs.statSync(logPath).size;
    let status, bodyMsg = '';
    try { const rr = (await Promise.race([call(r.method, path, { jar, body: r.method !== 'GET' ? {} : undefined }), new Promise((_, j) => setTimeout(() => j(new Error('timeout')), 8000))])); status = rr.status; bodyMsg = JSON.stringify(rr.body || rr.json || '').slice(0, 200); } catch { status = 'ERR'; }
    await new Promise((res) => setTimeout(res, 150));
    const fd = fs.openSync(logPath, 'r'); const len = fs.statSync(logPath).size - before; const buf = Buffer.alloc(Math.max(len, 0)); fs.readSync(fd, buf, 0, len, before); fs.closeSync(fd);
    const text = strip(buf.toString('utf8')).replace(/\\"/g, '"');
    let cls = 'unclassified', detail = '';
    let m;
    if ((m = text.match(/relation "public\.([a-z_0-9]+)" does not exist/)) || (m = text.match(/Could not find the table 'public\.([a-z_0-9]+)'/))) { cls = 'missing_schema:table'; detail = m[1]; }
    else if ((m = text.match(/column "?([a-z_A-Z0-9."]+)"? (of relation "[a-z_]+" )?does not exist/)) || (m = text.match(/Could not find the '([^']+)' column/))) { cls = 'missing_schema:column'; detail = m[1]; }
    else if ((m = text.match(/function ([a-z_0-9.]+\([^)]*\)) does not exist/)) || (m = text.match(/Could not find the function ([^\s]+)/))) { cls = 'missing_schema:function'; detail = m[1]; }
    else if (/invalid input syntax for type uuid/.test(text)) { cls = 'invalid_fixture:non-uuid id'; }
    else if (/invalid input syntax|violates (check|foreign key|not-null|unique)/.test(text)) { cls = 'invalid_fixture:empty body / constraint'; detail = (text.match(/(invalid input syntax[^\n"]*|violates [^\n"]*)/) || [''])[0].slice(0, 120); }
    else if (status !== 500) { cls = 'not_reproduced'; detail = 'status ' + status; }
    else { const e = text.match(/(TypeError|ReferenceError|RangeError|Error):[^\n]{0,160}/); const msg = text.match(/ERROR: Server error[\s\S]{0,200}?message: "([^\n]*)"/); cls = 'application_exception'; detail = e ? e[0] : msg ? msg[1].slice(0, 160) : 'no logged cause; response ' + bodyMsg; }
    if (cls === 'missing_schema:table') detail += hosted[detail] === false ? ' (absent in hosted production too)' : hosted[detail] === true ? ' (EXISTS in hosted production - repository migration drift)' : '';
    out.push({ method: r.method, path: r.path, rolesWith500: Object.entries(r.status).filter(([, v]) => v === 500).map(([k]) => k), adminStatus: status, class: cls, detail });
  }
  fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
  const tally = {}; for (const o of out) tally[o.class] = (tally[o.class] || 0) + 1;
  console.log(rows.length, 'routes with a 500;', JSON.stringify(tally));
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(2); });
