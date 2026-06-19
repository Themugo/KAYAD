// backend/services/imageProcessingService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Image processing service
// Handles compression, WebP conversion, thumbnail generation, and responsive variants
// ─────────────────────────────────────────────────────────────

import sharp from "sharp";
import { logInfo, logError } from "../utils/logger.js";
import {
  QUALITY_PRESETS,
  IMAGE_VARIANTS,
  COMPRESSION_SETTINGS,
  FORMAT_CONVERSION,
  PROCESSING_OPTIONS,
} from "../config/imageProcessing.js";

// =============================
// 🗜️ COMPRESS IMAGE
// =============================

export const compressImage = async (imageBuffer, format = "jpeg", quality = QUALITY_PRESETS.medium) => {
  try {
    let processor = sharp(imageBuffer);

    // Apply processing options
    if (PROCESSING_OPTIONS.autoOrient) {
      processor = processor.rotate();
    }

    if (PROCESSING_OPTIONS.stripMetadata) {
      processor = processor.withMetadata();
    }

    // Apply compression based on format
    const settings = COMPRESSION_SETTINGS[format] || COMPRESSION_SETTINGS.jpeg;

    switch (format) {
      case "jpeg":
        processor = processor.jpeg({
          quality,
          progressive: settings.progressive,
          mozjpeg: settings.mozjpeg,
        });
        break;
      case "png":
        processor = processor.png({
          quality,
          compressionLevel: settings.compressionLevel,
          adaptiveFiltering: settings.adaptiveFiltering,
        });
        break;
      case "webp":
        processor = processor.webp({
          quality,
          lossless: settings.lossless,
          nearLossless: settings.nearLossless,
        });
        break;
      default:
        processor = processor.jpeg({ quality });
    }

    const compressed = await processor.toBuffer();
    logInfo("Image compressed", {
      format,
      quality,
      originalSize: imageBuffer.length,
      compressedSize: compressed.length,
    });

    return compressed;
  } catch (err) {
    logError("Failed to compress image", err);
    throw err;
  }
};

// =============================
// 🌐 CONVERT TO WEBP
// =============================

export const convertToWebP = async (imageBuffer, quality = QUALITY_PRESETS.medium) => {
  try {
    const webpBuffer = await sharp(imageBuffer)
      .rotate()
      .webp({
        quality,
        lossless: false,
        nearLossless: true,
      })
      .toBuffer();

    logInfo("Image converted to WebP", { quality, originalSize: imageBuffer.length, webpSize: webpBuffer.length });

    return webpBuffer;
  } catch (err) {
    logError("Failed to convert to WebP", err);
    throw err;
  }
};

// =============================
// 🖼️ GENERATE THUMBNAIL
// =============================

export const generateThumbnail = async (
  imageBuffer,
  width = 300,
  height = 200,
  quality = QUALITY_PRESETS.thumbnail,
) => {
  try {
    const thumbnail = await sharp(imageBuffer)
      .rotate()
      .resize(width, height, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality })
      .toBuffer();

    logInfo("Thumbnail generated", { width, height, quality });

    return thumbnail;
  } catch (err) {
    logError("Failed to generate thumbnail", err);
    throw err;
  }
};

// =============================
// 📱 GENERATE RESPONSIVE VARIANTS
// =============================

export const generateResponsiveVariants = async (imageBuffer) => {
  try {
    const variants = {};

    for (const [name, config] of Object.entries(IMAGE_VARIANTS)) {
      if (name.startsWith("thumb_") || name === "placeholder") continue; // Skip thumbnails

      let processor = sharp(imageBuffer).rotate();

      if (config.height) {
        processor = processor.resize(config.width, config.height, {
          fit: "cover",
          position: "center",
        });
      } else {
        processor = processor.resize(config.width, null, {
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      const buffer = await processor.webp({ quality: config.quality }).toBuffer();
      variants[name] = buffer;

      logInfo("Responsive variant generated", { name, width: config.width, quality: config.quality });
    }

    return variants;
  } catch (err) {
    logError("Failed to generate responsive variants", err);
    throw err;
  }
};

// =============================
// 📦 GENERATE ALL VARIANTS
// =============================

export const generateAllVariants = async (imageBuffer) => {
  try {
    const variants = {};

    // Generate thumbnails
    for (const [name, config] of Object.entries(IMAGE_VARIANTS)) {
      if (!name.startsWith("thumb_")) continue;

      let processor = sharp(imageBuffer).rotate();

      processor = processor.resize(config.width, config.height, {
        fit: "cover",
        position: "center",
      });

      const buffer = await processor.webp({ quality: config.quality }).toBuffer();
      variants[name] = buffer;

      logInfo("Thumbnail variant generated", { name, width: config.width, height: config.height });
    }

    // Generate blur placeholder
    const placeholder = await sharp(imageBuffer)
      .rotate()
      .resize(IMAGE_VARIANTS.placeholder.width, IMAGE_VARIANTS.placeholder.height, {
        fit: "cover",
      })
      .blur(IMAGE_VARIANTS.placeholder.blur)
      .webp({ quality: IMAGE_VARIANTS.placeholder.quality })
      .toBuffer();

    variants.placeholder = placeholder;

    logInfo("Blur placeholder generated");

    // Generate responsive variants
    const responsiveVariants = await generateResponsiveVariants(imageBuffer);
    Object.assign(variants, responsiveVariants);

    return variants;
  } catch (err) {
    logError("Failed to generate all variants", err);
    throw err;
  }
};

// =============================
// 📊 GET IMAGE METADATA
// =============================

export const getImageMetadata = async (imageBuffer) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const stats = await sharp(imageBuffer).stats();

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: imageBuffer.length,
      density: metadata.density,
      channels: metadata.channels,
      hasAlpha: metadata.hasAlpha,
      isProgressive: metadata.isProgressive,
      dominant: stats.dominant,
    };
  } catch (err) {
    logError("Failed to get image metadata", err);
    throw err;
  }
};

// =============================
// 🧹 OPTIMIZE IMAGE
// =============================

export const optimizeImage = async (imageBuffer, options = {}) => {
  try {
    const {
      compress = true,
      convertToWebP = FORMAT_CONVERSION.enableWebP,
      generateVariants: shouldGenerateVariants = false,
      quality = QUALITY_PRESETS.medium,
    } = options;

    let result = {
      original: imageBuffer,
      compressed: null,
      webp: null,
      variants: {},
      metadata: await getImageMetadata(imageBuffer),
    };

    // Compress
    if (compress) {
      result.compressed = await compressImage(imageBuffer, result.metadata.format, quality);
    }

    // Convert to WebP
    if (convertToWebP) {
      result.webp = await convertToWebP(imageBuffer, quality);
    }

    // Generate variants
    if (shouldGenerateVariants) {
      result.variants = await generateAllVariants(imageBuffer);
    }

    logInfo("Image optimized", {
      originalSize: imageBuffer.length,
      compressedSize: result.compressed?.length,
      webpSize: result.webp?.length,
      variantsCount: Object.keys(result.variants).length,
    });

    return result;
  } catch (err) {
    logError("Failed to optimize image", err);
    throw err;
  }
};

export default {
  compressImage,
  convertToWebP,
  generateThumbnail,
  generateResponsiveVariants,
  generateAllVariants,
  getImageMetadata,
  optimizeImage,
};
