const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch();
for (const [w,h] of [[360,740],[390,844],[430,932],[600,900],[820,1180],[1024,768],[1440,900]]){
 const c=await b.newContext({viewport:{width:w,height:h},isMobile:w<800,hasTouch:w<800});const p=await c.newPage();
 await p.goto('http://127.0.0.1:<PORT>/',{waitUntil:'networkidle'});await p.waitForTimeout(2000);
 const r=await p.evaluate(()=>{const hero=document.querySelector('[data-testid="premium-hero"]').getBoundingClientRect();
  const st=document.querySelector('.kk-hero__stage').getBoundingClientRect();
  const sc=document.querySelector('.kk-hero__shortcuts').getBoundingClientRect();
  const cap=document.querySelector('.kk-hero__caption');const cb=cap&&cap.getBoundingClientRect();
  const chips=document.querySelector('[aria-label="Vehicle categories"]');const cr=chips&&chips.getBoundingClientRect();
  return {heroBottom:Math.round(hero.bottom),stageTop:Math.round(st.top),stageBottom:Math.round(st.bottom),shortcutsBottom:Math.round(sc.bottom),
   capVisible:cb&&cb.height>0?[Math.round(cb.top),Math.round(cb.bottom)]:null,chipsTop:cr&&Math.round(cr.top),docOverflowX:document.documentElement.scrollWidth>innerWidth}});
 r.stageClipped=r.stageBottom>r.heroBottom+1;
 console.log(w,JSON.stringify(r));
 await p.screenshot({path:`/home/claude/align/shots/hero-fixed-${w}.png`});await c.close();}
await b.close();})();
