const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for (const r of ['/dashboard','/profile','/dealer','/dealer/onboarding','/admin','/admin/users','/admin/staff','/admin/panic-room','/notifications']) {
  const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  const net=[]; p.on('response',x=>{const u=new URL(x.url()); if(u.port!=='4173') net.push(x.status()+' '+u.hostname+u.pathname.slice(0,30));});
  await p.goto('http://127.0.0.1:4173'+r,{waitUntil:'load'}); await p.waitForTimeout(4000);
  const t=await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').trim().slice(0,170));
  console.log(r.padEnd(20), '=>', new URL(p.url()).pathname.padEnd(18), '|', t, '| ext:', [...new Set(net)].slice(0,3).join(','));
  if (r==='/admin/users') await p.screenshot({path:'/home/claude/work/evidence/gate-admin-users.png'});
}
await b.close();})();
