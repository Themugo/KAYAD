import {Client,q,PW,rec,results} from './lib.mjs';
import fs from 'fs';
const run=Date.now().toString(36);
async function mk(role,tag,sqlRole){const c=new Client();const email=`${tag}-${run}@example.test`;
  const r=await c.raw('/api/v1/auth/register',{method:'POST',body:{name:'Journey '+tag,email,password:PW,role},headers:{'idempotency-key':'k'+crypto.randomUUID()}});
  q(`update users set email_verified=true${sqlRole?`, role='${sqlRole}'`:''} where email='${email}'`);
  const l=await c.raw('/api/v1/auth/login',{method:'POST',body:{email,password:PW}});
  c.id=q(`select id from users where email='${email}'`); c.csrf=null; c.l=l; return c;}
const seller=await mk('user','s'), buyer=await mk('user','b'), admin=await mk('user','a','admin');
rec('admin fixture login',admin.l.status===200,admin.l.status);
// J-LIST: personal seller creates listing
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
const fd=new FormData();
for(const [k,v] of Object.entries({title:'Toyota Harrier Journey',brand:'Toyota',model:'Harrier',year:'2018',price:'3200000',mileage:'60000',fuel:'Petrol',transmission:'Automatic',city:'Nairobi',description:'Journey test listing',allowBuy:'true'}))fd.append(k,v);
fd.append('images',new Blob([png],{type:'image/png'}),'a.png');
const cr=await seller.raw('/api/cars',{method:'POST',form:fd});
rec('personal seller can create listing (no application/approval)',[200,201].includes(cr.status),[cr.status,cr.j?.message||cr.j?.code]);
const carId=cr.j?.car?._id||cr.j?.car?.id||cr.j?.data?.id;
const st=carId?q(`select status from cars where id='${carId}'`):'';
rec('new personal listing publishes immediately (Phase 3C contract: status available, no approval)',st==='available',st);
if(carId){
 const pub0=await new Client().raw('/api/cars?limit=50'); const ids0=JSON.stringify(pub0.j);
 rec('published personal listing is in the public list',ids0.includes(carId),pub0.status);
 const buyerMod=await buyer.raw(`/api/admin/cars/${carId}/moderate`,{method:'POST',body:{action:'approve'}});
 rec('non-staff cannot moderate',[401,403].includes(buyerMod.status),buyerMod.status);
 const sellerMod=await seller.raw(`/api/admin/cars/${carId}/moderate`,{method:'POST',body:{action:'approve'}});
 rec('listing owner cannot self-approve',[401,403].includes(sellerMod.status),sellerMod.status);
 const mod=await admin.raw(`/api/admin/cars/${carId}/moderate`,{method:'POST',body:{action:'approve'}});
 rec('non-owner admin cannot decide a listing (owner-only by default: DECISION_AUTHORITY_REQUIRED)',mod.status===403&&mod.j?.code==='DECISION_AUTHORITY_REQUIRED',[mod.status,mod.j?.code,mod.j?.message]);
 const st2=q(`select status from cars where id='${carId}'`);
 rec('approved listing status available',st2==='available',st2);
 const pub=await new Client().raw('/api/cars?limit=50');
 rec('approved listing visible publicly',JSON.stringify(pub.j).includes(carId),pub.status);
 // J-ENQ: buyer starts chat/enquiry
 const ch=await buyer.raw('/api/chat',{method:'POST',body:{recipientId:seller.id,carId,message:'Is it still available?'}});
 rec('buyer starts enquiry/chat on listing',[200,201].includes(ch.status),[ch.status,ch.j?.message,ch.j?.code]);
 const own=await seller.raw('/api/chat',{method:'POST',body:{recipientId:seller.id,carId,message:'self'}});
 rec('seller cannot enquire on own listing',own.status>=400,own.status);
 const lead=q(`select id from leads where vehicle='${carId}' limit 1`)||q(`select id from leads order by created_at desc limit 1`);
 console.log('lead',lead, JSON.stringify(ch.j).slice(0,300));
 fs.writeFileSync('state.json',JSON.stringify({carId,lead,seller:seller.id,buyer:buyer.id,run}));
}
console.log(results.filter(r=>r.ok).length+'/'+results.length);
