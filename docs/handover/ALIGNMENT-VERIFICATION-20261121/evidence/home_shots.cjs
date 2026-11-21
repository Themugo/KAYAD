const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch();const out=[];
for(const [name,vp,mobile] of [['desktop',{width:1440,height:900},false],['tablet',{width:820,height:1100},false],['mobile390',{width:390,height:844},true],['mobile360',{width:360,height:780},true]]){
 const c=await b.newContext({viewport:vp,isMobile:mobile,hasTouch:mobile});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,100)));
 await p.goto('http://127.0.0.1:4192/',{waitUntil:'networkidle'});await p.waitForTimeout(1500);
 const info=await p.evaluate(()=>({overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth,shortcuts:['Find a Car','Sell a Car','Auctions','Verified'].map(t=>!!Array.from(document.querySelectorAll('button,a')).find(e=>(e.innerText||'').trim()===t)),chips:Array.from(document.querySelectorAll('[aria-label="Vehicle categories"] button')).map(e=>e.innerText.trim()),bigCtas:Array.from(document.querySelectorAll('button,a')).filter(e=>/Explore Vehicles|Sell Your Vehicle/i.test(e.innerText||'')).length}));
 await p.screenshot({path:`/home/claude/align/shots/main-home-${name}.png`});out.push({name,...info,pageErrors:errs});await c.close();}
console.log(JSON.stringify(out,null,1));await b.close();})();
