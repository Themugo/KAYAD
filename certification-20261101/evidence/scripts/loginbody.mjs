import { spawn } from 'node:child_process';
const env={...process.env,NODE_ENV:'development',PORT:'5097',HOST:'127.0.0.1',LOG_SILENT:'true',DISABLE_REDIS:'true',KAYAD_ISOLATED_RUNTIME:'true'};
for(const k of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SERVICE_KEY','VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','REDIS_URL','REDIS_URI','REDIS_HOST','REDIS_PORT','POSTHOG_API_KEY','SENTRY_DSN']) env[k]='';
const c=spawn(process.execPath,['bootstrap.js'],{cwd:'/home/claude/work/src/KAYAD/backend',env,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const B='http://127.0.0.1:5097';
for(let i=0;i<120;i++){try{if((await fetch(B+'/health/live')).status===200)break;}catch{}await sleep(250);}
const r=await fetch(B+'/api/v1/auth/csrf'); const j=await r.json(); const t=j.csrfToken||j.token||j?.data?.csrfToken; const ck=r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
const h={'content-type':'application/json','x-csrf-token':t,cookie:ck};
const l=await fetch(B+'/api/v1/auth/login',{method:'POST',headers:h,body:JSON.stringify({email:'probe@example.invalid',password:'Not-A-Real-Password-1!'})});
console.log('login status',l.status,(await l.text()).slice(0,260));
const rg=await fetch(B+'/api/v1/auth/register',{method:'POST',headers:h,body:JSON.stringify({})});
console.log('register(empty body) status',rg.status,(await rg.text()).slice(0,260));
c.kill('SIGTERM');
