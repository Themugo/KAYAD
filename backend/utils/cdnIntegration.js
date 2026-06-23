// backend/utils/cdnIntegration.js
// ─────────────────────────────────────────────────────────────
// CDN Integration Utility
// Integrates with Cloudinary CDN for optimized image delivery
// and static asset serving
// ─────────────────────────────────────────────────────────────

import { v2 as cloudinary } from "cloudinary";
import { logInfo, logWarn, logError } from "./logger.js";
import { incrementCounter, setGauge, recordHistogram } from "../config/metrics.js";

// =============================
// ⚙️ CDN CONFIGURATION
// =============================

const CDN_CONFIG = {
  // Cloudinary configuration
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  
  // CDN settings
  defaultFolder: "kayad",
  uploadFolder: "uploads",
  imageFolder: "images",
  
  // Image optimization settings
  image: {
    quality: 80,
    format: "auto",
    fetchFormat: "auto",
    progressive: true,
    responsive: true,
  },
  
  // Transformation presets
  transformations: {
    thumbnail: {
      width: 300,
      height: 300,
      crop: "fill",
      quality: 80,
      fetchFormat: "auto",
    },
    medium: {
      width: 800,
      height: 600,
      crop: "fill",
      quality: 80,
      fetchFormat: "auto",
    },
    large: {
      width: 1920,
      height: 1080,
      crop: "fill",
      quality: 85,
      fetchFormat: "auto",
    },
    original: {
      quality: 90,
      fetchFormat: "auto",
    },
  },
};

// =============================
// 🔧 CLOUDINARY INITIALIZATION
// =============================

cloudinary.config({
  cloud_name: CDN_CONFIG.cloudName,
  api_key: CDN_CONFIG.apiKey,
  api_secret: CDN_CONFIG.apiSecret,
  secure: true,
});

// =============================
// 📊 CDN METRICS
// =============================

const cdnMetrics = {
  uploads: 0,
  transformations: 0,
  deletions: 0,
  errors: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

// =============================
// 🖼️ IMAGE UPLOAD
// =============================

/**
 * Upload image to CDN
 */
export const uploadImage = async (file, options = {}) => {
  const startTime = Date.now();
  try {
    const {
      folder = CDN_CONFIG.uploadFolder,
      transformation = "original",
      publicId,
      tags = [],
    } = options;

    const uploadOptions = {
      folder: `${CDN_CONFIG.defaultFolder}/${folder}`,
      transformation: CDN_CONFIG.transformations[transformation],
      public_id: publicId,
      tags: tags,
      resource_type: "auto",
    };

    const result = await cloudinary.uploader.upload(file, uploadOptions);
    
    cdnMetrics.uploads++;
    incrementCounter("cdn_upload");
    
    const duration = Date.now() - startTime;
    recordHistogram("cdn_upload_duration", duration);
    
    logInfo("Image uploaded to CDN", { publicId: result.public_id, duration });
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      resourceType: result.resource_type,
    };
  } catch (error) {
    cdnMetrics.errors++;
    incrementCounter("cdn_error");
    logError("CDN upload error", error);
    throw error;
  }
};

/**
 * Upload multiple images to CDN
 */
export const uploadMultipleImages = async (files, options = {}) => {
  const uploadPromises = files.map((file) => uploadImage(file, options));
  const results = await Promise.all(uploadPromises);
  return results;
};

// =============================
// 🔄 IMAGE TRANSFORMATION
// =============================

/**
 * Generate optimized image URL
 */
export const getOptimizedImageUrl = (publicId, transformation = "medium") => {
  try {
    const transform = CDN_CONFIG.transformations[transformation];
    const url = cloudinary.url(publicId, transform);
    
    cdnMetrics.transformations++;
    incrementCounter("cdn_transformation", { type: transformation });
    
    return url;
  } catch (error) {
    cdnMetrics.errors++;
    incrementCounter("cdn_error");
    logError("CDN transformation error", error);
    return null;
  }
};

/**
 * Generate responsive image URLs
 */
export const getResponsiveImageUrls = (publicId) => {
  return {
    thumbnail: getOptimizedImageUrl(publicId, "thumbnail"),
    medium: getOptimizedImageUrl(publicId, "medium"),
    large: getOptimizedImageUrl(publicId, "large"),
    original: getOptimizedImageUrl(publicId, "original"),
  };
};

/**
 * Generate image with custom transformation
 */
