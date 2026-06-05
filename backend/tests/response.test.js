import { describe, it, expect, jest } from "@jest/globals";
import {
  success,
  error,
  validationError,
  notFound,
  unauthorized,
} from "../utils/response.js";

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("success", () => {
  it("sends 200 with success true and data", () => {
    const res = mockRes();
    success(res, { car: "Toyota" }, "Fetched");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Fetched",
      data: { car: "Toyota" },
    });
  });

  it("defaults message to Success", () => {
    const res = mockRes();
    success(res, { car: "Toyota" });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Success" })
    );
  });

  it("accepts meta", () => {
    const res = mockRes();
    success(res, [], "List", { page: 1, total: 10 });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { page: 1, total: 10 } })
    );
  });
});

describe("error", () => {
  it("sends 500 with success false", () => {
    const res = mockRes();
    error(res, "Server error");
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Server error",
    });
  });

  it("accepts custom code and details", () => {
    const res = mockRes();
    error(res, "Not found", 404, { id: "bad" });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Not found",
      details: { id: "bad" },
    });
  });
});

describe("validationError", () => {
  it("sends 400 with errors array", () => {
    const res = mockRes();
    const errors = [{ field: "email", message: "Required" }];
    validationError(res, errors);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Validation failed",
      errors,
    });
  });
});

describe("notFound", () => {
  it("sends 404", () => {
    const res = mockRes();
    notFound(res, "Car not found");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Car not found",
    });
  });

  it("defaults message", () => {
    const res = mockRes();
    notFound(res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Resource not found" })
    );
  });
});

describe("unauthorized", () => {
  it("sends 401", () => {
    const res = mockRes();
    unauthorized(res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Unauthorized",
    });
  });
});
