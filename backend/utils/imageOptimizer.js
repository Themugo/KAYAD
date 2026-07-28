// backend/utils/imageOptimizer.js
// ─────────────────────────────────────────────────────────────
// Image Optimization Utility
// Provides image optimization strategies and middleware
// for improving image loading performance
// ─────────────────────────────────────────────────────────────

import sharp from "sharp";
import { logInfo, logWarn, logError } from "./logger.js";
import { incrementCounter, setGauge, recordHistogram } from "../config/metrics.js";
import { getCdnUrl, getOptimizedImageUrl } from "./cdnIntegration.js";

// =============================
// ⚙️ IMAGE OPTIMIZATION CONFIG
// =============================

const IMAGE_CONFIG = {
  // Quality settings
  quality: {
    low: 60,
    medium: 80,
    high: 90,
    ultra: 95,
  },
  
  // Format priorities
  formats: {
    preferred: ["webp", "avif", "jpeg"],
    fallback: "jpeg",
  },
  
  // Size presets
  sizes: {
    thumbnail: { width: 300, height: 300 },
    small: { width: 640, height: 480 },
    medium: { width: 1280, height: 720 },
    large: { width: 1920, height: 1080 },
    xlarge: { width: 2560, height: 1440 },
  },
  
  // Compression settings
  compression: {
    enabled: true,
    level: 6,
  },
};

// =============================
// 📊 IMAGE METRICS
// =============================

const imageMetrics = {
  optimized: 0,
  resized: 0,
  converted: 0,
  errors: 0,
  originalSize: 0,
  optimizedSize: 0,
};

// =============================
// 🖼️ IMAGE OPTIMIZATION FUNCTIONS
// =============================

/**
 * Optimize image buffer
 */
export const optimizeImage = async (imageBuffer, options = {}) => {
  const startTime = Date.now();
  try {
    const {
      quality = IMAGE_CONFIG.quality.medium,
      format = IMAGE_CONFIG.formats.preferred[0],
      width,
      height,
      resize = false,
    } = options;

    let pipeline = sharp(imageBuffer);

    // Resize if requested
    if (resize && width && height) {
      pipeline = pipeline.resize(width, height, {
        fit: "inside",
        withoutEnlargement: true,
      });
      imageMetrics.resized++;
      incrementCounter("image_resize");
    }

    // Convert format
    if (format !== "original") {
      pipeline = pipeline.toFormat(format, {
        quality,
        progressive: true,
      });
      imageMetrics.converted++;
      incrementCounter("image_convert", { format });
    } else {
      pipeline = pipeline.jpeg({ quality, progressive: true });
    }

    const optimizedBuffer = await pipeline.toBuffer();
    
    const originalSize = imageBuffer.length;
    const optimizedSize = optimizedBuffer.length;
    const savings = ((originalSize - optimizedSize) / originalSize) * 100;

    imageMetrics.optimized++;
    imageMetrics.originalSize += originalSize;
    imageMetrics.optimizedSize += optimizedSize;
    
    incrementCounter("image_optimize");
    recordHistogram("image_optimization_savings", savings);
    
    const duration = Date.now() - startTime;
    recordHistogram("image_optimization_duration", duration);
    
    logInfo("Image optimized", {
      originalSize,
      optimizedSize,
      savings: savings.toFixed(2),
      duration,
    });

    return {
      buffer: optimizedBuffer,
      originalSize,
      optimizedSize,
      savings: savings.toFixed(2),
      format,
    };
  } catch (error) {
    imageMetrics.errors++;
    incrementCounter("image_error");
    logError("Image optimization error", error);
    throw error;
  }
};

/**
 * Generate responsive image variants
 */
export const generateResponsiveVariants = async (imageBuffer, publicId) => {
  const variants = {};
  const sizes = IMAGE_CONFIG.sizes;

  for (const [name, dimensions] of Object.entries(sizes)) {
    try {
      const optimized = await optimizeImage(imageBuffer, {
        quality: IMAGE_CONFIG.quality.medium,
        format: "webp",
        resize: true,
        width: dimensions.width,
        height: dimensions.height,
      });

      variants[name] = {
        buffer: optimized.buffer,
        width: dimensions.width,
        height: dimensions.height,
        size: optimized.optimizedSize,
        format: "webp",
      };
    } catch (error) {
      logError("Failed to generate variant", error, { variant: name });
    }
  }

  return variants;
};

/**
 * Generate image srcset
 */
export const generateSrcSet = (publicId, sizes = []) => {
  const srcSet = sizes.map((size) => {
    const url = getOptimizedImageUrl(publicId, size);
    const dimensions = IMAGE_CONFIG.sizes[size];
    return `${url} ${dimensions.width}w`;
  });

  return srcSet.join(", ");
};

