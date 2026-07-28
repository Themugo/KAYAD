import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Chained mocks: find → populate → sort → skip → limit → lean
const mockLean = jest.fn();
const mockLimit = jest.fn(() => ({ lean: mockLean }));
const mockSkip = jest.fn(() => ({ limit: mockLimit }));
const mockSort = jest.fn(() => ({ skip: mockSkip }));
const mockPopulate = jest.fn(() => ({ sort: mockSort }));
const mockFind = jest.fn(() => ({ populate: mockPopulate }));
const mockCountDocuments = jest.fn();
const mockAggregate = jest.fn();

jest.unstable_mockModule("../models/SecurityLog.js", () => ({
  default: {
    find: mockFind,
    countDocuments: mockCountDocuments,
    aggregate: mockAggregate,
  },
}));

describe("securityLogController", () => {
  let ctrl;

  beforeAll(async () => {
    ctrl = await import("../controllers/securityLogController.js");
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLean.mockResolvedValue([]);
    mockLimit.mockReturnValue({ lean: mockLean });
    mockSkip.mockReturnValue({ limit: mockLimit });
    mockSort.mockReturnValue({ skip: mockSkip });
    mockPopulate.mockReturnValue({ sort: mockSort });
    mockFind.mockReturnValue({ populate: mockPopulate });
    mockCountDocuments.mockResolvedValue(0);
    mockAggregate.mockResolvedValue([]);
  });

  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  describe("getSecurityLogs", () => {
    it("returns paginated logs", async () => {
      mockLean.mockResolvedValue([{ _id: "log1", action: "login", severity: "info" }]);
      mockCountDocuments.mockResolvedValue(1);

      const res = mockRes();
      await ctrl.getSecurityLogs({ query: { page: "1", limit: "50" } }, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          logs: [{ _id: "log1", action: "login", severity: "info" }],
          pagination: { page: 1, limit: 50, total: 1, pages: 1 },
        }),
      );
    });

    it("returns 500 on error", async () => {
      mockLean.mockRejectedValue(new Error("fail"));
      const res = mockRes();
      await ctrl.getSecurityLogs({ query: {} }, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getMySecurityLogs", () => {
    it("returns paginated logs for current user", async () => {
      mockLean.mockResolvedValue([{ _id: "log1", action: "login" }]);
      mockCountDocuments.mockResolvedValue(1);

      const res = mockRes();
      await ctrl.getMySecurityLogs({ user: { id: "user1" }, query: {} }, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("returns 500 on error", async () => {
      mockLean.mockRejectedValue(new Error("fail"));
      const res = mockRes();
      await ctrl.getMySecurityLogs({ user: { id: "u1" }, query: {} }, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getSecurityLogSummary", () => {
    it("returns summary with total, critical count, and recent actions", async () => {
      mockCountDocuments.mockResolvedValueOnce(100).mockResolvedValueOnce(5);
      mockAggregate.mockResolvedValue([{ _id: "login", count: 50 }]);

      const res = mockRes();
      await ctrl.getSecurityLogSummary({}, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        summary: { total: 100, criticalCount: 5, recentActions: [{ _id: "login", count: 50 }] },
      });
    });

    it("returns 500 on error", async () => {
      mockCountDocuments.mockRejectedValue(new Error("fail"));
      const res = mockRes();
      await ctrl.getSecurityLogSummary({}, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
