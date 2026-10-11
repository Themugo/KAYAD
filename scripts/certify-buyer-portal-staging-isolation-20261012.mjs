/**
 * Read-only two-account staging isolation certification.
 * Never use production credentials. No mutations are issued by this script.
 * Required env vars and examples are documented in KAYAD_STAGE20_STAGING_RUNBOOK_20261012.md.
 */
import process from 'node:process';

const env = process.env;
const apiBase = (env.STAGING_API_BASE_URL || '').replace(/\/$/, '');
const supabaseBase = (env.STAGING_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = env.STAGING_SUPABASE_ANON_KEY || '';
const tokenA = env.STAGING_ACCOUNT_A_TOKEN || '';
const tokenB = env.STAGING_ACCOUNT_B_TOKEN || '';
const accountA = env.STAGING_ACCOUNT_A_ID || '';
const accountB = env.STAGING_ACCOUNT_B_ID || '';
const failures = [];
const results = [];

function record(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name} | ${detail || ''}`);
  if (!pass) failures.push(name);
}
function required(name, value) {
  if (!value) failures.push(`CONFIG:${name}`);
}
function hasValueDeep(value, target) {
  if (target == null || target === '') return false;
  if (Array.isArray(value)) return value.some((v) => hasValueDeep(v, target));
  if (value && typeof value === 'object') return Object.values(value).some((v) => hasValueDeep(v, target));
  return String(value) === String(target);
}
async function apiGet(name, path, token, expected) {
  try {
    const response = await fetch(`${apiBase}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
    });
    const text = await response.text();
    let body = text;
    try { body = text ? JSON.parse(text) : null; } catch { /* PDF/binary/error text */ }
    const pass = expected(response.status, body, text);
    record(name, pass, `HTTP ${response.status}`);
    return { status: response.status, body, text };
  } catch (error) {
    record(name, false, `request error: ${error?.message || error}`);
    return null;
  }
}
function isAllowed(status) { return status >= 200 && status < 300; }
function isDenied(status) { return [401, 403, 404, 410].includes(status); }
function idFromEnv(name) { return env[name] || ''; }

for (const [name, value] of Object.entries({
  STAGING_API_BASE_URL: apiBase,
  STAGING_ACCOUNT_A_TOKEN: tokenA,
  STAGING_ACCOUNT_B_TOKEN: tokenB,
  STAGING_ACCOUNT_A_ID: accountA,
  STAGING_ACCOUNT_B_ID: accountB,
})) required(name, value);
if (accountA && accountB && accountA === accountB) failures.push('CONFIG:account A and B IDs must be different');
if (!apiBase || !tokenA || !tokenB || !accountA || !accountB || accountA === accountB) {
  console.error('\nSTAGING CERTIFICATION NOT RUN: missing/invalid required configuration. See KAYAD_STAGE20_STAGING_RUNBOOK_20261012.md.');
  for (const item of failures) console.error(`CONFIG FAIL | ${item}`);
  process.exit(2);
}

console.log('KAYAD two-account staging isolation certification — READ ONLY');
console.log(`API target: ${apiBase}`);
console.log(`Account A ID: ${accountA}; Account B ID: ${accountB}`);
console.log('Tokens are not printed. Only GET requests are issued.');

