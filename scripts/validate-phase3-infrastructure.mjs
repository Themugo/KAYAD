import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const env=fs.readFileSync(path.join(root,'backend/.env.example'),'utf8');
for(const key of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_PUBLIC_BUCKET','SUPABASE_PRIVATE_BUCKET']){
 if(!env.includes(key)) throw new Error(`Missing ${key} in backend/.env.example`);
 console.log(`PASS: ${key}`);
}
