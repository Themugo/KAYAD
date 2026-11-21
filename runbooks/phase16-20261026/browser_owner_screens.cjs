// PHASE 16 - MOCKED browser check (all /api calls intercepted; no backend). Captures the owner-management and sign-in MFA screens.
const { chromium } = require('playwright');
const OUT = process.argv[2];
const user = { _id: 'o1', id: 'o1', name: 'Owner Fixture', email: 'owner@example.test', role: 'superadmin', isOwner: true, emailVerified: true, status: 'approved' };
const overview = { success: true, canManage: true, self: { id: 'o1' }, bootstrap: { status: 'closed' }, store: { mode: 'database' },
  members: [{ id: 'm1', userId: 'o1', email: 'owner@example.test', name: 'Owner Fixture', status: 'active', usable: true, activatedAt: '2026-10-20T09:00:00Z', addedBy: 'bootstrap' }, { id: 'm2', userId: 'o2', email: 'second@example.test', name: 'Second Owner', status: 'active', usable: true, activatedAt: '2026-10-25T09:00:00Z', addedBy: 'owner@example.test' }],
  invitations: [], events: [{ id: 1, at: '2026-10-25T09:00:00Z', action: 'invitation_accept', result: 'success', actor: 'second@example.test', targetEmail: 'second@example.test', reason: '' }] };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
  let enrolled = false, loginTries = 0;
  await p.route('**/api/**', async (r) => {
    const u = new URL(r.request().url()), path = u.pathname, m = r.request().method();
    const j = (o, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(o) });
    if (/auth\/csrf/.test(path)) return j({ success: true, csrfToken: 'x'.repeat(40) });
    if (/auth\/me/.test(path)) return globalThis.__anon ? j({ success: false, message: 'no' }, 401) : j({ success: true, user });
    if (/auth\/login/.test(path)) { loginTries++; const body = JSON.parse(r.request().postData() || '{}'); return body.mfaCode ? j({ success: true, user }) : j({ success: false, code: 'MFA_REQUIRED', mfaRequired: true, message: 'Enter the 6-digit code from your authenticator app, or a recovery code.' }, 401); }
    if (path === '/api/owner' || path === '/api/v1/owner') return j(overview);
    if (/owner\/mfa\/enroll/.test(path)) return j({ success: true, secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/KAYAD:owner' }, 201);
    if (/owner\/mfa\/activate/.test(path)) { enrolled = true; return j({ success: true, enrolled: true, recoveryCodes: ['7VGJ4-NU8MD', '4KKVZ-TEHVY', 'U57EP-T5378', 'RNF5U-AHVHV', 'EDQXD-S7H2L', '6Z7TB-UZTG8', '873SD-APCM8', 'UCDVW-BLG36', 'V8C9W-UULLB', 'WHM6G-JRYWD'] }); }
    if (/owner\/mfa/.test(path)) return j({ success: true, mfa: { installed: true, enrolled, pending: false, keyConfigured: true, policy: 'enrolled_only', recoveryCodesRemaining: enrolled ? 10 : 0 } });
    return j({ success: true, data: [], items: [] });
  });
  p.on('request', (q) => { if (/mfa/.test(q.url())) console.log('REQ', q.method(), q.url()); }); p.on('requestfailed', (q) => console.log('FAILED', q.url(), q.failure()?.errorText));
  await p.goto('http://127.0.0.1:4173/admin/owners'); await p.waitForSelector('text=Platform owners', { timeout: 20000 });
  await p.screenshot({ path: OUT + '/owners_mfa_off.png', fullPage: true });
  await p.click('text=Set up authenticator'); await p.fill('#mfa-pw', 'x'); await p.click('button:has-text("Continue")');
  await p.waitForTimeout(1500); await p.waitForSelector('[data-testid=mfa-secret]', { timeout: 5000 }); await p.screenshot({ path: OUT + '/owners_mfa_setup_key.png', fullPage: true });
  await p.fill('#mfa-code', '123456'); await p.click('button:has-text("Turn on")'); await p.waitForSelector('[data-testid=mfa-recovery-codes]');
  await p.screenshot({ path: OUT + '/owners_mfa_recovery_codes.png', fullPage: true });
  await p.click('text=I have saved them'); await p.waitForSelector('text=Authenticator app is on');
  await p.click('button:has-text("Invite owner")'); await p.waitForSelector('#own-mfa'); await p.screenshot({ path: OUT + '/owners_invite_dialog_with_code.png', fullPage: true });
  await p.setViewportSize({ width: 390, height: 844 }); await p.screenshot({ path: OUT + '/owners_mobile.png', fullPage: true });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  console.log('mobile horizontal overflow:', overflow);
  // sign-in MFA step
  const p2 = await ctx.newPage(); globalThis.__anon = true;
  await p2.route('**/api/**', async (r) => { const path = new URL(r.request().url()).pathname; const j = (o, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(o) });
    if (/auth\/csrf/.test(path)) return j({ success: true, csrfToken: 'x'.repeat(40) }); if (/auth\/me/.test(path)) return j({ success: false }, 401);
    if (/auth\/login/.test(path)) return j({ success: false, code: 'MFA_REQUIRED', mfaRequired: true, message: 'Enter the 6-digit code from your authenticator app, or a recovery code.' }, 401); return j({ success: true }); });
  await p2.goto('http://127.0.0.1:4173/login'); await p2.fill('input[type=email]', 'owner@example.test'); await p2.fill('input[type=password]', 'not-a-real-password'); await p2.click('button[type=submit]');
  await p2.waitForSelector('text=Authenticator code'); await p2.screenshot({ path: OUT + '/login_mfa_step.png', fullPage: true });
  await b.close(); console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
