/* eslint-disable no-undef -- Node-run acceptance harness, not application code */
// LOCAL TEST HARNESS ONLY (never shipped, never used outside the disposable stack). Preloaded with `node --import`.
// Intercepts the Brevo adapter's outbound HTTPS call, records it (recipient/subject/html/text) to a JSONL file for the
// browser acceptance run, and answers like Brevo would (201 + messageId). EVIDENCE TIER: provider stub — NOT live delivery.
import fs from "node:fs";
const OUT = process.env.BREVO_CAPTURE_FILE || "/home/claude/s5a/stack/brevo-captures.jsonl";
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
