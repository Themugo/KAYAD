// AA-D2: the PUBLIC GET /api/dealer-health-score/:dealerId response must not
// carry the dealer's private email address. (Access policy is intentionally
// unchanged pending a business decision; only the PII field is removed.)
import { describe, test, expect, jest } from "@jest/globals";

const populate = jest.fn();
const findOne = jest.fn(() => ({ populate: (...a) => { populate(...a); return Promise.resolve({ dealer: { name: "D" }, totalScore: 80 }); } }));
jest.unstable_mockModule("../../models/DealerHealthScore.js", () => ({ default: { findOne } }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), default: {} }));
jest.unstable_mockModule("../../config/alerting.js", () => ({ triggerAlert: jest.fn(), ALERT_LEVELS: {} }));
jest.unstable_mockModule("../../services/dealerHealthScoreService.js", () => ({ calculateHealthScore: jest.fn(), recalculateAllScores: jest.fn(), getTopDealers: jest.fn(), getDealerRank: jest.fn() }));

const { getDealerHealthScore } = await import("../../controllers/dealerHealthScoreController.js");

describe("public dealer health score — PII", () => {
  test("does not request the dealer's email field", async () => {
    const res = { json: jest.fn(), status: jest.fn(() => res) };
    await getDealerHealthScore({ params: { dealerId: "d1" } }, res);
    expect(populate).toHaveBeenCalledTimes(1);
    const [path, fields] = populate.mock.calls[0];
    expect(path).toBe("dealer");
    expect(fields.split(/\s+/)).not.toContain("email");
    expect(fields.split(/\s+/)).toEqual(expect.arrayContaining(["name", "businessName"]));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
