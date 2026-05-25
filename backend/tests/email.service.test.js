import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockSendMail = jest.fn();

jest.mock("nodemailer", () => ({
  createTransport: () => ({ sendMail: mockSendMail }),
}));

describe("email.service", () => {
  beforeEach(() => {
    jest.resetModules();
    mockSendMail.mockReset();
    process.env.EMAIL_HOST = "smtp.test.com";
    process.env.EMAIL_USER = "user";
    process.env.EMAIL_PASS = "pass";
    process.env.EMAIL_FROM = "test@kayad.space";
    process.env.FRONTEND_URL = "https://kayad.space";
  });

  it("sendEmail returns disabled when EMAIL_HOST is not set", async () => {
    delete process.env.EMAIL_HOST;
    const { sendEmail } = await import("../services/email.service.js");
    const result = await sendEmail({ to: "a@b.com", subject: "Test", html: "<p>hi</p>" });
    expect(result).toEqual({ success: true, disabled: true });
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("sendWelcomeEmail formats correctly", async () => {
    mockSendMail.mockResolvedValue({ messageId: "abc" });
    const { sendWelcomeEmail } = await import("../services/email.service.js");
    await sendWelcomeEmail({ name: "John", email: "john@test.com", role: "user" });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("john@test.com");
    expect(call.subject).toContain("Welcome");
    expect(call.html).toContain("John");
    expect(call.html).toContain("Browse Cars Now");
  });

  it("sendVerificationEmail includes token link", async () => {
    mockSendMail.mockResolvedValue({ messageId: "abc" });
    const { sendVerificationEmail } = await import("../services/email.service.js");
    await sendVerificationEmail("a@b.com", "Alice", "token123");
    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).toContain("token123");
    expect(call.html).toContain("Verify Email");
  });

  it("sendPasswordResetEmail includes reset link", async () => {
    mockSendMail.mockResolvedValue({ messageId: "abc" });
    const { sendPasswordResetEmail } = await import("../services/email.service.js");
    await sendPasswordResetEmail({ name: "Bob", email: "bob@test.com" }, "resettoken");
    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).toContain("resettoken");
    expect(call.html).toContain("expires in 1 hour");
  });

  it("sendDealerApprovedEmail includes dealer link", async () => {
    mockSendMail.mockResolvedValue({ messageId: "abc" });
    const { sendDealerApprovedEmail } = await import("../services/email.service.js");
    await sendDealerApprovedEmail({ name: "DealerCo", email: "dealer@test.com" });
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("dealer@test.com");
    expect(call.html).toContain("/dealer/add-car");
    expect(call.html).toContain("approved");
  });

  it("sendBidConfirmationEmail includes bid amount", async () => {
    mockSendMail.mockResolvedValue({ messageId: "abc" });
    const { sendBidConfirmationEmail } = await import("../services/email.service.js");
    await sendBidConfirmationEmail(
      { name: "Bidder", email: "bidder@test.com" },
      { amount: 500000 },
      { title: "Toyota Prado", _id: "car123", auctionEnd: new Date().toISOString() }
    );
    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).toContain("Toyota Prado");
    expect(call.html).toContain("500,000");
  });

  it("sendOutbidEmail alerts the user", async () => {
    mockSendMail.mockResolvedValue({ messageId: "abc" });
    const { sendOutbidEmail } = await import("../services/email.service.js");
    await sendOutbidEmail(
      { name: "User", email: "u@test.com" },
      600000,
      { title: "BMW X5", _id: "car2" }
    );
    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).toContain("outbid");
    expect(call.html).toContain("600,000");
  });

  it("sendNewMessageEmail includes sender name", async () => {
    mockSendMail.mockResolvedValue({ messageId: "abc" });
    const { sendNewMessageEmail } = await import("../services/email.service.js");
    await sendNewMessageEmail({ name: "Receiver", email: "r@test.com" }, "Jane", "Mazda CX-5");
    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).toContain("Jane");
    expect(call.html).toContain("Mazda CX-5");
  });

  it("sendTeamInviteEmail includes invite link", async () => {
    mockSendMail.mockResolvedValue({ messageId: "abc" });
    const { sendTeamInviteEmail } = await import("../services/email.service.js");
    await sendTeamInviteEmail("invited@test.com", "AutoDealers", "sales_person", "invitetoken");
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("invited@test.com");
    expect(call.html).toContain("invitetoken");
    expect(call.html).toContain("sales person");
  });
});