// Collection checks: both accounts must see their own seeded marker and not the other account's marker.
const collections = [
  { label: 'saved vehicles', path: '/api/favorites', a: 'STAGING_A_SAVED_CAR_ID', b: 'STAGING_B_SAVED_CAR_ID' },
  { label: 'financing applications', path: '/api/loans/my', a: 'STAGING_A_LOAN_ID', b: 'STAGING_B_LOAN_ID' },
  { label: 'inspection bookings', path: '/api/inspection/bookings', a: 'STAGING_A_INSPECTION_BOOKING_ID', b: 'STAGING_B_INSPECTION_BOOKING_ID' },
  { label: 'legacy inspection orders', path: '/api/inspection/my', a: 'STAGING_A_INSPECTION_ORDER_ID', b: 'STAGING_B_INSPECTION_ORDER_ID' },
  { label: 'escrow deals', path: '/api/escrow/my', a: 'STAGING_A_ESCROW_ID', b: 'STAGING_B_ESCROW_ID' },
  { label: 'chats', path: '/api/chat', a: 'STAGING_A_CHAT_ID', b: 'STAGING_B_CHAT_ID' },
  { label: 'notifications', path: '/api/notifications', a: 'STAGING_A_NOTIFICATION_ID', b: 'STAGING_B_NOTIFICATION_ID' },
  { label: 'ownership dashboard', path: '/api/ownership/dashboard', a: 'STAGING_A_OWNED_VEHICLE_ID', b: 'STAGING_B_OWNED_VEHICLE_ID' },
];
for (const item of collections) {
  const aId = idFromEnv(item.a); const bId = idFromEnv(item.b);
  if (!aId || !bId) { record(`CONFIG ${item.label} markers`, false, `set ${item.a} and ${item.b}`); continue; }
  const a = await apiGet(`Account A can load ${item.label}`, item.path, tokenA, isAllowed);
  if (a) {
    record(`Account A ${item.label} contains its own fixture`, hasValueDeep(a.body, aId), `marker ${aId}`);
    record(`Account A ${item.label} excludes Account B fixture`, !hasValueDeep(a.body, bId), `foreign marker ${bId} absent`);
  }
  const b = await apiGet(`Account B can load ${item.label}`, item.path, tokenB, isAllowed);
  if (b) {
    record(`Account B ${item.label} contains its own fixture`, hasValueDeep(b.body, bId), `marker ${bId}`);
    record(`Account B ${item.label} excludes Account A fixture`, !hasValueDeep(b.body, aId), `foreign marker ${aId} absent`);
  }
}

// Direct-object tests: own resource must resolve; other account's resource must be denied.
const directResources = [
  { label: 'ownership vehicle', path: (id) => `/api/ownership/vehicles/${encodeURIComponent(id)}`, a: 'STAGING_A_OWNED_VEHICLE_ID', b: 'STAGING_B_OWNED_VEHICLE_ID' },
  { label: 'inspection booking', path: (id) => `/api/inspection/bookings/${encodeURIComponent(id)}`, a: 'STAGING_A_INSPECTION_BOOKING_ID', b: 'STAGING_B_INSPECTION_BOOKING_ID' },
  { label: 'inspection report', path: (id) => `/api/inspection/reports/${encodeURIComponent(id)}`, a: 'STAGING_A_INSPECTION_REPORT_ID', b: 'STAGING_B_INSPECTION_REPORT_ID' },
  { label: 'legacy inspection order', path: (id) => `/api/inspection/${encodeURIComponent(id)}`, a: 'STAGING_A_INSPECTION_ORDER_ID', b: 'STAGING_B_INSPECTION_ORDER_ID' },
  { label: 'escrow deal', path: (id) => `/api/escrow/${encodeURIComponent(id)}`, a: 'STAGING_A_ESCROW_ID', b: 'STAGING_B_ESCROW_ID' },
  { label: 'chat messages', path: (id) => `/api/chat/${encodeURIComponent(id)}/messages`, a: 'STAGING_A_CHAT_ID', b: 'STAGING_B_CHAT_ID' },
];
for (const item of directResources) {
  const aId = idFromEnv(item.a); const bId = idFromEnv(item.b);
  if (!aId || !bId) { record(`CONFIG direct ${item.label}`, false, `set ${item.a} and ${item.b}`); continue; }
  await apiGet(`Account A reads own ${item.label}`, item.path(aId), tokenA, isAllowed);
  const foreignA = await apiGet(`Account A cannot read Account B ${item.label}`, item.path(bId), tokenA, (status) => isDenied(status));
  if (foreignA && isAllowed(foreignA.status)) record(`Account A foreign ${item.label} body does not contain B marker`, !hasValueDeep(foreignA.body, bId), '200 response must be empty/redacted if endpoint intentionally supports that contract');
  await apiGet(`Account B reads own ${item.label}`, item.path(bId), tokenB, isAllowed);
  const foreignB = await apiGet(`Account B cannot read Account A ${item.label}`, item.path(aId), tokenB, (status) => isDenied(status));
  if (foreignB && isAllowed(foreignB.status)) record(`Account B foreign ${item.label} body does not contain A marker`, !hasValueDeep(foreignB.body, aId), '200 response must be empty/redacted if endpoint intentionally supports that contract');
}

