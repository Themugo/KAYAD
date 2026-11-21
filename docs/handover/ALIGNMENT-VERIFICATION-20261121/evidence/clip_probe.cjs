const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();
await p.goto('http://127.0.0.1:4192/',{waitUntil:'networkidle'});await p.waitForTimeout(2500);
const r=await p.evaluate(()=>{const img=Array.from(document.querySelectorAll('img')).find(i=>/\/hero\//.test(i.currentSrc||i.src));if(!img)return{noHeroImg:true,imgs:Array.from(document.querySelectorAll('img')).slice(0,6).map(i=>i.currentSrc.slice(-50))};const ib=img.getBoundingClientRect();let el=img.parentElement,chain=[];while(el&&el!==document.body){const cs=getComputedStyle(el),rc=el.getBoundingClientRect();if(/hidden|clip/.test(cs.overflow+cs.overflowY))chain.push({cls:el.className.toString().slice(0,50),top:Math.round(rc.top),bottom:Math.round(rc.bottom),h:Math.round(rc.height),ov:cs.overflowY,maxH:cs.maxHeight});el=el.parentElement}
const ill=Array.from(document.querySelectorAll('*')).find(e=>e.children.length<4&&/ILLUSTRATIVE/i.test(e.innerText||'')&&(e.innerText||'').length<200);const lb=ill&&ill.getBoundingClientRect();
const chips=document.querySelector('[aria-label="Vehicle categories"]').getBoundingClientRect();
return{imgTop:Math.round(ib.top),imgBottom:Math.round(ib.bottom),imgOpacity:getComputedStyle(img).opacity,illTop:lb&&Math.round(lb.top),illBottom:lb&&Math.round(lb.bottom),chipsTop:Math.round(chips.top),clippingAncestors:chain}});
console.log(JSON.stringify(r,null,1));await b.close();})();
