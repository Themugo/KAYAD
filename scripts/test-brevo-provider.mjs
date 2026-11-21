import assert from "node:assert/strict";

process.env.BREVO_API_KEY = "test-brevo-key";
process.env.BREVO_FROM_EMAIL = "noreply@kayad.space";
process.env.BREVO_FROM_NAME = "KAYAD";

let captured = null;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  captured = { url, options, body: JSON.parse(options.body) };
  return new Response(JSON.stringify({ messageId: "<test-brevo-message-id>" }), { status: 201, headers: { "content-type": "application/json" } });
};

try {
  const { getBrevoConfig, sendBrevoEmail } = await import("../backend/services/emailProvider.service.js");
  assert.deepEqual(getBrevoConfig(), { provider: "brevo", configured: true, from: "noreply@kayad.space", fromName: "KAYAD", webhookConfigured: false });
  const result = await sendBrevoEmail({
    to: "test@example.com",
    subject: "KAYAD provider test",
    html: "<p>hello</p>",
    text: "hello",
  });
  assert.equal(result.provider, "brevo");
  assert.equal(result.id, "<test-brevo-message-id>");
  assert.equal(captured.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(captured.options.headers["api-key"], "test-brevo-key");
  assert.equal(captured.body.sender.email, "noreply@kayad.space");
  assert.equal(captured.body.sender.name, "KAYAD");
  assert.deepEqual(captured.body.to, [{ email: "test@example.com" }]);
  assert.equal(captured.body.htmlContent, "<p>hello</p>");
  assert.ok(Array.isArray(captured.body.tags));
  console.log("PASS Brevo provider adapter contract");
} finally {
  globalThis.fetch = originalFetch;
}
