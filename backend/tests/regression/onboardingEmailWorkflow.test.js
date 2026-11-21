// Onboarding/registration email workflow — capture-only (global fetch is mocked;
// NO real network or Brevo call is made).
import { describe, test, expect, jest, beforeAll, beforeEach, afterAll } from "@jest/globals";

const captured = [];
const realFetch = global.fetch;
let failNext = false;

beforeAll(() => {
  process.env.BREVO_API_KEY = "test-key-not-real";
  process.env.BREVO_FROM_EMAIL = "noreply@example.test";
  process.env.BREVO_REPLY_TO = "support@example.test";
  process.env.FRONTEND_URL = "https://app.example.test";
  global.fetch = jest.fn(async (url, init) => {
    captured.push({ url: String(url), body: JSON.parse(init.body), headers: init.headers });
    if (failNext) return { ok: false, status: 400, text: async () => "bad request", json: async () => ({ message: "bad" }) };
    return { ok: true, status: 201, text: async () => '{"messageId":"<m1@brevo>"}', json: async () => ({ messageId: "<m1@brevo>" }) };
  });
});
afterAll(() => { global.fetch = realFetch; });
beforeEach(() => { captured.length = 0; failNext = false; });

const load = () => import("../../services/email.service.js");

describe("onboarding email builders", () => {
  test("escape HTML in names and never emit raw tags", async () => {
    const m = await load();
    const evil = `<img src=x onerror=alert(1)>"Bob" & <a href="https://evil.test">click</a>`;
    for (const out of [
      m.buildVerificationEmail({ name: evil, verifyUrl: "https://app.example.test/verify-email?token=abc" }),
      m.buildWelcomeEmail({ name: evil }),
    ]) {
      expect(out.html).not.toContain("<img src=x");
      expect(out.html).not.toContain('href="https://evil.test"');
      expect(out.html).toContain("&lt;img");
    }
  });

  test("verification + reset emails carry the link in button, fallback text and plain text", async () => {
    const m = await load();
    const url = "https://app.example.test/verify-email?token=" + encodeURIComponent("a+b/c=");
    const v = m.buildVerificationEmail({ name: "Amina", verifyUrl: url });
    expect(v.html).toContain(`href="${url}"`);
    expect(v.text).toContain(url);
    expect(v.subject).toMatch(/Verify/);
    const r = m.buildPasswordResetEmail({ resetUrl: "https://app.example.test/reset-password?token=zzz" });
    expect(r.html).toContain("reset-password?token=zzz");
    expect(r.text).toContain("expires in 1 hour");
  });

  test("legacy templates escape dynamic values and encode tokens", async () => {
    const m = await load();
    await m.sendTeamInviteEmail("t@example.test", "<b>Evil</b>", "sales_agent", "a b&c");
    await m.sendNewMessageEmail({ email: "u@example.test", name: "U" }, "<script>x</script>", "<i>car</i>");
    await m.sendPasswordResetEmail({ email: "u@example.test", name: "U" }, "t+k/1");
    const html = captured.map((c) => c.body.htmlContent).join("\n");
    expect(html).not.toContain("<script>x</script>");
    expect(html).not.toContain("<b>Evil</b>");
    expect(html).toContain("invite=a%20b%26c");
    expect(html).toContain("token=t%2Bk%2F1");
  });
});

describe("provider capture", () => {
  test("Brevo request has sender, recipient, replyTo and api-key header", async () => {
    const m = await load();
    const r = await m.sendRawEmail({ to: "new.user@example.test", subject: "S", html: "<p>h</p>", text: "t" });
    expect(r.success).toBe(true);
    expect(captured).toHaveLength(1);
    const c = captured[0];
    expect(c.url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(c.body.sender.email).toBe("noreply@example.test");
    expect(c.body.to[0].email).toBe("new.user@example.test");
    expect(c.body.replyTo.email).toBe("support@example.test");
    expect(JSON.stringify(c.headers).toLowerCase()).toContain("api-key");
  });

  test("provider rejection returns success:false and does not throw", async () => {
    const m = await load();
    failNext = true;
    const r = await m.sendRawEmail({ to: "x@example.test", subject: "S", html: "<p>h</p>" });
    expect(r.success).toBe(false);
  }, 60000);

  test("missing BREVO_API_KEY is reported as disabled, not thrown", async () => {
    const m = await load();
    const k = process.env.BREVO_API_KEY; delete process.env.BREVO_API_KEY;
    const r = await m.sendRawEmail({ to: "x@example.test", subject: "S", html: "<p>h</p>" });
    process.env.BREVO_API_KEY = k;
    expect(r).toMatchObject({ success: false, disabled: true });
    expect(captured).toHaveLength(0);
  });
});
