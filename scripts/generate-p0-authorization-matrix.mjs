#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const server = fs.readFileSync(path.join(root,'backend/server.js'),'utf8');
const routeMounts = [...server.matchAll(/app\.use\(\"([^\"]+)\",([^\;]+)\);/g)].map(m=>({prefix:m[1],router:(m[2].trim().split(/,\s*/).pop()||'').trim()}));
const routeFiles = [];
const walk = (dir) => { for (const e of fs.readdirSync(path.join(root,dir), {withFileTypes:true})) { const rel=path.join(dir,e.name); if(e.isDirectory()) walk(rel); else if(e.name.endsWith('.js')) routeFiles.push(rel); } };
walk('backend/routes');
const serverImports = {};
for (const m of server.matchAll(/import\s+(\w+)\s+from\s+["']\.\/routes\/([^"']+?\.js)["']/g)) serverImports[m[1]] = 'backend/routes/' + m[2];
const out=[];
for(const file of routeFiles){
  const s=fs.readFileSync(path.join(root,file),'utf8');
  const routerName=(s.match(/const\s+(\w+)\s*=\s*express\.Router/)||[])[1];
  const mount=routeMounts.find(x=>serverImports[x.router]===file);
  if(!mount) continue;
  const inherited=/router\.use\([^;]*\bprotect\b[^;]*\)/.test(s);
  const inheritedRoles=[...s.matchAll(/router\.use\([^;]*allowRoles\(([^)]*)\)[^;]*\)/g)].flatMap(x=>x[1].match(/"([^"]+)"|'([^']+)'/g)||[]).map(x=>x.slice(1,-1));
  const controllerImports=[...s.matchAll(/from\s+["']\.\.\/controllers\/([^"']+)["']/g)].map(m=>m[1]);
  const lines=s.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    const m=line.match(/router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']\s*,\s*(.*)\);/);
    if(!m) continue;
    const method=m[1].toUpperCase(), route=m[2], tail=m[3];
    const explicitProtect=/\bprotect\b/.test(tail);
    const roles=[...tail.matchAll(/allowRoles\(([^)]*)\)/g)].flatMap(x=>x[1].match(/"([^"]+)"|'([^']+)'/g)||[]).map(x=>x.slice(1,-1));
    const effectiveRoles=[...new Set([...inheritedRoles,...roles])];
    const auth=inherited||explicitProtect;
    const state=['POST','PUT','PATCH','DELETE'].includes(method);
    const risk=route.includes(':id')||route.includes(':')||/payment|escrow|dispute|ledger|finance|admin|dealer|organization|inspection|webhook|upload/i.test(route+mount.prefix);
    const handlerMatch=tail.match(/asyncHandler\((\w+)/);
    out.push({method,path:mount.prefix+route,file,handler:handlerMatch?.[1]||'',auth:auth?'AUTHENTICATED':'PUBLIC',roles:effectiveRoles.length?effectiveRoles.join('|'):'',risk: risk?'HIGH':'NORMAL',state});
  }
}
out.sort((a,b)=>a.path.localeCompare(b.path)||a.method.localeCompare(b.method));
let md='# P0-B — Authorization matrix — 2026-09-19\n\n';
md+='Generated from mounted Express routers. `AUTHENTICATED` means router-level or route-level `protect`. Role guards are listed separately. Resource ownership is a controller-level property and is not inferred as satisfied merely because authentication exists. High-risk routes require manual/resource-scope certification.\n\n';
md+=`Total mounted route declarations certified structurally: **${out.length}**.\n\n| Method | Endpoint | Auth | Roles | Risk | Source |\n|---|---|---|---|---|---|\n`;
for(const r of out) md+=`| ${r.method} | \`${r.path}\` | ${r.auth} | ${r.roles||'—'} | ${r.risk} | ${r.file} |\n`;
fs.writeFileSync(path.join(root,'P0_AUTHORIZATION_MATRIX_20260919.md'),md);
const unsafe=out.filter(r=>r.state&&!r.auth&&!/^\/api\/webhooks\b/.test(r.path)&&!/^\/api\/communications\/webhooks\b/.test(r.path));
console.log(`Mounted route declarations: ${out.length}`);
console.log(`State-changing routes without authentication (excluding webhook namespaces): ${unsafe.length}`);
for(const r of unsafe.slice(0,50)) console.log(`FAIL ${r.method} ${r.path} ${r.file}`);
process.exitCode=unsafe.length?1:0;
