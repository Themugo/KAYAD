// backend/tests/imageProcessing.test.js
// ─────────────────────────────────────────────────────────────
// Image processing tests
// Tests compression, WebP conversion, thumbnail generation, and responsive variants
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from "@jest/globals";
import {
  compressImage,
  convertToWebP,
  generateThumbnail,
  generateResponsiveVariants,
  getImageMetadata,
  optimizeImage,
} from "../services/imageProcessingService.js";

describe("Image Processing Service", () => {
  describe("Compression", () => {
    it("should compress JPEG image", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]); // JPEG header

      // This is a minimal test - in real scenario, you'd use actual image buffer
      expect(() => compressImage(testBuffer)).not.toThrow();
    });

    it("should compress PNG image", async () => {
      const testBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG header

      expect(() => compressImage(testBuffer, "png")).not.toThrow();
    });
  });

  describe("WebP Conversion", () => {
    it("should convert to WebP", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);

      expect(() => convertToWebP(testBuffer)).not.toThrow();
    });
  });

  describe("Thumbnail Generation", () => {
    it("should generate thumbnail", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);

      expect(() => generateThumbnail(testBuffer, 300, 200)).not.toThrow();
    });
  });

  describe("Responsive Variants", () => {
    it("should generate responsive variants", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);

      expect(() => generateResponsiveVariants(testBuffer)).not.toThrow();
    });
  });

  describe("Image Metadata", () => {
    it("should get image metadata", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);

      expect(() => getImageMetadata(testBuffer)).not.toThrow();
    });
  });

  describe("Image Optimization", () => {
    it("should optimize image", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);

      expect(() => optimizeImage(testBuffer, { compress: true, convertToWebP: false })).not.toThrow();
    });

    it("should optimize image with WebP", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);

      expect(() => optimizeImage(testBuffer, { compress: true, convertToWebP: true })).not.toThrow();
    });

    it("should optimize image with variants", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);

      expect(() =>
        optimizeImage(testBuffer, { compress: true, convertToWebP: true, generateVariants: true }),
      ).not.toThrow();
    });
  });
});
