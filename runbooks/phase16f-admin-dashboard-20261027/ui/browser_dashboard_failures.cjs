/* global process, console, setTimeout */
// REAL-STACK: dashboard warnings against REAL backend failures (database/PostgREST stopped mid-session), never an empty queue.
// usage: node browser_dashboard_failures.cjs <spaBase> <outDir>   (disposable stack only: it stops and restarts PostgREST)
const fs = require('fs'); const { execSync } = require('child_process');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const L = require('../../phase16-20261026/e2e_lib.cjs'); const { check, sql } = L;
const [SPA, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const startPgrst = () => execSync('(setsid nohup /home/claude/pgrest/postgrest /home/claude/p16b/pgrst16b.conf >/dev/null 2>&1 < /dev/null &) ; sleep 3');
(async () => {
  const OWNER = 'owner148@example.test';
  sql(`update users set email='retired_'||id||'@example.test' where email='${OWNER}'`);
  const u = await L.register('user', { name: 'Amina Otieno' }); await L.verifyEmailViaToken(u.email);
  sql(`update users set role='superadmin', status='approved', email_verified=true, email='${OWNER}' where email='${u.email}'`);
  await new Promise((r) => setTimeout(r, 6000));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  await p.goto(SPA + '/login'); await p.fill('input[type=email]', OWNER); await p.fill('input[type=password]', L.PASSWORD); await p.click('button[type=submit]');
  await p.waitForURL((x) => !/\/login/.test(x.pathname), { timeout: 15000 }); await p.goto(SPA + '/admin'); await p.waitForSelector('.kayad-command-hero'); await p.waitForTimeout(3000);
  const body = async () => (await p.textContent('body')) || '';
  let t = await body();
  check('F1 healthy + genuinely empty: the empty dealer queue says it is empty, with no warning', /No pending dealers returned/.test(t) && (await p.locator('[role=alert]').count()) === 0);
  await p.screenshot({ path: `${OUT}/failures_healthy_empty.png` });
  try { execSync('pkill -x postgrest || true'); } catch { /* none running */ }
  await new Promise((r) => setTimeout(r, 1500));
  await p.getByRole('button', { name: 'Refresh administration data' }).click(); await p.waitForTimeout(5000);
  t = await body(); const alert = ((await p.locator('[role=alert]').allTextContents()).join(' | '));
  console.log('ALERT (database down):', alert.slice(0, 420));
  check('F2 a real backend failure produces a warning naming a cause (not maintenance, not silent)', /Some operational data sources are unavailable/.test(alert) && /Cause:/.test(alert) && !/platform is in maintenance/.test(alert), alert.slice(0, 200));
  check('F3 the failed approval queue is NOT presented as empty', !/No pending dealers returned/.test(t) && /Approval records may be unavailable|unavailable/i.test(t));
  check('F4 figures are not invented: stale values are labelled, never silently kept as fresh', /Showing last successful statistics|Live data pending/.test(t));
  await p.screenshot({ path: `${OUT}/failures_database_down.png` });
  startPgrst(); await new Promise((r) => setTimeout(r, 2000));
  await p.getByRole('button', { name: 'Retry loading unavailable data' }).click().catch(() => {}); await p.waitForTimeout(4500);
  t = await body();
  check('F5 Retry after recovery clears the warning and shows the real (empty) queue again', (await p.locator('[role=alert]').count()) === 0 && /No pending dealers returned/.test(t));
  await b.close();
  console.log('RESULT', L.results.filter((r) => r.ok).length, 'pass', L.results.filter((r) => !r.ok).length, 'fail');
  process.exit(L.results.some((r) => !r.ok) ? 1 : 0);
})().catch((e) => { try { startPgrst(); } catch { /* ignore */ } console.error(e); process.exit(2); });
