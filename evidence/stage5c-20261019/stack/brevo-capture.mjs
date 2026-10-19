/* eslint-disable no-undef -- Node-run acceptance harness, not application code */
// LOCAL TEST HARNESS ONLY (never shipped, never used outside the disposable stack). Preloaded with `node --import`.
// Intercepts the Brevo adapter's outbound HTTPS call, records it (recipient/subject/html/text) to a JSONL file for the
// browser acceptance run, and answers like Brevo would (201 + messageId). EVIDENCE TIER: provider stub — NOT live delivery.
import fs from "node:fs";
const OUT = process.env.BREVO_CAPTURE_FILE || "/home/claude/s5c/stack/brevo-captures.jsonl";
const real = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input?.url;
  if (url && url.startsWith("https://api.brevo.com/")) {
    const body = JSON.parse(init?.body || "{}");
    // failure injection: while this flag file exists the stub behaves like a provider outage (HTTP 503), nothing is "delivered".
    if (process.env.BREVO_FAIL_FLAG && fs.existsSync(process.env.BREVO_FAIL_FLAG)) {
      fs.appendFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), failed: true, to: body.to, subject: body.subject }) + "\n");
      return new Response(JSON.stringify({ message: "injected provider outage" }), { status: 503, headers: { "content-type": "application/json" } });
    }
    fs.appendFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), to: body.to, subject: body.subject, text: body.textContent, html: body.htmlContent, sender: body.sender }) + "\n");
    return new Response(JSON.stringify({ messageId: `<capture-${Date.now()}@local>` }), { status: 201, headers: { "content-type": "application/json" } });
  }
  return real(input, init);
};

// ── Africa's Talking SMS stub (LOCAL TEST HARNESS ONLY; provider stub, NOT live SMS delivery) ──
// The SMS adapter uses axios, so the stub installs a request adapter on the shared axios instance. Records to sms-captures.jsonl.
// Failure injection: while sms.fail exists the stub answers like a rejected send.
try {
  // Must be the SAME module instance the adapter imports (ESM build), not the CommonJS one.
  const { default: axios } = await import("/home/claude/s5c/work/backend/node_modules/axios/index.js");
  const SMS_OUT = process.env.SMS_CAPTURE_FILE || "/home/claude/s5c/stack/sms-captures.jsonl";
  axios.interceptors.request.use((config) => {
    if (String(config.url || "").startsWith("https://api.africastalking.com/")) {
      config.adapter = async (cfg) => {
        const p = new URLSearchParams(String(cfg.data || ""));
        const fail = process.env.SMS_FAIL_FLAG && fs.existsSync(process.env.SMS_FAIL_FLAG);
        fs.appendFileSync(SMS_OUT, JSON.stringify({ at: new Date().toISOString(), to: p.get("to"), message: p.get("message"), failed: !!fail }) + "\n");
        const data = { SMSMessageData: { Recipients: [fail ? { status: "InvalidSenderId", number: p.get("to") } : { status: "Success", number: p.get("to"), messageId: `ATXid_capture_${Date.now()}`, cost: "KES 0.8000" }] } };
        return { data, status: 201, statusText: "Created", headers: {}, config: cfg, request: {} };
      };
    }
    return config;
  });
} catch (e) { console.error("sms stub not installed:", e.message); }
