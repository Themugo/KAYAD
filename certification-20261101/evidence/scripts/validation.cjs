const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); let allOk=true;
for (const w of [320,390,1024]) {
  const p=await (await b.newContext({viewport:{width:w,height:800}})).newPage();
  const posts=[]; p.on('request',r=>{ if(r.method()==='POST') posts.push(new URL(r.url()).pathname); });
  await p.goto('http://127.0.0.1:4173/login',{waitUntil:'load'}); await p.waitForTimeout(800);
  const before=posts.length;
  await p.getByRole('button',{name:/continue to kayad/i}).click(); await p.waitForTimeout(500);
  const s1=await p.evaluate(()=>{const e=document.querySelector('input[type=email]');return {missing:e.validity.valueMissing,msg:e.validationMessage,focused:document.activeElement===e};});
  await p.getByLabel(/email address/i).fill('not-an-email'); await p.locator('input[type=password]').fill('x'); await p.getByRole('button',{name:/continue to kayad/i}).click(); await p.waitForTimeout(500);
  const s2=await p.evaluate(()=>{const e=document.querySelector('input[type=email]');return {typeMismatch:e.validity.typeMismatch,msg:e.validationMessage};});
  const pass = s1.missing && s1.focused && s2.typeMismatch && posts.length===before && new URL(p.url()).pathname==='/login';
  allOk = allOk && pass;
  console.log(`${pass?'PASS':'FAIL'} [${w}] empty→valueMissing+focus on email; malformed→typeMismatch; 0 network POSTs; still /login  ${JSON.stringify({s1,s2,posts})}`);
}
await b.close(); process.exit(allOk?0:1);})();
