// backend/config/imageProcessing.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Image processing configuration
// Defines compression settings, variant specifications, and quality presets
// ─────────────────────────────────────────────────────────────

// =============================
// 🎨 QUALITY PRESETS
// =============================

export const QUALITY_PRESETS = {
  original: 100,
  high: 90,
  medium: 85,
  low: 75,
  thumbnail: 70,
  placeholder: 10,
};

// =============================
// 📐 VARIANT SPECIFICATIONS
// =============================

export const IMAGE_VARIANTS = {
  // Responsive variants
  mobile: { width: 320, quality: QUALITY_PRESETS.medium },
  tablet: { width: 768, quality: QUALITY_PRESETS.medium },
  desktop: { width: 1200, quality: QUALITY_PRESETS.high },
  large: { width: 1920, quality: QUALITY_PRESETS.high },

  // Thumbnails
  thumb_small: { width: 150, height: 150, quality: QUALITY_PRESETS.thumbnail },
  thumb_medium: { width: 300, height: 200, quality: QUALITY_PRESETS.thumbnail },
  thumb_large: { width: 600, height: 400, quality: QUALITY_PRESETS.thumbnail },

  // Blur placeholder
  placeholder: { width: 20, height: 20, quality: QUALITY_PRESETS.placeholder, blur: 1000 },

  // Card view
  card: { width: 600, height: 400, quality: QUALITY_PRESETS.medium },

  // Full view
  full: { width: 1400, height: 900, quality: QUALITY_PRESETS.high },
};

// =============================
// 🗜️ COMPRESSION SETTINGS
// =============================

export const COMPRESSION_SETTINGS = {
  jpeg: {
    quality: QUALITY_PRESETS.medium,
    progressive: true,
    mozjpeg: true,
  },
  png: {
    quality: QUALITY_PRESETS.medium,
    compressionLevel: 9,
    adaptiveFiltering: true,
  },
  webp: {
    quality: QUALITY_PRESETS.medium,
    lossless: false,
    nearLossless: true,
  },
};

// =============================
// 🌐 FORMAT CONVERSION
// =============================

export const FORMAT_CONVERSION = {
  enableWebP: true,
  enableAVIF: false, // AVIF support is limited, enable when browser support improves
  fallbackToOriginal: true,
};

// =============================
// 📦 STORAGE STRATEGY
// =============================

export const STORAGE_STRATEGY = {
  primary: "cloudinary",
  preserveOriginal: true,
  generateVariants: true,
  eagerTransformations: true,
  folderStructure: "kayad/{type}/{year}/{month}",
};

// =============================
// 🚀 PROCESSING OPTIONS
// =============================

export const PROCESSING_OPTIONS = {
  autoOrient: true,
  stripMetadata: true,
  stripICCProfile: false,
  optimizeScans: true,
};

export default {
  QUALITY_PRESETS,
  IMAGE_VARIANTS,
  COMPRESSION_SETTINGS,
  FORMAT_CONVERSION,
  STORAGE_STRATEGY,
  PROCESSING_OPTIONS,
};
