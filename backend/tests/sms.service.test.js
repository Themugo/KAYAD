import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockSendSMS = jest.fn();
const mockLogInfo = jest.fn();
const mockLogError = jest.fn();

jest.unstable_mockModule("../utils/sms.js", () => ({
  __esModule: true,
  sendSMS: mockSendSMS,
}));

jest.unstable_mockModule("../utils/logger.js", () => ({
  __esModule: true,
  logInfo: mockLogInfo,
  logError: mockLogError,
}));

const {
  sendSMS,
  sendWelcomeSMS,
  sendBidPlacedSMS,
  sendOutbidSMS,
  sendEscrowReleasedSMS,
  sendEscrowRefundedSMS,
  sendChatMessageSMS,
  sendOTPSMS,
  sendSMSBidInvalidFormat,
  sendSMSBidNotRegistered,
  sendSMSBidNoAuctions,
  sendSMSBidNotLive,
  sendSMSBidOwnListing,
  sendSMSBidTooLow,
  sendSavedSearchAlert,
  sendAdminAlert,
} = await import("../services/sms.service.js");

describe("sms.service", () => {
  beforeEach(() => {
    mockSendSMS.mockClear();
    mockLogInfo.mockClear();
    mockLogError.mockClear();
  });

  it("re-exports sendSMS from utils/sms.js", () => {
    expect(sendSMS).toBe(mockSendSMS);
  });

  it("sendWelcomeSMS formats and sends", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendWelcomeSMS("254712345678", "Alice");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("Alice"));
    expect(mockLogInfo).toHaveBeenCalled();
  });

  it("sendBidPlacedSMS includes car and formatted amount", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendBidPlacedSMS("254712345678", "Toyota Prado", 500000);
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("Toyota Prado"));
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("500,000"));
  });

  it("sendOutbidSMS includes car and formatted amount", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendOutbidSMS("254712345678", "BMW X5", 600000);
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("outbid"));
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("600,000"));
  });

  it("sendEscrowReleasedSMS", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendEscrowReleasedSMS("254712345678", 2000000, "Mazda CX-5");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("2,000,000"));
  });

  it("sendEscrowRefundedSMS", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendEscrowRefundedSMS("254712345678", 1500000, "Nissan Note");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("1,500,000"));
  });

  it("sendChatMessageSMS includes sender name and car title", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendChatMessageSMS("254712345678", "Jane", "Mazda CX-5");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("Jane"));
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("Mazda CX-5"));
  });

  it("sendOTPSMS includes the code", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendOTPSMS("254712345678", "123456");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("123456"));
  });

  it("sendSMSBidInvalidFormat", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendSMSBidInvalidFormat("254712345678");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("BID"));
  });

  it("sendSMSBidNotRegistered", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendSMSBidNotRegistered("254712345678");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("not registered"));
  });

  it("sendSMSBidNoAuctions", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendSMSBidNoAuctions("254712345678");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("No active"));
  });

  it("sendSMSBidNotLive", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendSMSBidNotLive("254712345678");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("no longer live"));
  });

  it("sendSMSBidOwnListing", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendSMSBidOwnListing("254712345678");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("own listing"));
  });

  it("sendSMSBidTooLow includes current bid amount", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendSMSBidTooLow("254712345678", 300000);
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("300,000"));
  });

  it("sendSavedSearchAlert sends the message directly", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendSavedSearchAlert("254712345678", "New car found!");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", "New car found!");
  });

  it("sendAdminAlert sends the message directly", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendAdminAlert("254712345678", "Server alert");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", "Server alert");
  });

  it("logs error when SMS fails", async () => {
    mockSendSMS.mockResolvedValue(false);
    await sendWelcomeSMS("254712345678", "Bob");
    expect(mockLogError).toHaveBeenCalled();
    expect(mockLogInfo).not.toHaveBeenCalled();
  });

  it("handles null car title gracefully", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendBidPlacedSMS("254712345678", null, 1000);
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("vehicle"));
  });

  it("handles null fromName in chat SMS", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendChatMessageSMS("254712345678", null, "Corolla");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("a user"));
  });

  it("formats KES with toLocaleString", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendEscrowReleasedSMS("254712345678", 10000000, "Car");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("10,000,000"));
  });

  it("handles null amount in KES format", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendEscrowReleasedSMS("254712345678", null, "Car");
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("0"));
  });

  it("handles null car title in outbid and escalation SMS", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendOutbidSMS("254712345678", null, 1000);
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("vehicle"));
  });

  it("handles null car title in escrow released SMS", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendEscrowReleasedSMS("254712345678", 100000, null);
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("vehicle"));
  });

  it("handles null car title in escrow refunded SMS", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendEscrowRefundedSMS("254712345678", 50000, null);
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.stringContaining("vehicle"));
  });

  it("handles missing car title in chat SMS", async () => {
    mockSendSMS.mockResolvedValue(true);
    await sendChatMessageSMS("254712345678", "Jane", null);
    expect(mockSendSMS).toHaveBeenCalledWith("254712345678", expect.not.stringContaining("about"));
  });
});
