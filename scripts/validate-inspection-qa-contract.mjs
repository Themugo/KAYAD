import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const checks=[
  ['inspection PDF uses canonical Supabase Storage', /uploadBuffer/.test(read('backend/inspection/services/reportService.js'))],
  ['inspection evidence uses canonical Supabase Storage', /uploadFile/.test(read('backend/middleware/evidenceUpload.js'))],
  ['private media uses signed URLs', /createSignedUrl/.test(read('backend/services/storage.service.js'))],
  ['QA remains required before PDF generation', /only be generated after independent QA approval/.test(read('backend/inspection/services/reportService.js'))],
];
let failed=false; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'}: ${n}`);if(!ok)failed=true;} process.exitCode=failed?1:0;
