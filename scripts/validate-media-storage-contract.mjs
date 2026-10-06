import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const checks = [
  ['canonical Supabase storage service exists', fs.existsSync(path.join(root,'backend/services/storage.service.js'))],
  ['no Cloudinary dependency', !read('backend/package.json').includes('"cloudinary"')],
  ['canonical media provider is Supabase', read('backend/config/imageProcessing.js').includes('primary: "supabase"')],
  ['private storage uses signed URLs', read('backend/services/storage.service.js').includes('createSignedUrl')],
  ['vehicle uploads use Supabase storage', read('backend/controllers/carController.js').includes('uploadStorageMultiple')],
  ['inspection evidence uses canonical storage', read('backend/middleware/evidenceUpload.js').includes('uploadFile')],
  ['inspection PDF uses canonical storage', read('backend/inspection/services/reportService.js').includes('uploadBuffer')],
  ['no retired Cloudinary source references', (() => { try { execSync("grep -RniE --exclude-dir=node_modules --exclude-dir=.git --exclude='*.lock' 'cloudinary|CLOUDINARY_|res\.cloudinary' backend src", {stdio:'pipe'}); return false; } catch { return true; } })()],
];
let failed=false;
for (const [name,ok] of checks) { console.log(`${ok?'PASS':'FAIL'}: ${name}`); if(!ok) failed=true; }
process.exitCode=failed?1:0;
