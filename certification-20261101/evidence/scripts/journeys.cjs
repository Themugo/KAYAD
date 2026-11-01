const { chromium } = require('playwright'); const fs=require('fs');
const BASE='http://127.0.0.1:4173', OUT='/home/claude/work/evidence/journeys'; fs.mkdirSync(OUT,{recursive:true});
const res=[]; const ok=(n,c,d='')=>{res.push({n,pass:!!c,d}); console.log((c?'PASS ':'FAIL ')+n+(d?'  — '+d:''));};
(async()=>{const b=await chromium.launch();
for (const w of [320,390,1024]) {
  const ctx=await b.newContext({viewport:{width:w,height:800},hasTouch:w<768}); const p=await ctx.newPage();
  await p.goto(BASE+'/login',{waitUntil:'load'}); await p.waitForTimeout(800);
  // empty submit -> validation, no navigation
  await p.getByRole('button',{name:/continue to kayad/i}).click(); await p.waitForTimeout(400);
  const invalid=await p.locator('[aria-invalid="true"]').count(); const alertTxt=await p.locator('[role=alert]').allInnerTexts();
  ok(`[${w}] empty submit shows validation, stays on /login`, (invalid>0||alertTxt.length>0) && new URL(p.url()).pathname==='/login', `invalid=${invalid} alerts=${JSON.stringify(alertTxt).slice(0,80)}`);
  // malformed email
  await p.getByLabel(/email address/i).fill('not-an-email'); await p.getByLabel(/^password/i).first().fill('x'); await p.getByRole('button',{name:/continue to kayad/i}).click(); await p.waitForTimeout(400);
  ok(`[${w}] malformed email rejected client-side`, new URL(p.url()).pathname==='/login' && (await p.locator('[aria-invalid="true"], [role=alert]').count())>0);
  // password toggle
  const pw=p.locator('input[type=password]').first(); await p.getByRole('button',{name:/show/i}).click();
  ok(`[${w}] show-password toggles field type`, (await p.locator('input[name=password], input.kayad-auth-input').nth(1).getAttribute('type'))==='text');
  await p.getByRole('button',{name:/hide/i}).click();
  // focus visibility on keyboard tab
  await p.getByLabel(/email address/i).focus(); await p.keyboard.press('Tab'); await p.waitForTimeout(100);
  const focusStyle=await p.evaluate(()=>{const e=document.activeElement; const cs=getComputedStyle(e); return {tag:e.tagName, text:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,30), outline:cs.outlineStyle+' '+cs.outlineWidth, shadow:cs.boxShadow!=='none'};});
  ok(`[${w}] keyboard Tab lands on a control with a visible focus indicator`, focusStyle.outline.startsWith('solid')||focusStyle.shadow, JSON.stringify(focusStyle));
  // links
  await p.getByRole('link',{name:/forgot password/i}).click(); await p.waitForTimeout(400);
  ok(`[${w}] Forgot password -> /forgot-password`, new URL(p.url()).pathname==='/forgot-password', p.url());
  await p.goto(BASE+'/login',{waitUntil:'load'}); await p.waitForTimeout(500);
  await p.getByRole('link',{name:/create your kayad account/i}).first().click().catch(async()=>{await p.getByRole('button',{name:/create your kayad account/i}).click();}); await p.waitForTimeout(500);
  ok(`[${w}] Create account -> /register`, new URL(p.url()).pathname==='/register', p.url());
  // register: pick Buyer and look at the form
  await p.getByText('Buyer',{exact:true}).first().click(); await p.waitForTimeout(700);
  const inputs=await p.locator('input:not([type=hidden])').count();
  const ovf=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  const fsz=await p.evaluate(()=>[...document.querySelectorAll('input.kayad-auth-input')].map(i=>getComputedStyle(i).fontSize));
  ok(`[${w}] buyer registration form renders, no horizontal overflow`, inputs>0 && !ovf, `inputs=${inputs} fonts=${[...new Set(fsz)]}`);
  await p.screenshot({path:`${OUT}/register-buyer-${w}.png`,fullPage:true});
  await ctx.close();
}
// reduced motion
const ctx=await b.newContext({viewport:{width:390,height:800},reducedMotion:'reduce'}); const p=await ctx.newPage(); await p.goto(BASE+'/login'); await p.waitForTimeout(600);
const anim=await p.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>{const c=getComputedStyle(e);return c.animationName!=='none' && parseFloat(c.animationDuration)>0.05 && c.animationIterationCount==='infinite';}).length);
ok('reduced-motion: no infinite animations on sign-in', anim===0, 'infinite animations='+anim);
await b.close(); fs.writeFileSync(OUT+'/journeys.json',JSON.stringify(res,null,1));
console.log(`\n${res.filter(r=>r.pass).length}/${res.length} passed`);})();
