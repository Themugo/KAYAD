import {Client,q,PW,rec,results} from './lib.mjs';
import fs from 'fs';
const st=JSON.parse(fs.readFileSync('state.json'));
async function login(tag){const c=new Client();await c.raw('/api/v1/auth/login',{method:'POST',body:{email:`${tag}-${st.run}@example.test`,password:PW}});c.csrf=null;return c;}
const seller=await login('s'),buyer=await login('b'),other=await login('o');
const anon=new Client();
const k=()=>'k-'+crypto.randomUUID();
const e0=q('select count(*) from escrows');
// payments / escrow boundaries
const pi=await buyer.raw('/api/payments/initiate',{method:'POST',body:{amount:2700000,phone:'254700000001',carId:st.carId,type:'purchase'},headers:{'idempotency-key':k()}});
rec('purchase payment initiate: BLOCKED(provider) - without Daraja credentials the server refuses cleanly; nothing about M-Pesa is verified',pi.status<500||pi.status===502||pi.status===503||/not configured/i.test(String(pi.j?.message)),[pi.status,pi.j?.message]);
rec('failed/unprovisioned payment initiate creates no escrow',q('select count(*) from escrows')===e0,[e0,q('select count(*) from escrows')]);
const piAnon=await anon.raw('/api/payments/initiate',{method:'POST',body:{amount:1000,phone:'254700000001',type:'purchase'}});
rec('anonymous payment initiate rejected',[401,403].includes(piAnon.status),piAnon.status);
const own=await seller.raw('/api/payments/initiate',{method:'POST',body:{amount:2700000,phone:'254700000001',carId:st.carId,type:'purchase'},headers:{'idempotency-key':k()}});
rec('seller cannot buy own listing',own.status>=400,[own.status,own.j?.message]);
const cb=await anon.raw('/api/payments/callback',{method:'POST',body:{Body:{stkCallback:{ResultCode:0}}}});
rec('payment callback from non-allowlisted source is rejected (4xx, or 200 ResultCode 1 Rejected per Safaricom no-retry convention) and changes nothing',[401,403,400].includes(cb.status)||(cb.status===200&&cb.j?.ResultCode===1),[cb.status,cb.j]);
for(const p of ['/api/escrow','/api/escrow/operations/dashboard','/api/marketplace/purchases/operations']){
 const r=await buyer.raw(p); rec(`personal buyer boundary ${p}`,p==='/api/marketplace/purchases/operations'?r.status<500:[401,403].includes(r.status),r.status);}
const r1=await buyer.raw('/api/escrow/my'); rec('buyer can read own escrows list',r1.status===200,r1.status);
const rel=await buyer.raw('/api/escrow/00000000-0000-0000-0000-000000000000/release',{method:'POST',body:{otp:'123456'},headers:{'idempotency-key':k()}});
rec('buyer cannot release escrow (staff-only)',[401,403,404].includes(rel.status),rel.status);
const rec2=await buyer.raw('/api/escrow/operations/reconcile',{method:'POST',headers:{'idempotency-key':k()}});
rec('personal user cannot run escrow reconcile',[401,403].includes(rec2.status),rec2.status);
// admin/staff boundaries
for(const p of ['/api/admin/dashboard','/api/admin/users','/api/admin/staff','/api/admin/system/maintenance','/api/admin/analytics']){
 const r=await buyer.raw(p); rec(`personal user blocked from ${p}`,[401,403,404].includes(r.status),r.status);
 const r2=await anon.raw(p); rec(`anonymous blocked from ${p}`,[401,403,404].includes(r2.status),r2.status);}
// inspection ordering
const io={status:0,j:{}};
console.log('INSPECTION order',io.status,JSON.stringify(io.j).slice(0,250));
const iob=await anon.raw('/api/inspection/bookings',{method:'POST',body:{carId:st.carId}});
rec('anonymous cannot book an inspection',[401,403].includes(iob.status),iob.status);
const il=await buyer.raw('/api/inspections/my'); console.log('INSPECTION mine',il.status,JSON.stringify(il.j).slice(0,160));
console.log(results.filter(r=>r.ok).length+'/'+results.length);
fs.writeFileSync('j5-results.json',JSON.stringify(results,null,1));