/**
 * Generate picture element markup
 */
export const generatePictureMarkup = (publicId, alt, sizes = []) => {
  const sources = sizes.map((size) => {
    const url = getOptimizedImageUrl(publicId, size);
    const dimensions = IMAGE_CONFIG.sizes[size];
    return `<source media="(max-width: ${dimensions.width}px)" srcset="${url}" type="image/webp">`;
  });

  const fallbackUrl = getOptimizedImageUrl(publicId, "medium");

  return `
    <picture>
      ${sources.join("\n      ")}
      <img src="${fallbackUrl}" alt="${alt}" loading="lazy">
    </picture>
  `;
};

/**
 * Validate image
 */
export const validateImage = async (imageBuffer) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    
    const validation = {
      valid: true,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      size: imageBuffer.length,
      errors: [],
    };

    // Check format
    const validFormats = ["jpeg", "jpg", "png", "webp", "avif"];
    if (!validFormats.includes(metadata.format)) {
      validation.valid = false;
      validation.errors.push(`Invalid format: ${metadata.format}`);
    }

    // Check dimensions
    if (metadata.width < 100 || metadata.height < 100) {
      validation.valid = false;
      validation.errors.push("Image too small (minimum 100x100)");
    }

    if (metadata.width > 10000 || metadata.height > 10000) {
      validation.valid = false;
      validation.errors.push("Image too large (maximum 10000x10000)");
    }

    // Check file size (max 50MB)
    if (imageBuffer.length > 50 * 1024 * 1024) {
      validation.valid = false;
      validation.errors.push("Image too large (maximum 50MB)");
    }

    return validation;
  } catch (error) {
    return {
      valid: false,
      errors: ["Invalid image file"],
    };
  }
};

/**
 * Get image metadata
 */
export const getImageMetadata = async (imageBuffer) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      size: imageBuffer.length,
      orientation: metadata.orientation,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      channels: metadata.channels,
    };
  } catch (error) {
    logError("Failed to get image metadata", error);
    return null;
  }
};

// =============================
// 📊 IMAGE METRICS
// =============================

/**
 * Get image metrics
 */
export const getImageMetrics = () => {
  const totalSavings = imageMetrics.originalSize > 0
    ? ((imageMetrics.originalSize - imageMetrics.optimizedSize) / imageMetrics.originalSize) * 100
    : 0;

  return {
    ...imageMetrics,
    totalSavings: totalSavings.toFixed(2),
    averageSavings: imageMetrics.optimized > 0
      ? (totalSavings / imageMetrics.optimized).toFixed(2)
      : 0,
  };
};

/**
 * Reset image metrics
 */
export const resetImageMetrics = () => {
  imageMetrics.optimized = 0;
  imageMetrics.resized = 0;
  imageMetrics.converted = 0;
  imageMetrics.errors = 0;
  imageMetrics.originalSize = 0;
  imageMetrics.optimizedSize = 0;
};

/**
 * Update image metrics gauge
 */
export const updateImageMetricsGauge = () => {
  const metrics = getImageMetrics();
  setGauge("image_optimized", metrics.optimized);
  setGauge("image_resized", metrics.resized);
  setGauge("image_converted", metrics.converted);
  setGauge("image_errors", metrics.errors);
  setGauge("image_total_savings", parseFloat(metrics.totalSavings));
  setGauge("image_average_savings", parseFloat(metrics.averageSavings));
};

// =============================
// 🎯 IMAGE OPTIMIZATION MIDDLEWARE
// =============================

/**
 * Middleware to optimize uploaded images
 */
export const imageOptimizationMiddleware = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const optimized = await optimizeImage(req.file.buffer, {
      quality: IMAGE_CONFIG.quality.medium,
      format: "webp",
    });

    req.file.buffer = optimized.buffer;
    req.file.size = optimized.optimizedSize;
    req.file.optimized = true;

    next();
  } catch (error) {
    logError("Image optimization middleware error", error);
    // Continue with original file if optimization fails
    next();
  }
};

/**
 * Middleware to validate uploaded images
 */
export const imageValidationMiddleware = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const validation = await validateImage(req.file.buffer);

  if (!validation.valid) {
    return res.status(400).json({
      error: "Invalid image",
      details: validation.errors,
    });
  }

  req.file.metadata = await getImageMetadata(req.file.buffer);
  next();
};

// =============================
// 📋 EXPORTS
// =============================

export default {
  IMAGE_CONFIG,
  optimizeImage,
  generateResponsiveVariants,
  generateSrcSet,
  generatePictureMarkup,
  validateImage,
  getImageMetadata,
  getImageMetrics,
  resetImageMetrics,
  updateImageMetricsGauge,
  imageOptimizationMiddleware,
  imageValidationMiddleware,
};
