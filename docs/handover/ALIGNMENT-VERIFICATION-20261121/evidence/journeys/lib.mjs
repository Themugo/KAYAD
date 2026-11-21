import { execSync } from 'child_process';
// Disposable-only guard (CI): backend and database come from the environment; defaults match the local audit stack.
const _DB=process.env.KAYAD_JOURNEY_DB||'kayad_t', _PG_PORT=process.env.PGPORT||'54329', _PG_HOST=process.env.PGHOST||'127.0.0.1', _PG_USER=process.env.PGUSER||'postgres';
if(!/^kayad_(t|ci|test|recon|journey)/.test(_DB)||!['127.0.0.1','localhost'].includes(_PG_HOST)) throw new Error('Refusing to run: database must be a loopback disposable kayad_* database');
export const B=process.env.KAYAD_JOURNEY_BASE||'http://127.0.0.1:5055';
if(!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(B)) throw new Error('Refusing to run: backend is not loopback');
export const q=s=>execSync(`psql -h ${_PG_HOST} -p ${_PG_PORT} -U ${_PG_USER} -d ${_DB} -q -tAc "${s.replace(/"/g,'\\"')}"`).toString().trim();
export const PW='Str0ng!Passw0rd';
export class Client{
  constructor(){this.jar={};}
  async raw(path,{method='GET',body,headers={},form}={}){
    if(method!=='GET'&&!this.csrf){const r=await fetch(B+'/api/v1/auth/csrf',{headers:{cookie:this.cookie()}});this.store(r);this.csrf=(await r.json()).csrfToken;}
    const h={...headers,cookie:this.cookie()};
    if(method!=='GET'){h['x-csrf-token']=this.csrf;h['x-xsrf-token']=this.csrf;}
    if(this.token)h.authorization='Bearer '+this.token;
    let b; if(form){b=form;} else if(body){h['content-type']='application/json';b=JSON.stringify(body);}
    const r=await fetch(B+path,{method,headers:h,body:b});this.store(r);
    let j=null;try{j=await r.json();}catch{}
    return{status:r.status,j};
  }
  cookie(){return Object.entries(this.jar).map(([k,v])=>k+'='+v).join('; ');}
  store(r){for(const c of(r.headers.getSetCookie?.()||[])){const [kv]=c.split(';');const i=kv.indexOf('=');this.jar[kv.slice(0,i)]=kv.slice(i+1);}}
}
export const results=[];
export const rec=(n,ok,d)=>{results.push({n,ok,d});console.log(ok?'PASS':'FAIL',n,d===undefined?'':(typeof d==='string'?d:JSON.stringify(d)).slice(0,200));};
