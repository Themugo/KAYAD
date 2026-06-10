import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
};

jest.unstable_mockModule("axios", () => ({
  default: mockAxios,
}));

describe("mpesaB2C.service", () => {
  let service;

  beforeAll(async () => {
    // Set env vars before import
    process.env.MPESA_ENV = "sandbox";
    process.env.MPESA_CONSUMER_KEY = "test_key";
    process.env.MPESA_CONSUMER_SECRET = "test_secret";
    process.env.MPESA_SHORTCODE = "174379";
    process.env.MPESA_B2C_INITIATOR = "test_initiator";
    process.env.MPESA_B2C_INITIATOR_PW = "test_credential";
    service = await import("../services/mpesaB2C.service.js");
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("disburseB2C", () => {
    it("runs in mock mode when sandbox without initiator", async () => {
      // Temporarily remove initiator
      delete process.env.MPESA_B2C_INITIATOR;
      // Re-import to pick up env change
      const mod = await import("../services/mpesaB2C.service.js");

      const result = await mod.disburseB2C({
        phone: "254700000000",
        amount: 50000,
        escrowId: "escrow1",
        sellerName: "John",
      });
      expect(result.mock).toBe(true);
      expect(result.success).toBe(true);

      process.env.MPESA_B2C_INITIATOR = "test_initiator";
    });

    it("throws when live mode is selected but OAuth fails", async () => {
      mockAxios.get.mockRejectedValue(new Error("OAuth failed"));
      mockAxios.post.mockResolvedValue({
        data: {
          ConversationID: "C-1",
          OriginatorConversationID: "O-1",
          ResponseCode: "0",
          ResponseDescription: "Success",
        },
      });

      await expect(
        service.disburseB2C({ phone: "254700000000", amount: 50000, escrowId: "esc1", sellerName: "Jane" }),
      ).rejects.toThrow("OAuth failed");
    });

    it("makes a successful B2C disbursement in live mode", async () => {
      mockAxios.get.mockResolvedValue({
        data: { access_token: "test-token" },
      });
      mockAxios.post.mockResolvedValue({
        data: {
          ConversationID: "C-123",
          OriginatorConversationID: "O-456",
          ResponseCode: "0",
          ResponseDescription: "Accept the request",
        },
      });

      const result = await service.disburseB2C({
        phone: "254700000001",
        amount: 100000,
        escrowId: "escrow2",
        sellerName: "Alice",
      });

      expect(result.success).toBe(true);
      expect(result.conversationID).toBe("C-123");
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("mpesa/b2c/v1/paymentrequest"),
        expect.objectContaining({
          Amount: 100000,
          PartyB: "254700000001",
          CommandID: "BusinessPayment",
        }),
        expect.objectContaining({
          headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
        }),
      );
    });

    it("throws when response contains an error code", async () => {
      mockAxios.get.mockResolvedValue({
        data: { access_token: "test-token" },
      });
      mockAxios.post.mockResolvedValue({
        data: {
          ErrorCode: "500",
          ErrorMessage: "System error",
          ConversationID: "C-ERR",
        },
      });

      await expect(
        service.disburseB2C({ phone: "254700000002", amount: 20000, escrowId: "esc3", sellerName: "Bob" }),
      ).rejects.toThrow("M-Pesa B2C Error");
    });
  });

  describe("handleB2CCallback", () => {
    it("parses successful callback", async () => {
      const callback = {
        Result: {
          ResultCode: 0,
          ResultDesc: "Success",
          ConversationID: "C-1",
          ResultParameters: {
            ResultParameter: [
              { Key: "ReceiptNumber", Value: "MPR123" },
              { Key: "TransactionAmount", Value: 50000 },
              { Key: "ReceiverPartyPublicName", Value: "254700000001 - John" },
              { Key: "TransactionCompletedDateTime", Value: "20250101120000" },
            ],
          },
        },
      };

      const result = await service.handleB2CCallback(callback);
      expect(result.success).toBe(true);
      expect(result.transactionId).toBe("MPR123");
      expect(result.amount).toBe(50000);
    });

    it("parses failed callback", async () => {
      const callback = {
        Result: {
          ResultCode: 1,
          ResultDesc: "Failed",
          ConversationID: "C-2",
          ResultParameters: { ResultParameter: [] },
        },
      };

      const result = await service.handleB2CCallback(callback);
      expect(result.success).toBe(false);
      expect(result.resultCode).toBe(1);
      expect(result.transactionId).toBeNull();
    });

    it("throws when Result is missing", async () => {
      await expect(service.handleB2CCallback({})).rejects.toThrow("Invalid B2C callback");
    });
  });
});
