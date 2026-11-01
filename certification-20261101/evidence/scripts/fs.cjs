const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for (const [route,w] of [['/login',390],['/forgot-password',390],['/reset-password',390],['/verify-email',390],['/login',1440]]){
 const p=await (await b.newContext({viewport:{width:w,height:800}})).newPage();
 await p.goto('http://127.0.0.1:4173'+route,{waitUntil:'load'}); await p.waitForTimeout(800);
 const r=await p.evaluate(()=>[...document.querySelectorAll('input:not([type=hidden])')].map(i=>({t:i.type,fs:getComputedStyle(i).fontSize,h:Math.round(i.getBoundingClientRect().height),cls:i.className.slice(0,40)})));
 console.log(route,w,JSON.stringify(r));}
await b.close();})();
