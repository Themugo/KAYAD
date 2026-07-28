import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockDoc = {
  fontSize: jest.fn().mockReturnThis(),
  font: jest.fn().mockReturnThis(),
  fillColor: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  moveDown: jest.fn().mockReturnThis(),
  moveTo: jest.fn().mockReturnThis(),
  lineTo: jest.fn().mockReturnThis(),
  strokeColor: jest.fn().mockReturnThis(),
  lineWidth: jest.fn().mockReturnThis(),
  stroke: jest.fn().mockReturnThis(),
  end: jest.fn().mockImplementation(function () {
    if (this._endCb) process.nextTick(this._endCb);
  }),
  on: jest.fn().mockImplementation(function (event, cb) {
    if (event === "data") this._dataCb = cb;
    if (event === "end") this._endCb = cb;
    return this;
  }),
};

jest.unstable_mockModule("pdfkit", () => ({
  default: jest.fn(() => mockDoc),
}));

describe("pdfService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("generateReceipt resolves with a Buffer", async () => {
    const { default: PDFDocument } = await import("pdfkit");
    const { generateReceipt } = await import("../services/pdfService.js");

    const promise = generateReceipt({
      title: "Receipt",
      amount: 250000,
      transactionId: "TXN001",
      carDetails: "Toyota Prado",
      date: new Date(),
    });

    mockDoc._dataCb(Buffer.from("pdf-data"));
    const result = await promise;

    expect(result).toBeInstanceOf(Buffer);
    expect(PDFDocument).toHaveBeenCalledWith({ size: "A4", margin: 50 });
  });

  it("generateInvoice delegates to generateReceipt", async () => {
    const { default: PDFDocument } = await import("pdfkit");
    const { generateInvoice } = await import("../services/pdfService.js");

    const promise = generateInvoice({ title: "Invoice", amount: 50000 });

    mockDoc._dataCb(Buffer.from("invoice-pdf"));
    const result = await promise;

    expect(result).toBeInstanceOf(Buffer);
    expect(PDFDocument).toHaveBeenCalled();
  });
});
