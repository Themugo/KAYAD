import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockContactCreate = jest.fn();
const mockContactFindByIdAndUpdate = jest.fn();
const mockLean = jest.fn();
const mockSort = jest.fn(() => ({ lean: mockLean }));
const mockFind = jest.fn(() => ({ sort: mockSort }));
const mockSendEmail = jest.fn();

jest.unstable_mockModule("../models/Contact.js", () => ({
  default: {
    create: mockContactCreate,
    find: mockFind,
    findByIdAndUpdate: mockContactFindByIdAndUpdate,
  },
}));
jest.unstable_mockModule("../services/email.service.js", () => ({
  sendEmail: mockSendEmail,
}));

describe("contactController", () => {
  let controller;

  beforeAll(async () => {
    controller = await import("../controllers/contactController.js");
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore chain defaults
    mockLean.mockResolvedValue([]);
    mockSort.mockReturnValue({ lean: mockLean });
    mockFind.mockReturnValue({ sort: mockSort });
  });

  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  describe("submitContact", () => {
    it("returns 400 if fields missing", async () => {
      const req = { body: { name: "John" } };
      const res = mockRes();
      await controller.submitContact(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: "All fields are required" });
    });

    it("creates contact and sends email on success", async () => {
      process.env.ADMIN_EMAIL = "admin@test.com";
      mockContactCreate.mockResolvedValue({ _id: "c1" });
      const req = { body: { name: "John", email: "john@test.com", subject: "Help", message: "Need help" } };
      const res = mockRes();
      await controller.submitContact(req, res);
      expect(mockContactCreate).toHaveBeenCalledWith({ name: "John", email: "john@test.com", subject: "Help", message: "Need help" });
      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "admin@test.com" }));
      expect(res.json).toHaveBeenCalledWith({ success: true, message: expect.any(String) });
    });

    it("returns 500 on error", async () => {
      mockContactCreate.mockRejectedValue(new Error("DB error"));
      const req = { body: { name: "John", email: "j@t.com", subject: "S", message: "M" } };
      const res = mockRes();
      await controller.submitContact(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("listContacts", () => {
    it("returns contacts sorted by createdAt desc", async () => {
      mockLean.mockResolvedValue([{ _id: "c1" }]);
      const req = {};
      const res = mockRes();
      await controller.listContacts(req, res);
      expect(mockFind).toHaveBeenCalled();
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.json).toHaveBeenCalledWith({ success: true, contacts: [{ _id: "c1" }] });
    });

    it("returns 500 on error", async () => {
      mockLean.mockRejectedValue(new Error("fail"));
      const req = {};
      const res = mockRes();
      await controller.listContacts(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("markRead", () => {
    it("marks contact as read", async () => {
      mockContactFindByIdAndUpdate.mockResolvedValue({ _id: "c1", read: true });
      const req = { params: { id: "c1" } };
      const res = mockRes();
      await controller.markRead(req, res);
      expect(mockContactFindByIdAndUpdate).toHaveBeenCalledWith("c1", { read: true }, { new: true });
      expect(res.json).toHaveBeenCalledWith({ success: true, contact: { _id: "c1", read: true } });
    });

    it("returns 404 if contact not found", async () => {
      mockContactFindByIdAndUpdate.mockResolvedValue(null);
      const req = { params: { id: "c1" } };
      const res = mockRes();
      await controller.markRead(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 500 on error", async () => {
      mockContactFindByIdAndUpdate.mockRejectedValue(new Error("fail"));
      const req = { params: { id: "c1" } };
      const res = mockRes();
      await controller.markRead(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