export const getCustomImageUrl = (publicId, options = {}) => {
  const {
    width,
    height,
    crop = "fill",
    quality = CDN_CONFIG.image.quality,
    format = CDN_CONFIG.image.format,
  } = options;

  const transformation = {
    width,
    height,
    crop,
    quality,
    fetchFormat: format,
  };

  try {
    const url = cloudinary.url(publicId, transformation);
    cdnMetrics.transformations++;
    incrementCounter("cdn_transformation", { type: "custom" });
    return url;
  } catch (error) {
    cdnMetrics.errors++;
    incrementCounter("cdn_error");
    logError("CDN custom transformation error", error);
    return null;
  }
};

// =============================
// 🗑️ IMAGE DELETION
// =============================

/**
 * Delete image from CDN
 */
export const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    
    cdnMetrics.deletions++;
    incrementCounter("cdn_delete");
    
    logInfo("Image deleted from CDN", { publicId });
    
    return true;
  } catch (error) {
    cdnMetrics.errors++;
    incrementCounter("cdn_error");
    logError("CDN delete error", error);
    return false;
  }
};

/**
 * Delete multiple images from CDN
 */
export const deleteMultipleImages = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    
    cdnMetrics.deletions += publicIds.length;
    incrementCounter("cdn_delete", { count: publicIds.length });
    
    logInfo("Multiple images deleted from CDN", { count: publicIds.length });
    
    return result;
  } catch (error) {
    cdnMetrics.errors++;
    incrementCounter("cdn_error");
    logError("CDN batch delete error", error);
    return null;
  }
};

// =============================
// 🔍 IMAGE SEARCH
// =============================

/**
 * Search images by tag
 */
export const searchImagesByTag = async (tag, options = {}) => {
  try {
    const { maxResults = 50 } = options;
    
    const result = await cloudinary.search
      .expression(`tags:${tag}`)
      .sort_by("public_id", "desc")
      .max_results(maxResults)
      .execute();
    
    return result.resources;
  } catch (error) {
    cdnMetrics.errors++;
    incrementCounter("cdn_error");
    logError("CDN search error", error);
    return [];
  }
};

/**
 * Get image info
 */
export const getImageInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    cdnMetrics.errors++;
    incrementCounter("cdn_error");
    logError("CDN get info error", error);
    return null;
  }
};

// =============================
// 📊 CDN METRICS
// =============================

/**
 * Get CDN metrics
 */
export const getCdnMetrics = () => {
  return {
    ...cdnMetrics,
    errorRate: cdnMetrics.uploads > 0
      ? (cdnMetrics.errors / cdnMetrics.uploads) * 100
      : 0,
  };
};

/**
 * Reset CDN metrics
 */
export const resetCdnMetrics = () => {
  cdnMetrics.uploads = 0;
  cdnMetrics.transformations = 0;
  cdnMetrics.deletions = 0;
  cdnMetrics.errors = 0;
  cdnMetrics.cacheHits = 0;
  cdnMetrics.cacheMisses = 0;
};

/**
 * Update CDN metrics gauge
 */
export const updateCdnMetricsGauge = () => {
  const metrics = getCdnMetrics();
  setGauge("cdn_uploads", metrics.uploads);
  setGauge("cdn_transformations", metrics.transformations);
  setGauge("cdn_deletions", metrics.deletions);
  setGauge("cdn_errors", metrics.errors);
  setGauge("cdn_cache_hits", metrics.cacheHits);
  setGauge("cdn_cache_misses", metrics.cacheMisses);
  setGauge("cdn_error_rate", metrics.errorRate);
};

// =============================
// 🎯 CDN URL GENERATION HELPERS
// =============================

/**
 * Generate CDN URL for static assets
 */
export const getCdnUrl = (path) => {
  return `https://res.cloudinary.com/${CDN_CONFIG.cloudName}/${path}`;
};

/**
 * Generate CDN URL for car images
 */
export const getCarImageUrl = (publicId, size = "medium") => {
  return getOptimizedImageUrl(publicId, size);
};

/**
 * Generate CDN URL for profile pictures
 */
export const getProfilePictureUrl = (publicId) => {
  return getCustomImageUrl(publicId, {
    width: 200,
    height: 200,
    crop: "fill",
    quality: 85,
  });
};

/**
 * Generate CDN URL for thumbnails
 */
export const getThumbnailUrl = (publicId) => {
  return getOptimizedImageUrl(publicId, "thumbnail");
};

// =============================
// 📋 EXPORTS
// =============================

export default {
  CDN_CONFIG,
  uploadImage,
  uploadMultipleImages,
  getOptimizedImageUrl,
  getResponsiveImageUrls,
  getCustomImageUrl,
  deleteImage,
  deleteMultipleImages,
  searchImagesByTag,
  getImageInfo,
  getCdnMetrics,
  resetCdnMetrics,
  updateCdnMetricsGauge,
  getCdnUrl,
  getCarImageUrl,
  getProfilePictureUrl,
  getThumbnailUrl,
};
