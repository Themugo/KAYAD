import {Client,q,PW} from './lib.mjs';
const run=Date.now().toString(36);const c=new Client();const email=`eo-${run}@example.test`;
await c.raw('/api/v1/auth/register',{method:'POST',body:{name:'EO',email,password:PW,role:'user'},headers:{'idempotency-key':'k'+crypto.randomUUID()}});
q(`update users set email_verified=true, role='escrow_officer' where email='${email}'`);
await c.raw('/api/v1/auth/login',{method:'POST',body:{email,password:PW}});c.csrf=null;
const r=await c.raw('/api/escrow/operations/dashboard');console.log(r.status,JSON.stringify(r.j));
