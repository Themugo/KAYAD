// Deployment-verifier tests against isolated mock servers (no network, no production access). Run: node --test ci/verifier-mock-tests.mjs
import { test } from 'node:test'; import assert from 'node:assert/strict'; import http from 'node:http'; import { spawn } from 'node:child_process';
const SHA = 'c'.repeat(40), OLD = 'b'.repeat(40);
const mock = (handler) => new Promise((resolve) => { const s = http.createServer(handler); s.listen(0, '127.0.0.1', () => resolve({ s, url: `http://127.0.0.1:${s.address().port}` })); });
const json = (obj, type = 'application/json') => (q, r) => { r.writeHead(200, { 'content-type': type }); r.end(typeof obj === 'string' ? obj : JSON.stringify(obj)); };
const html = (q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end('<!doctype html><html><body><div id="root"></div></body></html>'); };
const rel = (commit, releaseId = 'r-1') => json({ application: 'KAYAD', commit, releaseId });
const hang = () => {}; // never answers
async function verify({ dep, pub, env = {} }) {
  const d = await mock(dep), p = pub ? await mock(pub) : { s: null, url: 'http://127.0.0.1:1' }; // :1 = connection refused
  const out = await new Promise((resolve) => {
    let text = ''; const c = spawn('node', ['scripts/verify-production-deployment.mjs'], { env: { PATH: process.env.PATH, DEPLOYMENT_URL: d.url, PUBLIC_URL: p.url, API_URL: d.url, VERIFY_ONLY: 'release', RELEASE_PROPAGATION_ATTEMPTS: '2', RELEASE_PROPAGATION_DELAY_MS: '150', SMOKE_TIMEOUT_MS: '1500', EXPECTED_COMMIT: SHA, ...env } });
    c.stdout.on('data', (x) => { text += x; }); c.stderr.on('data', (x) => { text += x; }); c.on('close', (code) => resolve({ code, text }));
  });
  d.s.close(); p.s?.close(); d.s.closeAllConnections?.(); p.s?.closeAllConnections?.(); return out;
}
const route = (releaseHandler) => (q, r) => (q.url.startsWith('/release.json') ? releaseHandler(q, r) : html(q, r));

test('PASS: deployment and public domain serve the expected release', async () => {
  const o = await verify({ dep: route(rel(SHA)), pub: route(rel(SHA)) });
  assert.equal(o.code, 0, o.text); assert.match(o.text, /PASS Release identity/); assert.match(o.text, /PASS Release parity/);
});
test('FAIL: public domain serves an older release', async () => {
  const o = await verify({ dep: route(rel(SHA, 'r-2')), pub: route(rel(OLD, 'r-1')) });
  assert.equal(o.code, 1); assert.match(o.text, /Release parity: public domain serves b{40}/); assert.match(o.text, /deployment is c{40}/);
});
test('FAIL: same commit but different build id on the public domain', async () => {
  const o = await verify({ dep: route(rel(SHA, 'r-2')), pub: route(rel(SHA, 'r-1')) });
  assert.equal(o.code, 1); assert.match(o.text, /Release parity/);
});
test('PASS: public domain catches up within the propagation window', async () => {
  let n = 0; const pub = route((q, r) => (n++ < 1 ? rel(OLD)(q, r) : rel(SHA)(q, r)));
  const o = await verify({ dep: route(rel(SHA)), pub, env: { RELEASE_PROPAGATION_ATTEMPTS: '4' } });
  assert.equal(o.code, 0, o.text); assert.match(o.text, /PASS Release parity/);
});
test('FAIL: public release.json returns the SPA HTML', async () => {
  const o = await verify({ dep: route(rel(SHA)), pub: html });
  assert.equal(o.code, 1); assert.match(o.text, /not JSON \(text\/html/);
});
test('FAIL: deployment release.json returns HTML', async () => {
  const o = await verify({ dep: html, pub: route(rel(SHA)) });
  assert.equal(o.code, 1); assert.match(o.text, /Release (identity|parity)/);
});
test('FAIL: JSON content type but invalid body', async () => {
  const o = await verify({ dep: route(rel(SHA)), pub: route(json('{not json')) });
  assert.equal(o.code, 1); assert.match(o.text, /invalid JSON body/);
});
test('FAIL: release.json without a usable commit on both sides (two empty identities are not "equal")', async () => {
  const o = await verify({ dep: route(json({ application: 'KAYAD' })), pub: route(json({ application: 'KAYAD' })) });
  assert.equal(o.code, 1); assert.match(o.text, /no usable commit/);
});
test('FAIL: commit "unknown" is rejected', async () => {
  const o = await verify({ dep: route(rel('unknown')), pub: route(rel('unknown')) });
  assert.equal(o.code, 1);
});
test('FAIL: deployed commit is not the intended commit', async () => {
  const o = await verify({ dep: route(rel(OLD)), pub: route(rel(OLD)) });
  assert.equal(o.code, 1); assert.match(o.text, new RegExp(`expected ${SHA}, deployed ${OLD}`));
});
test('FAIL (no crash): public domain refuses connections', async () => {
  const o = await verify({ dep: route(rel(SHA)), pub: null });
  assert.equal(o.code, 1); assert.match(o.text, /Release parity/); assert.doesNotMatch(o.text, /Unhandled|TypeError|at async/);
});
test('FAIL (bounded): public domain hangs, verifier times out instead of hanging', async () => {
  const t = Date.now(); const o = await verify({ dep: route(rel(SHA)), pub: hang });
  assert.equal(o.code, 1); assert.ok(Date.now() - t < 15000, 'must be bounded by SMOKE_TIMEOUT_MS * attempts');
});
test('FAIL: in CI a missing expected commit cannot pass', async () => {
  const o = await verify({ dep: route(rel(SHA)), pub: route(rel(SHA)), env: { EXPECTED_COMMIT: '', GITHUB_SHA: '', CI: 'true' } });
  assert.equal(o.code, 1); assert.match(o.text, /no expected commit/);
});
test('GITHUB_SHA is used when EXPECTED_COMMIT is not set', async () => {
  const o = await verify({ dep: route(rel(SHA)), pub: route(rel(SHA)), env: { EXPECTED_COMMIT: '', GITHUB_SHA: SHA } });
  assert.equal(o.code, 0, o.text);
});
test('FAIL: no deployment URL supplied', async () => {
  const o = await new Promise((resolve) => { let t = ''; const c = spawn('node', ['scripts/verify-production-deployment.mjs'], { env: { PATH: process.env.PATH, VERIFY_ONLY: 'release', EXPECTED_COMMIT: SHA } }); c.stdout.on('data', (x) => { t += x; }); c.stderr.on('data', (x) => { t += x; }); c.on('close', (code) => resolve({ code, text: t })); });
  assert.equal(o.code, 1); assert.match(o.text, /Deployment URL/);
});
