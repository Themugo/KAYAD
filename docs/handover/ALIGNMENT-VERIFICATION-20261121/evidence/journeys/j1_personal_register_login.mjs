import {Client,q,PW,rec,results} from './lib.mjs';
const run=Date.now().toString(36);
async function mk(role,tag,extra={}){const c=new Client();const email=`${tag}-${run}@example.test`;
  const r=await c.raw('/api/v1/auth/register',{method:'POST',body:{name:'Journey '+tag,email,password:PW,role,...extra},headers:{'idempotency-key':'k'+crypto.randomUUID()}});
  q(`update users set email_verified=true where email='${email}'`);
  const l=await c.raw('/api/v1/auth/login',{method:'POST',body:{email,password:PW}});
  c.token=l.j?.token||l.j?.accessToken; c.email=email; c.reg=r; c.login=l; c.id=q(`select id from users where email='${email}'`); c.csrf=null; return c;}
const seller=await mk('user','seller'); const buyer=await mk('user','buyer');
rec('personal register 201 role=user',seller.reg.status===201&&q(`select role from users where id='${seller.id}'`)==='user',[seller.reg.status,seller.login.status,Object.keys(seller.login.j||{})]);
rec('login returns session (token or cookie)',seller.login.status===200,seller.login.status);
const me=await seller.raw('/api/v1/auth/me'); rec('/auth/me works for personal user',me.status===200,me.status);
console.log(JSON.stringify({seller:seller.id,buyer:buyer.id,loginKeys:Object.keys(seller.login.j||{}),cookies:Object.keys(seller.jar)}));
