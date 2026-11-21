// ============================================================
// STAGE 2 API CONTRACT CONVERGENCE — provider-health dead_letter finding
//
// getProviderHealth() tallied sent/delivered/failed/bounced per provider but
// never counted dead_letter (a delivery that exhausted all retries) in any
// bucket — it was counted in `total` but invisible as a failure, understating
// each provider's real failure rate on the admin provider-health surface.
// ============================================================

import { describe, test, expect, jest } from "@jest/globals";

const findAllMock = jest.fn();

jest.unstable_mockModule("../../db/index.js", () => ({
  findAll: findAllMock,
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}));
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  getSupabase: jest.fn(),
}));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({
  deliver: jest.fn(),
  sendUserCommunication: jest.fn(),
}));

const { getProviderHealth } = await import("../../services/communicationControl.service.js");

describe("getProviderHealth — dead_letter visibility", () => {
  test("a dead_letter delivery is counted in a dedicated bucket, not silently dropped", async () => {
    findAllMock.mockResolvedValue([
      { provider: "brevo", status: "sent" },
      { provider: "brevo", status: "delivered" },
      { provider: "brevo", status: "dead_letter" },
      { provider: "brevo", status: "dead_letter" },
    ]);

    const [brevo] = await getProviderHealth();

    expect(brevo.total).toBe(4);
    expect(brevo.deadLetter).toBe(2);
    // dead_letter deliveries must not inflate the success rate: only
    // sent+delivered (2 of 4) should count toward it.
    expect(brevo.successRate).toBe(50);
  });
});
