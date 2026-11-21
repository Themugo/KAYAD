const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const { execSync } = require('child_process');
const q=s=>execSync(`psql -h 127.0.0.1 -p 54329 -U postgres -d kayad_t -tAc "${s}"`).toString().trim();
(async()=>{
 const base='http://127.0.0.1:4192', email='other.owner@example.test';
 // 1. an UNRELATED person already owns this email (registered through the real API)
 const r=await fetch('http://127.0.0.1:5055/api/v1/auth/csrf');const j=await r.json();const ck=r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const pre=await fetch('http://127.0.0.1:5055/api/v1/auth/register',{method:'POST',headers:{'content-type':'application/json',cookie:ck,'x-csrf-token':j.csrfToken},body:JSON.stringify({name:'Real Owner',email,password:'Str0ng!Passw0rd',role:'user'})});
 console.log('pre-existing owner registration status',pre.status);
 // 2. a different person's FIRST attempt never reaches the server (aborted before sending), then they retry
 const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:800},isMobile:true});const p=await c.newPage();let n=0;
 await p.route('**/auth/register',r=>{n++; n===1? r.abort('connectionreset'): r.continue()});
 await p.goto(base+'/register',{waitUntil:'networkidle'});await p.waitForTimeout(500);
 await p.getByRole('radio',{name:/Personal account/i}).first().click();
 await p.getByLabel('Full name').fill('Someone Else');await p.getByLabel('Email').fill(email);await p.getByLabel('Password',{exact:false}).first().fill('An0ther!Passw0rd');
 await p.getByRole('button',{name:/Create account/i}).click();await p.waitForTimeout(1500);
 await p.getByRole('button',{name:/Go back and try again/i}).click();await p.waitForTimeout(300);
 await p.getByRole('button',{name:/Create account/i}).click();await p.waitForTimeout(2000);
 console.log('screen:',(await p.locator('h1,h2').allInnerTexts()).join(' | '));
 console.log('body text:',(await p.locator('main, body').first().innerText()).replace(/\s+/g,' ').slice(0,330));
 console.log('users for email:',q(`select count(*) from users where email='${email}'`),'| owner name:',q(`select name from users where email='${email}'`));
 await p.screenshot({path:'/home/claude/align/shots/main-false-recovery.png'});await b.close();
})();
