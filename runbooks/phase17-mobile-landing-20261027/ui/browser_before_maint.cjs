/* global console, document, process, setTimeout */
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const { execSync } = require('child_process');
const sql = q => execSync(`psql -h 127.0.0.1 -p 54329 -U postgres -d kayad_t -q -c "${q}"`, { stdio: 'pipe' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  sql(`update system_settings set value = jsonb_set(value,'{isMaintenanceMode}','true') where key='system_status'`); await sleep(11000);
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true }); const p = await c.newPage();
  await p.goto(process.argv[2] + '/', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1200);
  console.log(JSON.stringify(await p.evaluate(() => ({ strip: document.querySelector('#market-journey').innerText.replace(/\n/g, ' | '), panel: [...document.querySelectorAll('[role=status] h3,[role=status] p')].map(e => e.textContent) }))));
  await p.screenshot({ path: '/home/claude/p17/shots/before-state-maintenance.png' });
  await b.close();
  sql(`update system_settings set value = jsonb_set(value,'{isMaintenanceMode}','false') where key='system_status'`);
})();
