import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_NODE = [22, 22, 2];
const root = process.cwd();
const env = process.env;

const versionParts = process.versions.node.split('.').map(Number);
const nodeOk = versionParts[0] > REQUIRED_NODE[0]
  || (versionParts[0] === REQUIRED_NODE[0] && (versionParts[1] > REQUIRED_NODE[1]
    || (versionParts[1] === REQUIRED_NODE[1] && versionParts[2] >= REQUIRED_NODE[2])));

const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass, detail });

check('Node runtime >= 22.22.2', nodeOk, `running ${process.versions.node}`);
check('package-lock exists', fs.existsSync(path.join(root, 'package-lock.json')));
check('inspection execution service exists', fs.existsSync(path.join(root, 'backend/inspection/services/executionService.js')));
check('canonical Supabase storage service exists', fs.existsSync(path.join(root, 'backend/services/storage.service.js')));
check('QA segregation migration exists', fs.existsSync(path.join(root, 'supabase/migrations/20261006193000_inspection_qa_segregation_and_media_integrity.sql')));

const live = process.argv.includes('--live');
const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || '';
const privateBucket = env.SUPABASE_PRIVATE_BUCKET || 'kayad-private';

if (!live) {
  check('live certification credentials are present (preflight only)', Boolean(supabaseUrl && serviceKey), 'required only for --live; no external mutation performed');
} else {
  check('SUPABASE_URL configured', Boolean(supabaseUrl), 'missing SUPABASE_URL');
  check('Supabase service-role key configured', Boolean(serviceKey), 'missing SUPABASE_SERVICE_ROLE_KEY');
}

async function liveStorageRoundTrip() {
  const objectPath = `certification/inspection-runtime/${crypto.randomUUID()}.txt`;
  const body = Buffer.from(`KAYAD inspection runtime certification ${new Date().toISOString()}\n`, 'utf8');
  const headers = { authorization: `Bearer ${serviceKey}`, apikey: serviceKey };
  const objectUrl = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(privateBucket)}/${objectPath}`;
  const upload = await fetch(objectUrl, { method: 'POST', headers: { ...headers, 'content-type': 'text/plain', 'x-upsert': 'false' }, body });
  if (!upload.ok) throw new Error(`private upload failed (${upload.status}): ${await upload.text()}`);

  let signedUrl;
  try {
    const sign = await fetch(`${supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(privateBucket)}`, {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ paths: [objectPath], expiresIn: 300 }),
    });
    if (!sign.ok) throw new Error(`signed URL creation failed (${sign.status}): ${await sign.text()}`);
    const json = await sign.json();
    signedUrl = json?.signedURLs?.[0]?.signedURL || json?.signedURL;
    if (!signedUrl) throw new Error('signed URL response did not contain a URL');
  } finally {
    // Deletion is attempted even if signing fails so certification never leaves
    // a test object behind when the upload itself succeeded.
  }

  const retrieval = await fetch(signedUrl.startsWith('http') ? signedUrl : `${supabaseUrl}${signedUrl}`);
  if (!retrieval.ok) throw new Error(`signed retrieval failed (${retrieval.status})`);
  const retrieved = Buffer.from(await retrieval.arrayBuffer());
  if (!retrieved.equals(body)) throw new Error('signed retrieval content mismatch');

  const deletion = await fetch(objectUrl, { method: 'DELETE', headers });
  if (!deletion.ok) throw new Error(`private deletion failed (${deletion.status}): ${await deletion.text()}`);

  const afterDelete = await fetch(objectUrl, { headers });
  if (afterDelete.ok) throw new Error('deleted private object remained readable');
  return objectPath;
}

if (live && supabaseUrl && serviceKey) {
  try {
    const objectPath = await liveStorageRoundTrip();
    check('real private storage upload -> signed retrieval -> deletion', true, objectPath);
  } catch (error) {
    check('real private storage upload -> signed retrieval -> deletion', false, error.message);
  }
}

for (const item of checks) console.log(`${item.pass ? 'PASS' : 'BLOCKED/FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);

const failures = checks.filter((item) => !item.pass);
if (live && failures.length) process.exit(1);
console.log(`INSPECTION RUNTIME CERTIFICATION ${live ? 'LIVE' : 'PREFLIGHT'}: ${checks.filter(x => x.pass).length}/${checks.length} PASS`);
if (!live && !supabaseUrl) console.log('NEXT: run this on the Node >=22.22.2 staging runner with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and --live.');
