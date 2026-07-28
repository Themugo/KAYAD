import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockAuctionPopulate = jest.fn();
const mockAuctionFindById = jest.fn(() => ({ populate: mockAuctionPopulate }));
const mockTransactionCreate = jest.fn();
const mockTransactionFindOne = jest.fn();
const mockStkPush = jest.fn();
const mockSendNotification = jest.fn();

jest.unstable_mockModule("../models/Auction.js", () => ({
  default: { findById: mockAuctionFindById },
}));
jest.unstable_mockModule("../models/Transaction.js", () => ({
  default: { create: mockTransactionCreate, findOne: mockTransactionFindOne },
}));
jest.unstable_mockModule("../services/mpesaService.js", () => ({
  stkPush: mockStkPush,
}));
jest.unstable_mockModule("../services/notification.service.js", () => ({
  sendNotification: mockSendNotification,
}));

describe("bidSecurityService", () => {
  let service;

  beforeAll(async () => {
    service = await import("../services/bidSecurityService.js");
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initiateBidSecurity", () => {
    it("returns error if auction not found", async () => {
      mockAuctionPopulate.mockResolvedValue(null);
      const result = await service.initiateBidSecurity({ auctionId: "bad", userId: "u1", phone: "254700000000" });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Auction not found");
      expect(mockAuctionFindById).toHaveBeenCalledWith("bad");
    });

    it("creates transaction with mpesa mode on successful stkPush", async () => {
      const auction = {
        _id: "auction1",
        carId: { _id: "car1" },
        bidSecurityAmount: 50000,
        paymentRecipient: "KAYAD_ESCROW",
      };
      mockAuctionPopulate.mockResolvedValue(auction);
      mockStkPush.mockResolvedValue({ CheckoutRequestID: "CK-123" });
      mockTransactionCreate.mockResolvedValue({
        _id: "txn1",
        amount: 50000,
        status: "success",
        checkoutRequestId: "CK-123",
      });

      const result = await service.initiateBidSecurity({
        auctionId: "auction1",
        userId: "u1",
        phone: "254700000001",
        amount: 50000,
      });

      expect(mockStkPush).toHaveBeenCalledWith("254700000001", 50000, "174379");
      expect(mockTransactionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          user: "u1",
          car: "car1",
          amount: 50000,
          type: "bid_commitment",
        }),
      );
      expect(result.mode).toBe("mpesa");
      expect(result.checkoutID).toBe("CK-123");
    });

    it("falls back to mock mode when stkPush fails", async () => {
      const auction = {
        _id: "auction1",
        carId: "car1",
        bidSecurityAmount: 50000,
        paymentRecipient: "KAYAD_ESCROW",
      };
      mockAuctionPopulate.mockResolvedValue(auction);
      mockStkPush.mockRejectedValue(new Error("STK failed"));
      mockTransactionCreate.mockResolvedValue({ _id: "txn1" });

      const result = await service.initiateBidSecurity({
        auctionId: "auction1",
        userId: "u1",
        phone: "254700000001",
      });

      expect(result.mode).toBe("mock");
      expect(result.checkoutID).toMatch(/^MOCK_/);
    });

    it("uses dealer shortcode when paymentRecipient is DEALER_DIRECT", async () => {
      const auction = {
        _id: "auction1",
        carId: "car1",
        bidSecurityAmount: 30000,
        paymentRecipient: "DEALER_DIRECT",
        dealerMpesaShortcode: "555555",
      };
      mockAuctionPopulate.mockResolvedValue(auction);
      mockStkPush.mockResolvedValue({ CheckoutRequestID: "CK-456" });
      mockTransactionCreate.mockResolvedValue({ _id: "txn2" });

      await service.initiateBidSecurity({
        auctionId: "auction1",
        userId: "u1",
        phone: "254700000001",
      });

      expect(mockStkPush).toHaveBeenCalledWith("254700000001", 30000, "555555");
    });

    it("uses default security amount when not provided", async () => {
      const auction = {
        _id: "auction1",
        carId: "car1",
        bidSecurityAmount: null,
        paymentRecipient: "KAYAD_ESCROW",
      };
      mockAuctionPopulate.mockResolvedValue(auction);
      mockStkPush.mockResolvedValue({ CheckoutRequestID: "CK-789" });
      mockTransactionCreate.mockResolvedValue({ _id: "txn3", amount: 50000 });

      const result = await service.initiateBidSecurity({
        auctionId: "auction1",
        userId: "u1",
        phone: "254700000001",
      });

      expect(result.transaction.amount).toBe(50000);
    });
  });

  describe("handleBidSecurityCallback", () => {
    it("returns not found if transaction missing", async () => {
      mockTransactionFindOne.mockResolvedValue(null);
      const result = await service.handleBidSecurityCallback({ checkoutRequestID: "x" });
      expect(result.success).toBe(false);
    });

    it("marks transaction failed on non-zero resultCode", async () => {
      const tx = { status: "pending", save: jest.fn() };
      mockTransactionFindOne.mockResolvedValue(tx);
      const result = await service.handleBidSecurityCallback({
        checkoutRequestID: "CK-1",
        resultCode: 1,
      });
      expect(tx.status).toBe("failed");
      expect(result.success).toBe(false);
    });

    it("marks success and sends notification on zero resultCode", async () => {
      const tx = {
        _id: "txn1",
        status: "pending",
        amount: 50000,
        user: "u1",
        car: "car1",
        save: jest.fn(),
      };
      mockTransactionFindOne.mockResolvedValue(tx);
      mockSendNotification.mockResolvedValue();

      const result = await service.handleBidSecurityCallback({
        checkoutRequestID: "CK-1",
        resultCode: 0,
        mpesaReceipt: "MPR123",
      });

      expect(tx.status).toBe("success");
      expect(tx.mpesaReceipt).toBe("MPR123");
      expect(tx.save).toHaveBeenCalled();
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u1",
          title: "Bid Security Confirmed",
        }),
      );
      expect(result.success).toBe(true);
    });
  });
});
