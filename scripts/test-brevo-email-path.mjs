import assert from "node:assert/strict";

process.env.BREVO_API_KEY = "test-brevo-key";
process.env.BREVO_FROM_EMAIL = "noreply@kayad.space";
process.env.BREVO_FROM_NAME = "KAYAD";

let captured = null;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  captured = { url, options, body: JSON.parse(options.body) };
  return new Response(JSON.stringify({ messageId: "<e2e-brevo-message-id>" }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
};

try {
  const { sendRawEmail } = await import("../backend/services/email.service.js");
  const result = await sendRawEmail({
    to: "test@example.com",
    subject: "KAYAD internal Brevo path test",
    html: "<p>KAYAD internal test</p>",
    text: "KAYAD internal test",
  });
  assert.equal(result.success, true);
  assert.equal(result.provider, "brevo");
  assert.equal(result.id, "<e2e-brevo-message-id>");
  assert.equal(captured.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(captured.options.headers["api-key"], "test-brevo-key");
  assert.equal(captured.body.sender.email, "noreply@kayad.space");
  assert.equal(captured.body.sender.name, "KAYAD");
  assert.deepEqual(captured.body.to, [{ email: "test@example.com" }]);
  assert.equal(captured.body.subject, "KAYAD internal Brevo path test");
  assert.equal(captured.body.htmlContent, "<p>KAYAD internal test</p>");
  assert.equal(Object.hasOwn(captured.body, "textContent"), false);
  console.log("PASS end-to-end email.service -> Brevo adapter -> HTTP contract");
} finally {
  globalThis.fetch = originalFetch;
}
