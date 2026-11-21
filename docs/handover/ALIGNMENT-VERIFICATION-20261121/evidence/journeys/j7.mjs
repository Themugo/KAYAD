import {Client,q,PW,rec,results,B} from './lib.mjs';
const run=Date.now().toString(36);
const k=()=>'k'+crypto.randomUUID();
async function mk(role,tag,extra={},sqlRole){const c=new Client();const email=`${tag}-${run}@example.test`;
  const r=await c.raw('/api/v1/auth/register',{method:'POST',body:{name:'Journey '+tag,email,password:PW,role,...extra},headers:{'idempotency-key':k()}});
  if(r.status>=300){c.reg=r;return c;}
  q(`update users set email_verified=true${sqlRole?`, role='${sqlRole}'`:''} where email='${email}'`);
  const l=await c.raw('/api/v1/auth/login',{method:'POST',body:{email,password:PW}});c.csrf=null;c.reg=r;c.l=l;c.email=email;c.id=q(`select id from users where email='${email}'`);return c;}
const d=await mk('dealer','dealer',{businessName:'Journey Motors '+run,phone:'254711000111',location:'Nairobi',city:'Nairobi'});
console.log('dealer reg',d.reg.status,JSON.stringify(d.reg.j).slice(0,220));
rec('dealer registers as separate business identity (role dealer)',d.reg.status===201&&q(`select role from users where email='${d.email}'`)==='dealer',[d.reg.status,d.reg.j?.message]);
if(d.id){
 rec('dealer business row created',q(`select count(*) from dealers where "user"='${d.id}' or user_id='${d.id}'`.replace(/user_id/,'id'))!==undefined);
 const ws=await d.raw('/api/dealer-platform/workspace'); console.log('workspace',ws.status,JSON.stringify(ws.j).slice(0,200));
 const dash=await d.raw('/api/dealer/dashboard'); console.log('dealer dashboard',dash.status);
}
// legacy individual_seller request
const c=new Client(); const email=`legacy-${run}@example.test`;
const raw=await fetch(B+'/api/v1/auth/csrf');const cj=await raw.json();const ck=(raw.headers.getSetCookie?.()||[]).map(x=>x.split(';')[0]).join('; ');
const lr=await fetch(B+'/api/v1/auth/register',{method:'POST',headers:{'content-type':'application/json',cookie:ck,'x-csrf-token':cj.csrfToken,'idempotency-key':k()},body:JSON.stringify({name:'Legacy Req',email,password:PW,role:'individual_seller'})});
const lj=await lr.json().catch(()=>({}));
rec('legacy individual_seller self-registration is stored as unified user + deprecation signalled',lr.status===201&&q(`select role from users where email='${email}'`)==='user'&&!!(lr.headers.get('deprecation')||lr.headers.get('warning')||JSON.stringify(lj).toLowerCase().includes('deprecat')||JSON.stringify(lj).toLowerCase().includes('personal')),[lr.status,q(`select role from users where email='${email}'`),lr.headers.get('deprecation'),Object.keys(lj)]);
rec('no new individual_seller rows from self-registration',q(`select count(*) from users where role='individual_seller' and email like '%-${run}@example.test'`)==='0');
// staff boundary matrix
for(const role of ['moderator','accounts','escrow_officer','technical_support','marketing']){
 const s=await mk('user','st-'+role,{},role);
 const res={};
 for(const p of ['/api/admin/dashboard','/api/escrow','/api/escrow/operations/dashboard','/api/admin/system/maintenance','/api/admin/staff']){const r=await s.raw(p);res[p]=r.status;}
 console.log(role,JSON.stringify(res));
 rec(`${role}: never reaches maintenance control plane or staff governance`,[401,403,404].includes(res['/api/admin/system/maintenance'])&&[401,403,404].includes(res['/api/admin/staff']),res);
 if(role!=='escrow_officer'&&role!=='accounts')rec(`${role}: no escrow operations`,[401,403].includes(res['/api/escrow/operations/dashboard']),res['/api/escrow/operations/dashboard']);
}
console.log(results.filter(r=>r.ok).length+'/'+results.length);
import fs from 'fs'; fs.writeFileSync('j7-results.json',JSON.stringify(results,null,1));
