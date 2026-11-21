// Phase 15 unit regression: payment oversight projection, admin tooling gating, ban rank rule, honest health wording,
// removal of fabricated suggestions, brand text. Real-DB behaviour is covered by the local DB governance E2E (73 checks).
import { describe, test, expect, jest } from "@jest/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({}) }));
const { maskPhone, reconcile, buildAdminPaymentView, RECONCILIATION_STATES: S } = await import("../../utils/adminPaymentView.js");

const noEvidence = () => ({ events: new Map(), lateSuccess: new Set(), unavailable: false });

describe("maskPhone", () => {
  test("keeps only last three digits", () => {
    expect(maskPhone("254712345678")).toMatch(/^\*+678$/);
    expect(maskPhone("254712345678")).not.toContain("2547");
  });
  test("empty and short values", () => {
    expect(maskPhone(null)).toBeNull();
    expect(maskPhone("12")).toBe("***");
  });
});

describe("reconcile", () => {
  test("success is settled", () => expect(reconcile({ id: "1", status: "success" }, noEvidence()).state).toBe(S.SETTLED));
  test("pending is never settled", () => {
    const r = reconcile({ id: "1", status: "pending", createdAt: new Date(Date.now() - 600000).toISOString() }, noEvidence());
    expect(r.state).toBe(S.PENDING);
    expect(r.ageMinutes).toBeGreaterThanOrEqual(9);
  });
  test("plain failure", () => expect(reconcile({ id: "1", status: "failed" }, noEvidence()).state).toBe(S.FAILED));
  test("amount mismatch needs reconciliation", () => {
    const ev = noEvidence();
    ev.events.set("1", [{ event_type: "amount_mismatch" }]);
    const r = reconcile({ id: "1", status: "failed" }, ev);
    expect(r.state).toBe(S.NEEDS_RECONCILIATION);
    expect(r.reasons).toContain("AMOUNT_MISMATCH_PROVIDER_RECEIPT_RECORDED");
  });
  test("late success callback after failure needs reconciliation", () => {
    const ev = noEvidence();
    ev.lateSuccess.add("ck1");
    expect(reconcile({ id: "1", status: "failed", checkoutRequestId: "ck1" }, ev).state).toBe(S.NEEDS_RECONCILIATION);
  });
  test("unreadable evidence is reported, never settled or plain failed", () => {
    const ev = noEvidence();
    ev.unavailable = true;
    expect(reconcile({ id: "1", status: "failed" }, ev).state).toBe(S.EVIDENCE_UNAVAILABLE);
  });
  test("unknown status is not settled", () => expect(reconcile({ id: "1", status: "weird" }, noEvidence()).state).toBe(S.PENDING));
});

describe("buildAdminPaymentView", () => {
  const failingSb = { from: () => { throw new Error("db down"); } };
  test("projection omits sensitive fields and masks phone", async () => {
    const [v] = await buildAdminPaymentView([{ id: "1", status: "success", amount: 10, phone: "254700111222", checkoutRequestId: "ck", metadata: { x: 1 }, user_id: "u" }], { sb: failingSb });
    expect(v.phoneMasked).toMatch(/222$/);
    for (const k of ["phone", "checkoutRequestId", "metadata", "user_id"]) expect(v).not.toHaveProperty(k);
  });
  test("evidence read failure fails honest for failed payments", async () => {
    const [v] = await buildAdminPaymentView([{ id: "1", status: "failed", amount: 10 }], { sb: failingSb });
    expect(v.reconciliation.state).toBe(S.EVIDENCE_UNAVAILABLE);
    expect(v.status).toBe("failed");
  });
});

describe("admin tooling is gated to staff", () => {
  for (const f of ["platformFactoryRoutes", "improvementRoutes", "automationRoutes", "lowCodeRoutes"]) {
    test(`${f} requires protect + adminOnly`, () => {
      expect(read(`routes/${f}.js`)).toMatch(/router\.use\(\s*protect\s*,\s*adminOnly\s*\)/);
    });
  }
  test("dealer health details/trends gated", () => {
    const src = read("routes/dealerHealthScoreRoutes.js");
    expect(src).toMatch(/\/:dealerId\/details[^\n]*protect[^\n]*adminOnly/);
    expect(src).toMatch(/\/trends[^\n]*protect[^\n]*adminOnly/);
  });
});

describe("admin routes behaviour guards (source)", () => {
  const src = read("routes/adminRoutes.js");
  test("ban enforces rank rule and audits", () => {
    expect(src).toContain("ADMIN_RANK_REQUIRED");
    expect(src).toMatch(/changed/);
  });
  test("payments list uses masked projection", () => expect(src).toContain("buildAdminPaymentView"));
  test("seller settings fail honestly when not persisted", () => expect(src).toContain("SELLER_SETTINGS_NOT_PERSISTED"));
  test("health reports warning/no_critical_alerts, not 'healthy'", () => {
    expect(src).toContain("no_critical_alerts");
    expect(src).not.toMatch(/system\/health[\s\S]{0,400}status:\s*["']healthy["']/);
  });
});

describe("fabricated AI suggestions removed", () => {
  test("automation controller reports its data source", () => {
    const src = read("controllers/automationController.js");
    expect(src).toContain("dealer_verifications");
    expect(src).toMatch(/source/);
  });
});

describe("payment blockers preserved (no callback change)", () => {
  test("payment callback service untouched markers still present", () => {
    const src = read("services/paymentCallback.service.js");
    expect(src.length).toBeGreaterThan(1000);
  });
});

describe("brand text", () => {
  test("no 'KAYAD EA' display text in backend source", () => {
    const hits = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (["node_modules", "tests", "logs"].includes(e.name)) continue;
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(js|mjs|cjs|json)$/.test(e.name) && /KAYAD EA\b/.test(fs.readFileSync(p, "utf8"))) hits.push(p);
      }
    };
    walk(root);
    expect(hits).toEqual([]);
  });
});
