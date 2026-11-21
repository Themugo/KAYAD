import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const envExample = fs.readFileSync(path.join(root,'.env.example'),'utf8');
// The frontend talks only to the KAYARD API; Supabase credentials are server-side and must never appear in the client env template.
const required = ['VITE_API_URL','VITE_SOCKET_URL','VITE_PUBLIC_URL'];
for (const key of required) if (!envExample.includes(key)) throw new Error(`Missing ${key} from .env.example`);
const forbidden = ['nirchkrkwtpobwtrkpgy','admin123','ToplineSecure2024!'];
const targets = ['README.md','vercel.json','render.yaml','src','supabase/migrations'].filter((t) => fs.existsSync(path.join(root,t)));
for (const target of targets) {
  const full = path.join(root,target);
  const files = fs.statSync(full).isDirectory() ? walk(full) : [full];
  for (const file of files) {
    const text = fs.readFileSync(file,'utf8');
    for (const token of forbidden) if (text.includes(token)) throw new Error(`Forbidden production token ${token} found in ${path.relative(root,file)}`);
  }
}
console.log('Production readiness contract passed.');
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='dist'||e.name==='.git')continue;const p=path.join(dir,e.name);e.isDirectory()?out.push(...walk(p)):out.push(p)}return out}