// Attachment tests require both chat and upload IDs; GET only.
for (const [owner, token, foreignOwner, foreignToken] of [['A', tokenA, 'B', tokenB], ['B', tokenB, 'A', tokenA]]) {
  const ownChat = idFromEnv(`STAGING_${owner}_CHAT_ID`);
  const ownUpload = idFromEnv(`STAGING_${owner}_CHAT_UPLOAD_ID`);
  const foreignChat = idFromEnv(`STAGING_${foreignOwner}_CHAT_ID`);
  const foreignUpload = idFromEnv(`STAGING_${foreignOwner}_CHAT_UPLOAD_ID`);
  if (!ownChat || !ownUpload || !foreignChat || !foreignUpload) {
    record(`CONFIG Account ${owner} attachment probes`, false, 'set both accounts’ chat and upload IDs');
    continue;
  }
  await apiGet(`Account ${owner} reads own chat attachment`, `/api/chat/${encodeURIComponent(ownChat)}/attachments/${encodeURIComponent(ownUpload)}`, token, isAllowed);
  await apiGet(`Account ${owner} cannot read Account ${foreignOwner} attachment`, `/api/chat/${encodeURIComponent(foreignChat)}/attachments/${encodeURIComponent(foreignUpload)}`, token, (status) => isDenied(status));
}

// Supabase REST RLS probes use user JWTs + the public/anon key, never a service-role key.
if (supabaseBase || anonKey || env.STAGING_RLS_PROBES) {
  if (!supabaseBase || !anonKey || !env.STAGING_RLS_PROBES) {
    record('Supabase RLS probe configuration', false, 'set STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY and STAGING_RLS_PROBES JSON together');
  } else {
    let probes;
    try { probes = JSON.parse(env.STAGING_RLS_PROBES); if (!Array.isArray(probes)) throw new Error('must be a JSON array'); }
    catch (error) { record('Supabase RLS probe configuration', false, error.message); probes = []; }
    for (const p of probes) {
      const { table, idColumn = 'id', aId, bId, label = table } = p || {};
      if (!table || !aId || !bId || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(idColumn)) {
        record(`RLS ${label || 'probe'} configuration`, false, 'each probe needs safe table/idColumn identifiers and aId/bId'); continue;
      }
      for (const [actor, token, foreignId] of [['A', tokenA, bId], ['B', tokenB, aId]]) {
        const url = `${supabaseBase}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(idColumn)}&${encodeURIComponent(idColumn)}=eq.${encodeURIComponent(foreignId)}&limit=2`;
        try {
          const response = await fetch(url, { headers: { apikey: anonKey, Authorization: `Bearer ${actor === 'A' ? tokenA : tokenB}`, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
          const text = await response.text(); let body; try { body = JSON.parse(text); } catch { body = text; }
          const pass = response.ok && Array.isArray(body) && body.length === 0;
          record(`Supabase RLS Account ${actor} cannot select other account row (${label})`, pass, `HTTP ${response.status}; returned rows ${Array.isArray(body) ? body.length : 'not-array'}`);
        } catch (error) { record(`Supabase RLS Account ${actor} probe (${label})`, false, error?.message || error); }
      }
    }
  }
} else {
  console.log('SKIP | Supabase REST RLS probes | optional RLS configuration was not supplied');
}

console.log(`\nStaging isolation certification: ${results.filter((r) => r.pass).length}/${results.length} checks passed; ${failures.length} failure(s).`);
console.log('This result covers only the configured staging fixtures and GET-only probes. It is not a production certification.');
if (failures.length) process.exitCode = 1;
