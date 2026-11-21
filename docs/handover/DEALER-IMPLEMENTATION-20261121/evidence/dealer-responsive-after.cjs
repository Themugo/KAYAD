// Real-browser responsive/accessibility measurement of the dealer workspace (run against the disposable stack).
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const { execSync } = require('child_process');
const OUT = process.argv[2], PW = 'Str0ng!Passw0rd', BASE = 'http://127.0.0.1:4302';
const email = execSync(`psql -h 127.0.0.1 -U postgres -d kayad_ci -tAc "select email from users where email like 'dealera-%' order by created_at desc limit 1"`).toString().trim();
const VPS = [[1920,1080],[1440,900],[1280,800],[1024,768],[768,1024],[430,932],[390,844],[375,812],[360,800]];
const SECTIONS = ['overview','inventory','banking'];
(async () => {
  const b = await chromium.launch(); const rep = [];
  for (const [w, h] of VPS) {
    const c = await b.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
    await p.goto(BASE + '/login', { waitUntil: 'networkidle' });
    await p.getByLabel(/email/i).first().fill(email); await p.getByLabel(/password/i).first().fill(PW);
    await p.getByRole('button', { name: /continue to kayard ke/i }).click(); await p.waitForTimeout(2500);
    for (const s of SECTIONS) {
      await p.goto(`${BASE}/?nav=dealer-dashboard&section=${s}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
      const m = await p.evaluate(() => {
        const aside = document.getElementById('dealer-workspace-sidebar'); const nav = aside && aside.querySelector('nav');
        const footer = document.querySelector('[data-testid="dealer-sidebar-footer"]');
        const signout = footer && [...footer.querySelectorAll('button')].find((e) => /Sign out/i.test(e.textContent));
        const rr = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; };
        const asideVisible = aside && getComputedStyle(aside).display !== 'none';
        const numbers = [...document.querySelectorAll('[data-testid="inventory-row-number"],[data-testid="inventory-row-number-mobile"]')].map((e) => e.textContent).slice(0, 6);
        return { asideVisible, asideRect: rr(aside), footerRect: rr(footer), signoutRect: rr(signout), navScrollH: nav && nav.scrollHeight, navClientH: nav && nav.clientHeight, vh: innerHeight, hOverflow: document.documentElement.scrollWidth > innerWidth + 1, numbers };
      });
      rep.push({ w, h, s, ...m });
      await p.screenshot({ path: `${OUT}/${s}-${w}x${h}.png`, fullPage: false });
    }
    if (w < 1024) {
      await p.goto(`${BASE}/?nav=dealer-dashboard&section=overview`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
      const btn = p.getByRole('button', { name: /dealer menu/i }).first(); await btn.click(); await p.waitForTimeout(400);
      const d = await p.evaluate(() => { const a = document.getElementById('dealer-workspace-sidebar'); const so = [...a.querySelectorAll('button')].find((e) => /Sign out/i.test(e.textContent)); const r = so.getBoundingClientRect(); const ae = document.activeElement; return { signoutInViewport: r.top >= 0 && r.bottom <= innerHeight, signoutH: Math.round(r.height), focusInside: a.contains(ae), focusLabel: (ae && (ae.getAttribute('aria-label') || ae.textContent || '')).trim().slice(0, 40), bodyOverflow: getComputedStyle(document.body).overflow }; });
      await p.screenshot({ path: `${OUT}/drawer-open-${w}x${h}.png` });
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      const back = await p.evaluate(() => ({ closed: getComputedStyle(document.getElementById('dealer-workspace-sidebar')).display === 'none', focusOnMenu: /dealer menu/i.test(document.activeElement && document.activeElement.textContent || '') }));
      rep.push({ w, h, s: 'drawer', ...d, ...back });
    }
    rep.push({ w, consoleErrors: [...new Set(errs)].slice(0, 4) });
    await c.close();
  }
  require('fs').writeFileSync(`${OUT}/../../evidence/dealer-responsive-after.json`, JSON.stringify(rep, null, 1)); console.log('rows', rep.length); await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
