import { execSync } from 'child_process';
const B=process.env.KAYAD_JOURNEY_BASE||'http://127.0.0.1:5055';
const _DB=process.env.KAYAD_JOURNEY_DB||'kayad_t';
if(!/^kayad_(t|ci|test|recon|journey)/.test(_DB)) throw new Error('Refusing to run against a non-disposable database');
const q=s=>execSync(`psql -h ${process.env.PGHOST||'127.0.0.1'} -p ${process.env.PGPORT||'54329'} -U ${process.env.PGUSER||'postgres'} -d ${_DB} -q -tAc "${s}"`).toString().trim();
async function session(){const r=await fetch(B+'/api/v1/auth/csrf');const j=await r.json();const ck=(r.headers.getSetCookie?.()||[]).map(c=>c.split(';')[0]).join('; ');return{ck,t:j.csrfToken};}
async function reg(s,body,key){const h={'content-type':'application/json','cookie':s.ck,'x-csrf-token':s.t,'x-xsrf-token':s.t};if(key)h['idempotency-key']=key;const r=await fetch(B+'/api/v1/auth/register',{method:'POST',headers:h,body:JSON.stringify(body)});let j={};try{j=await r.json()}catch{}return{status:r.status,j};}
const PW='Str0ng!Passw0rd', out=[]; const rec=(n,ok,d)=>{out.push({n,ok,d});console.log(ok?'PASS':'FAIL',n,d??'')};
const K=()=>'k'+crypto.randomUUID();
const s=await session();
let e='api-a@example.test',key=K();
let r1=await reg(s,{name:'Test User',email:e,password:PW,role:'user'},key);
rec('first attempt 201',r1.status===201,r1.status);
let r2=await reg(s,{name:'Test User',email:e,password:PW,role:'user'},key);
rec('same key+data replay -> 200 replayed, same user id',r2.status===200&&r2.j.replayed===true&&!!(r1.j.user?._id||r1.j.user?.id)&&(r2.j.user?._id||r2.j.user?.id)===(r1.j.user?._id||r1.j.user?.id),r2.status);
rec('replay creates no second user',q(`select count(*) from users where email='${e}'`)==='1');
rec('replay with different email CASE still same attempt',(await reg(s,{name:'Test User',email:'API-A@Example.Test',password:PW,role:'user'},key)).status===200);
rec('different key -> 409',(await reg(s,{name:'Test User',email:e,password:PW,role:'user'},K())).status===409);
rec('same key, different password -> 409',(await reg(s,{name:'Test User',email:e,password:PW+'x',role:'user'},key)).status===409);
rec('same key, role dealer without business -> not a replay',(await reg(s,{name:'Test User',email:e,password:PW,role:'dealer'},key)).status!==200);
rec('no key -> 409',(await reg(s,{name:'Test User',email:e,password:PW,role:'user'})).status===409);
rec('malformed key ignored -> 409',(await reg(s,{name:'Test User',email:e,password:PW,role:'user'},'short')).status===409);
// verified account never replays
q(`update users set email_verified=true where email='${e}'`);
rec('verified account + same key -> 409 (no replay)',(await reg(s,{name:'Test User',email:e,password:PW,role:'user'},key)).status===409,q(`select email_verified from users where email='${e}'`));
// concurrency
e='api-conc@example.test';key=K();
const rs=await Promise.all(Array.from({length:8},()=>reg(s,{name:'Test User',email:e,password:PW,role:'user'},key)));
const codes=rs.map(x=>x.status).sort().join(',');
rec('8 concurrent same-key -> 1 user, only 200/201',q(`select count(*) from users where email='${e}'`)==='1'&&rs.every(x=>[200,201].includes(x.status)),codes);
e='api-conc2@example.test';
const rs2=await Promise.all(Array.from({length:6},()=>reg(s,{name:'Test User',email:e,password:PW,role:'user'},K())));
rec('6 concurrent different keys -> exactly 1 created, rest 409',q(`select count(*) from users where email='${e}'`)==='1'&&rs2.filter(x=>x.status===201).length===1&&rs2.filter(x=>x.status===409).length===5,rs2.map(x=>x.status).sort().join(','));
// role escalation
for(const role of ['admin','super_admin','superadmin','broker','accounts']){const em=`esc-${role}@example.test`;const r=await reg(s,{name:'Test User',email:em,password:PW,role},K());rec(`role escalation '${role}' rejected, no account created`,r.status===400&&q(`select count(*) from users where email='${em}'`)==='0',r.status);}
{const ownerEmail=(process.env.WEBHOIST_EMAIL||'ci-owner@example.test').trim();const before=q(`select count(*) from users where lower(email)='${ownerEmail.toLowerCase()}'`);const r=await reg(s,{name:'Test User',email:ownerEmail.replace(/^./,(c)=>c.toUpperCase()),password:PW,role:'user'},K());rec('owner email cannot be registered (no new row, no replay)',[403,409].includes(r.status)&&q(`select count(*) from users where lower(email)='${ownerEmail.toLowerCase()}'`)===before,r.status);}
// no secrets in response
const rr=await reg(s,{name:'Test User',email:'api-leak@example.test',password:PW,role:'user'},K());
const txt=JSON.stringify(rr.j);const rawTok=ver0=>ver0;rec('response has no password, bcrypt hash, token fields or raw password',!txt.includes(PW)&&!txt.includes('$2')&&!/passwordHash|emailVerifyToken|resetToken|refreshToken|"token"/.test(txt));
const ver=q(`select email_verify_token from user_auth ua join users u on u.id=ua.user_id where u.email='api-leak@example.test'`);
rec('stored verify token is a sha256 hash (64 hex), not reversible raw',/^[0-9a-f]{64}$/.test(ver));
// csrf missing
const nr=await fetch(B+'/api/v1/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Test User',email:'api-nocsrf@example.test',password:PW})});
rec('no CSRF -> 403 and no user',nr.status===403&&q(`select count(*) from users where email='api-nocsrf@example.test'`)==='0',nr.status);
console.log(`\n${out.filter(o=>o.ok).length}/${out.length} passed`);process.exit(out.every(o=>o.ok)?0:1);
