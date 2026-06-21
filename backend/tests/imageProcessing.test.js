// backend/tests/imageProcessing.test.js
// ─────────────────────────────────────────────────────────────
// Image processing tests
// Tests compression, WebP conversion, thumbnail generation, and responsive variants
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import sharp from "sharp";

// Mock sharp to avoid requiring actual image files
jest.mock("sharp");

describe("Image Processing Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Error Handling", () => {
    it("should handle corrupt JPEG image", async () => {
      const corruptBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
      
      // Mock sharp to throw error for corrupt data
      sharp.mockImplementation(() => {
        throw new Error("Input buffer has corrupt header");
      });

      const { compressImage } = await import("../services/imageProcessingService.js");
      
      await expect(compressImage(corruptBuffer)).rejects.toThrow("Input buffer has corrupt header");
    });

    it("should handle empty buffer", async () => {
      const emptyBuffer = Buffer.from([]);
      
      sharp.mockImplementation(() => {
        throw new Error("Input buffer is empty");
      });

      const { compressImage } = await import("../services/imageProcessingService.js");
      
      await expect(compressImage(emptyBuffer)).rejects.toThrow();
    });

    it("should handle invalid image format", async () => {
      const invalidBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      
      sharp.mockImplementation(() => {
        throw new Error("Invalid image format");
      });

      const { compressImage } = await import("../services/imageProcessingService.js");
      
      await expect(compressImage(invalidBuffer)).rejects.toThrow("Invalid image format");
    });
  });

  describe("Validation", () => {
    it("should validate buffer is provided", async () => {
      const { compressImage } = await import("../services/imageProcessingService.js");
      
      await expect(compressImage(null)).rejects.toThrow();
      await expect(compressImage(undefined)).rejects.toThrow();
    });

    it("should validate buffer type", async () => {
      const { compressImage } = await import("../services/imageProcessingService.js");
      
      await expect(compressImage("not a buffer")).rejects.toThrow();
      await expect(compressImage({})).rejects.toThrow();
    });
  });
});
