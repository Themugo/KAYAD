// Loopback-only e-mail provider STUB for disposable journeys (preloaded into the backend via NODE_OPTIONS). It is NOT Brevo:
// it records every outgoing message (so journeys can read the real invitation link the backend built) and can simulate a provider
// failure while the file named by BREVO_STUB_FAIL_FILE exists. No production-code change; no network traffic leaves the machine.
const fs = require('node:fs');
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  if (String(url).startsWith('https://api.brevo.com/')) {
    const body = (() => { try { return JSON.parse(init.body); } catch { return {}; } })();
    const fail = process.env.BREVO_STUB_FAIL_FILE && fs.existsSync(process.env.BREVO_STUB_FAIL_FILE);
    fs.appendFileSync(process.env.BREVO_STUB_LOG || '/tmp/brevo-stub.log', JSON.stringify({ at: new Date().toISOString(), to: body.to, subject: body.subject, html: body.htmlContent, failed: !!fail }) + '\n');
    return fail
      ? new Response(JSON.stringify({ message: 'stub provider failure' }), { status: 500, headers: { 'content-type': 'application/json' } })
      : new Response(JSON.stringify({ messageId: '<stub-' + Date.now() + '@example.test>' }), { status: 201, headers: { 'content-type': 'application/json' } });
  }
  return realFetch(url, init);
};
