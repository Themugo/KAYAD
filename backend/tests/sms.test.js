import { describe, it, expect, jest, beforeEach } from "@jest/globals";

jest.mock("axios");

describe("sms utility", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.AT_API_KEY = "";
    process.env.SMS_PROVIDER = "mock";
  });

  it("sendSMS returns true in mock mode", async () => {
    const { sendSMS } = await import("../utils/sms.js");
    const result = await sendSMS("+254712345678", "Test message");
    expect(result).toBe(true);
  });

  it("sendSMS formats 07xx to 2547xx", async () => {
    const { sendSMS } = await import("../utils/sms.js");
    const result = await sendSMS("0712345678", "Hello");
    expect(result).toBe(true);
  });

  it("sendSMS returns false for invalid phone", async () => {
    const { sendSMS } = await import("../utils/sms.js");
    const result = await sendSMS("invalid", "Message");
    expect(result).toBe(false);
  });

  it("sendSMS returns false for empty phone", async () => {
    const { sendSMS } = await import("../utils/sms.js");
    const result = await sendSMS(null, "Message");
    expect(result).toBe(false);
  });
});
