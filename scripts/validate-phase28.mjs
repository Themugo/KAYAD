import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const activeLines = (text) => text.split('\n').filter((line) => !line.trim().startsWith('#')).join('\n');

const dockerfile = read('Dockerfile.frontend');
assert.match(dockerfile, /COPY nginx\.docker\.conf \/etc\/nginx\/conf\.d\/default\.conf/);
assert.doesNotMatch(dockerfile, /2>\/dev\/null|\|\| true/);
assert.ok(fs.existsSync(path.join(root, 'nginx.docker.conf')));
assert.match(dockerfile, /RUN npm ci/);

const compose = read('docker-compose.yml');
assert.match(compose, /\.\/nginx\.docker\.conf:\/etc\/nginx\/conf\.d\/default\.conf:ro/);
assert.doesNotMatch(compose, /\.\/ssl:\/etc\/ssl\/certs/);
assert.doesNotMatch(compose, /"443:443"/);

const dockerNginx = read('nginx.docker.conf');
assert.match(dockerNginx, /server backend:5000/);
assert.match(dockerNginx, /root \/usr\/share\/nginx\/html/);
assert.doesNotMatch(dockerNginx.split('\n').filter((line) => !line.trim().startsWith('#')).join('\n'), /letsencrypt|ssl_certificate|127\.0\.0\.1:5000/);

const render = read('render.yaml');
assert.match(render, /dockerfilePath: backend\/Dockerfile/);
assert.match(render, /mountPath: \/app\/uploads/);

const staging = read('render-staging.yaml');
assert.match(staging, /buildCommand: cd backend && npm ci/);
assert.doesNotMatch(activeLines(staging), /scripts\/startWorkers\.js/);
assert.doesNotMatch(staging, /type: worker/);

const netpol = read('k8s/network-policies.yaml');
assert.doesNotMatch(netpol, /27017|app: supabase/);
assert.match(netpol, /port: 443/);
assert.match(netpol, /port: 53/);

assert.ok(fs.existsSync(path.join(root, 'backend/workers/notificationWorker.js')));
const pkg = JSON.parse(read('backend/package.json'));
assert.equal(pkg.engines.node, '>=22.22.2');

try {
  execFileSync('node', ['--check', 'backend/server.js'], { cwd: root, stdio: 'pipe' });
} catch (error) {
  console.error(error.stdout?.toString() || '');
  console.error(error.stderr?.toString() || '');
  throw error;
}

console.log('PHASE 28 DEPLOYMENT ARTIFACT VALIDATION: PASS');
console.log('Frontend Docker build: canonical nginx.docker.conf + npm ci');
console.log('Compose: backend service routing + no container-local TLS mismatch');
console.log('Render staging: locked install + no nonexistent duplicate worker service');
console.log('Kubernetes network policy: no MongoDB/Supabase pod dependency');
console.log('Backend Node baseline: 22.22.2');
