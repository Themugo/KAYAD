import {Client,q,PW,rec,results} from './lib.mjs';
const run=Date.now().toString(36);
const k=()=>'k'+crypto.randomUUID();
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
function form(t){const fd=new FormData();for(const [a,b] of Object.entries({title:t,brand:'Subaru',model:'Forester',year:'2017',price:'2100000',mileage:'80000',fuel:'Petrol',transmission:'Automatic',city:'Mombasa',description:'x',allowBuy:'true'}))fd.append(a,b);fd.append('images',new Blob([png],{type:'image/png'}),'a.png');return fd;}
async function mk(role,tag,extra={},sql=''){const c=new Client();const email=`${tag}-${run}@example.test`;
  await c.raw('/api/v1/auth/register',{method:'POST',body:{name:'J '+tag,email,password:PW,role,...extra},headers:{'idempotency-key':k()}});
  q(`update users set email_verified=true${sql} where email='${email}'`);
  const l=await c.raw('/api/v1/auth/login',{method:'POST',body:{email,password:PW}});c.csrf=null;c.l=l;c.email=email;c.id=q(`select id from users where email='${email}'`);return c;}
// legacy individual_seller record preserved
const leg=await mk('user','legacy',{},", role='individual_seller'");
rec('legacy individual_seller record can still log in',leg.l.status===200,leg.l.status);
const me=await leg.raw('/api/v1/auth/me'); rec('legacy record still resolves via /auth/me and keeps its stored role',me.status===200&&q(`select role from users where id='${leg.id}'`)==='individual_seller',[me.status]);
const cap=await leg.raw('/api/account/capabilities'); rec('legacy record maps onto unified personal capabilities',cap.status===200&&cap.j?.data?.personal?.granted===true,[cap.status,JSON.stringify(cap.j?.data?.personal)]);
const lc=await leg.raw('/api/cars',{method:'POST',form:form('Legacy seller car')}); rec('legacy seller can still publish a listing',lc.status===201,[lc.status,lc.j?.message]);
// dealer pending verification
const d=await mk('dealer','dealer2',{businessName:'J Motors '+run,phone:'254711000222',location:'Nairobi',city:'Nairobi'});
const dc=await d.raw('/api/cars',{method:'POST',form:form('Dealer car')});
console.log('dealer create',dc.status,JSON.stringify(dc.j).slice(0,200));
rec('dealer pending verification: listing create handled (201 self-service per product copy, or clean 4xx)',dc.status===201||(dc.status>=400&&dc.status<500),[dc.status,dc.j?.code||dc.j?.message]);
// a personal user must not reach dealer-only inventory
const p=await mk('user','pers2');
const dd=await p.raw('/api/dealer/dashboard'); rec('personal user blocked from dealer dashboard',[401,403].includes(dd.status),dd.status);
console.log(results.filter(r=>r.ok).length+'/'+results.length);
import fs from 'fs'; fs.writeFileSync('j10-results.json',JSON.stringify(results,null,1));
