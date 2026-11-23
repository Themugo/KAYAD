// Team invitation e-mails: recipients, content and secrecy. Capture-only: global fetch is mocked, NO real network or Brevo call is made.
import nodeFs from "fs";
import { describe, test, expect, jest, beforeAll, beforeEach, afterAll } from "@jest/globals";

const captured = [];
const realFetch = global.fetch;
beforeAll(() => {
  process.env.BREVO_API_KEY = "test-key-not-real";
  process.env.BREVO_FROM_EMAIL = "noreply@example.test";
  process.env.FRONTEND_URL = "https://app.example.test";
  process.env.SUPPORT_EMAIL = "support@example.test";
  global.fetch = jest.fn(async (url, init) => {
    captured.push({ url: String(url), body: JSON.parse(init.body) });
    return { ok: true, status: 201, text: async () => '{"messageId":"<m1@brevo>"}', json: async () => ({ messageId: "<m1@brevo>" }) };
  });
});
afterAll(() => { global.fetch = realFetch; });
beforeEach(() => { captured.length = 0; });
const load = () => import("../../services/email.service.js");
const TOKEN = "ab".repeat(32);
const recipients = (b) => [...(b.to || []), ...(b.cc || []), ...(b.bcc || [])].map((x) => x.email);

describe("invitee e-mail", () => {
  test("goes to exactly one recipient (the invitee): no cc, no bcc, nobody at KAYARD KE", async () => {
    const m = await load();
    await m.sendTeamInviteEmail("staff@example.test", "Amani Motors", "sales_agent", TOKEN, { invitedBy: "Wanjiru Kamau" });
    expect(captured).toHaveLength(1);
    expect(recipients(captured[0].body)).toEqual(["staff@example.test"]);
    expect(captured[0].body.cc).toBeUndefined();
    expect(captured[0].body.bcc).toBeUndefined();
  });
  test("names the dealership, the role and who invited; explains acceptance, sign-in vs register, expiry and how to report", async () => {
    const m = await load();
    const e = m.buildTeamInviteEmail({ dealerName: "Amani Motors", role: "sales_agent", token: TOKEN, invitedBy: "Wanjiru Kamau" });
    for (const text of [e.text, e.html]) {
      expect(text).toContain("Amani Motors");
      expect(text).toContain("sales agent");
      expect(text).toContain("Wanjiru Kamau");
      expect(text).toMatch(/does not become a dealer account/);
      expect(text).toMatch(/sign in/i);
      expect(text).toMatch(/create a free personal account/i);
      expect(text).toMatch(/7 days/);
      expect(text).toContain("support@example.test");
      expect(text).toMatch(/only the newest link works/);
    }
    expect(e.text).toContain(`https://app.example.test/dealer/setup?invite=${TOKEN}`);
    expect(e.subject).toContain("Amani Motors");
  });
  test("the report address never carries the token", async () => {
    const m = await load();
    const e = m.buildTeamInviteEmail({ dealerName: "A", role: "viewer", token: TOKEN });
    expect(e.text.match(/support@example\.test[^\n]*/g).join("")).not.toContain(TOKEN);
  });
  test("untrusted dealership / inviter names are escaped in HTML", async () => {
    const m = await load();
    const evil = `<img src=x onerror=alert(1)>`;
    const e = m.buildTeamInviteEmail({ dealerName: evil, role: "viewer", token: TOKEN, invitedBy: `<b>x</b>` });
    expect(e.html).not.toContain("<img src=x");
    expect(e.html).not.toContain("<b>x</b>");
  });
});

describe("dealer acceptance e-mail", () => {
  test("goes only to the dealership address, contains no invitation token or accept link, and points at the dealer's Team page", async () => {
    const m = await load();
    await m.sendTeamAcceptedEmail("owner@amani.test", { dealerName: "Amani Motors", memberName: "New Person", memberEmail: "new@amani.test", role: "viewer" });
    expect(recipients(captured[0].body)).toEqual(["owner@amani.test"]);
    const blob = JSON.stringify(captured[0].body);
    expect(blob).not.toMatch(/invite=|dealer\/setup|[0-9a-f]{64}/);
    expect(blob).toContain("section=team");
    expect(blob).toContain("New Person");
  });
});

describe("no invitation mail is routed to KAYARD (source guard)", () => {
  const fs = nodeFs;
  const ctrl = fs.readFileSync(new URL("../../controllers/dealerPlatformController.js", import.meta.url), "utf8");
  test("team invitation e-mail calls only ever address the invitee or the owning dealership", () => {
    const inviteCalls = [...ctrl.matchAll(/await deliverInvite\(([^,]+),/g)].map((m) => m[1].trim());
    expect(inviteCalls.sort()).toEqual(["email", "existing.inviteEmail"].sort());
    const accepted = [...ctrl.matchAll(/sendTeamAcceptedEmail\(([^,]+),/g)].map((m) => m[1].trim());
    expect(accepted).toEqual(["dealer.email"]);
    expect(ctrl).not.toMatch(/ADMIN_EMAIL|SUPERADMIN_EMAIL|OWNER_EMAIL|bcc/i);
  });
  test("the e-mail service sends team mail with a single `to` and never sets cc/bcc for it", () => {
    const svc = fs.readFileSync(new URL("../../services/email.service.js", import.meta.url), "utf8");
    const block = svc.slice(svc.indexOf("export const sendTeamInviteEmail"), svc.indexOf("export const sendVerificationReminderEmail"));
    expect(block).not.toMatch(/\bcc\b|\bbcc\b/i);
  });
});
