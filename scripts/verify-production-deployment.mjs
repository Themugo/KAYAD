import process from 'node:process';

const deploymentUrl = String(process.env.DEPLOYMENT_URL || '').trim().replace(/\/$/, '');
const publicUrl = String(process.env.PUBLIC_URL || 'https://www.kayad.space').trim().replace(/\/$/, '');
const apiUrl = String(process.env.API_URL || 'https://api.kayad.space').trim().replace(/\/$/, '');
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 30000);

const failures = [];
const warnings = [];

function assertUrl(name, value) {
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`unsupported protocol ${parsed.protocol}`);
  } catch (error) {
    failures.push(`${name}: invalid URL (${error.message})`);
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect: 'follow',
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function checkReleaseIdentity() {
  const expectedCommit = String(process.env.EXPECTED_COMMIT || process.env.GITHUB_SHA || '').trim();
  if (!expectedCommit) {
    // In CI (or when REQUIRE_RELEASE_IDENTITY=1) a skipped identity check is a failure, never a warning: success must not be reportable without it.
    if (process.env.CI || process.env.GITHUB_ACTIONS || process.env.REQUIRE_RELEASE_IDENTITY === '1') failures.push('Release identity: no expected commit (EXPECTED_COMMIT/GITHUB_SHA) was supplied, so the deployed commit cannot be verified');
    else warnings.push('Release identity: EXPECTED_COMMIT not supplied; commit match was not asserted');
    return;
  }
  try {
    const response = await fetchWithTimeout(`${deploymentUrl}/release.json`, {
      headers: { accept: 'application/json', 'user-agent': 'KAYAD-production-verifier/1.0' },
    });
    if (!response.ok) {
      failures.push(`Release identity: HTTP ${response.status} for /release.json`);
      return;
    }
    const payload = await response.json().catch(() => null);
    if (payload?.commit !== expectedCommit) {
      failures.push(`Release identity: expected ${expectedCommit}, deployed ${payload?.commit || 'unknown'}`);
      return;
    }
    console.log(`PASS Release identity: deployed commit ${expectedCommit}`);
  } catch (error) {
    failures.push(`Release identity: ${error.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : error.message}`);
  }
}

async function fetchRelease(baseUrl) {
  const response = await fetchWithTimeout(`${baseUrl}/release.json?_=${Date.now()}`, {
    headers: { accept: 'application/json', 'cache-control': 'no-cache', 'user-agent': 'KAYAD-production-verifier/1.0' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get('content-type') || '';
  if (!type.includes('json')) throw new Error(`not JSON (${type || 'no content-type'}); an SPA fallback was served instead of release.json`);
  let payload;
  try { payload = await response.json(); } catch { throw new Error('invalid JSON body'); }
  // A release file without a usable commit must never be compared: two empty identities would look "equal".
  if (!payload || typeof payload.commit !== 'string' || !payload.commit || payload.commit === 'unknown') throw new Error('release.json has no usable commit');
  return payload;
}

// The custom domain must serve the SAME release as the deployment that was just created. A domain alias that still points at an older
// deployment (or a CDN/DNS layer serving an older copy) is exactly how some visitors keep seeing an old site while the deploy "succeeds".
async function checkPublicDomainMatchesDeployment() {
  const attempts = Math.max(1, Number(process.env.RELEASE_PROPAGATION_ATTEMPTS || 6));
  const delayMs = Math.max(0, Number(process.env.RELEASE_PROPAGATION_DELAY_MS || 10000));
  let deployed;
  try { deployed = await fetchRelease(deploymentUrl); } catch (error) { failures.push(`Release parity: deployment release.json unreadable (${error.message})`); return; }
  let last = '';
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const pub = await fetchRelease(publicUrl);
      const sameCommit = pub?.commit === deployed?.commit;
      const sameBuild = !pub?.releaseId || !deployed?.releaseId || pub.releaseId === deployed.releaseId;
      if (sameCommit && sameBuild) { console.log(`PASS Release parity: public domain and deployment both serve ${String(deployed.commit).slice(0, 12)} (${deployed.releaseId || 'no releaseId'})`); return; }
      last = `public domain serves ${pub?.commit} (${pub?.releaseId || 'no releaseId'}) but the deployment is ${deployed?.commit} (${deployed?.releaseId || 'no releaseId'})`;
    } catch (error) { last = `public release.json unreadable (${error.message})`; }
    if (i < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  failures.push(`Release parity: ${last}. The custom domain is not serving the deployment that was just created (alias, DNS or CDN issue).`);
}

async function checkFrontend(name, baseUrl) {
  if (!baseUrl) return;
  try {
    const response = await fetchWithTimeout(`${baseUrl}/`, {
      headers: { 'user-agent': 'KAYAD-production-verifier/1.0' },
    });
    const body = await response.text();
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      failures.push(`${name}: HTTP ${response.status}`);
      return;
    }
    if (!contentType.toLowerCase().includes('text/html')) {
      failures.push(`${name}: expected HTML but received ${contentType || 'unknown content type'}`);
      return;
    }
    if (!/<div[^>]+id=["']root["'][^>]*>/i.test(body)) {
      failures.push(`${name}: HTML root mount point was not found`);
      return;
    }
    if (!/<script[^>]+src=/i.test(body)) {
      failures.push(`${name}: HTML does not reference a JavaScript bundle`);
      return;
    }

    console.log(`PASS ${name}: HTTP ${response.status}, HTML runtime shell present`);
  } catch (error) {
    failures.push(`${name}: ${error.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : error.message}`);
  }
}

async function checkAuthCsrf() {
  try {
    const response = await fetchWithTimeout(`${apiUrl}/api/v1/auth/csrf`, {
      headers: { accept: 'application/json', 'user-agent': 'KAYAD-production-verifier/1.0' },
    });
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      failures.push(`API CSRF bootstrap: expected JSON, received ${text.slice(0, 120)}`);
      return;
    }
    if (!response.ok) {
      failures.push(`API CSRF bootstrap: HTTP ${response.status}, message=${payload?.message || 'unknown'}`);
      return;
    }
    if (payload?.success !== true || typeof payload?.csrfToken !== 'string' || payload.csrfToken.length < 32) {
      failures.push('API CSRF bootstrap: response did not contain a valid csrfToken');
      return;
    }
    console.log(`PASS API CSRF bootstrap: HTTP ${response.status}, token contract present`);
  } catch (error) {
    failures.push(`API CSRF bootstrap: ${error.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : error.message}`);
  }
}

async function checkApiRoute(name, baseUrl, path, validator) {
  if (!baseUrl) return;
  try {
    const response = await fetchWithTimeout(`${baseUrl}${path}`, {
      headers: { accept: 'application/json', 'user-agent': 'KAYAD-production-verifier/1.0' },
    });
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      failures.push(`${name}: expected JSON, received ${text.slice(0, 120)}`);
      return;
    }
    if (!response.ok) {
      failures.push(`${name}: HTTP ${response.status}, message=${payload?.message || 'unknown'}`);
      return;
    }
    const result = validator(payload);
    if (result !== true) {
      failures.push(`${name}: ${result}`);
      return;
    }
    console.log(`PASS ${name}: HTTP ${response.status}, contract present`);
  } catch (error) {
    failures.push(`${name}: ${error.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : error.message}`);
  }
}

const validateHealthPayload = (payload) => {
  const status = payload?.status;
  if (!['ok', 'healthy', 'degraded'].includes(status)) {
    return `unexpected service status ${JSON.stringify(status)}`;
  }
  if (status === 'unhealthy') return 'service reports unhealthy';
  return true;
};

const validateCarsPayload = (payload) => {
  if (payload?.success !== true) return 'success flag is not true';
  if (!Array.isArray(payload?.data) && !Array.isArray(payload?.cars)) return 'inventory data/cars array is missing';
  if (payload?.pagination && typeof payload.pagination.total !== 'number') return 'pagination.total is missing or not numeric';
  return true;
};

async function checkApi() {
  try {
    const response = await fetchWithTimeout(`${apiUrl}/health`, {
      headers: { accept: 'application/json', 'user-agent': 'KAYAD-production-verifier/1.0' },
    });
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      failures.push(`API health: expected JSON, received ${text.slice(0, 120)}`);
      return;
    }

    if (!response.ok) {
      failures.push(`API health: HTTP ${response.status}, status=${payload?.status || 'unknown'}`);
      return;
    }

    const status = payload?.status;
    if (status === 'unhealthy') {
      failures.push('API health: service reports unhealthy');
      return;
    }
    if (!['ok', 'healthy', 'degraded'].includes(status)) {
      failures.push(`API health: unexpected service status ${JSON.stringify(status)}`);
      return;
    }
    if (status === 'degraded') {
      warnings.push('API health: service reports degraded status (HTTP 200)');
    }

    const buildId = payload?.buildId || response.headers.get('x-kayad-build-id') || '';
    if (!buildId || buildId === 'unknown') {
      warnings.push('API health: runtime build identity is unknown; deployment drift cannot be conclusively diagnosed from the API');
    } else {
      console.log(`PASS API runtime identity: ${buildId}`);
    }

    console.log(`PASS API health: HTTP ${response.status}, status=${status}`);
    for (const [name, check] of Object.entries(payload.checks || {})) {
      console.log(`  ${name}: ${check?.status || 'unknown'}`);
    }
  } catch (error) {
    failures.push(`API health: ${error.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : error.message}`);
  }
}

console.log('KAYAD production deployment verification');
console.log(`Deployment URL: ${deploymentUrl || '(not supplied)'}`);
console.log(`Public URL: ${publicUrl}`);
console.log(`API URL: ${apiUrl}`);

assertUrl('Deployment URL', deploymentUrl);
assertUrl('Public URL', publicUrl);
assertUrl('API URL', apiUrl);

if (!deploymentUrl) failures.push('Deployment URL: deployment command returned no URL');

if (!failures.length) {
  if (process.env.VERIFY_ONLY !== 'release') await checkFrontend('Vercel deployment', deploymentUrl);
  await checkReleaseIdentity();
  await checkPublicDomainMatchesDeployment();
  // VERIFY_ONLY=release runs just the release-identity checks (used by the mock-server tests and for ad-hoc domain parity checks).
  if (process.env.VERIFY_ONLY !== 'release') {
  await checkFrontend('Public production domain', publicUrl);
  await checkApi();

  // Verify the exact browser-facing rewrite contract, not just the upstream
  // API origin. A deployment can serve the SPA correctly while /api/* still
  // falls through, rewrites incorrectly, or returns the wrong content type.
  await checkApiRoute('Vercel deployment /api/health', deploymentUrl, '/api/health', validateHealthPayload);
  await checkApiRoute('Vercel deployment /api/cars', deploymentUrl, '/api/cars?limit=1', validateCarsPayload);
  await checkApiRoute('Public production /api/health', publicUrl, '/api/health', validateHealthPayload);
  await checkApiRoute('Public production /api/cars', publicUrl, '/api/cars?limit=1', validateCarsPayload);

  await checkAuthCsrf();
  }
}

for (const warning of warnings) console.log(`WARN ${warning}`);

if (failures.length) {
  console.error('\nProduction verification FAILED:');
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log(`\nProduction verification PASSED: ${warnings.length ? `with ${warnings.length} warning(s)` : 'all checks green'}`);
