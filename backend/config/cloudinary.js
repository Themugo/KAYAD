import { readFileSync } from "node:fs";
import { v2 as cloudinary } from "cloudinary";
import { IMAGE_VARIANTS, QUALITY_PRESETS } from "./imageProcessing.js";
import { createUploadRecord, deleteUploadRecord } from "../services/sqlUploadStore.js";

// =============================
// 🔐 CONFIG
// =============================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// =============================
// ⚡ BASE OPTIMIZATION
// =============================
const BASE = [{ fetch_format: "auto" }, { quality: "auto:eco" }, { dpr: "auto" }];

// =============================
// 🎯 TRANSFORMS (ENHANCED)
// =============================
const T = {
  // Original - no transformation
  original: [],

  // Full view - enhanced
  full: [
    { width: 1400, height: 900, crop: "limit" },
    { quality: "auto:good" },
    { fetch_format: "auto" },
    { progressive: "auto" },
  ],

  // Card view - enhanced
  card: [
    { width: 600, height: 400, crop: "fill", gravity: "auto" },
    { quality: "auto:good" },
    { fetch_format: "auto" },
  ],

  // Thumbnail - enhanced
  thumb: [
    { width: 300, height: 200, crop: "fill", gravity: "auto" },
    { quality: "auto:good" },
    { fetch_format: "auto" },
  ],

  // Responsive variants
  mobile: [{ width: 320, crop: "limit" }, { quality: "auto:good" }, { fetch_format: "auto" }],

  tablet: [{ width: 768, crop: "limit" }, { quality: "auto:good" }, { fetch_format: "auto" }],

  desktop: [{ width: 1200, crop: "limit" }, { quality: "auto:good" }, { fetch_format: "auto" }],

  large: [{ width: 1920, crop: "limit" }, { quality: "auto:good" }, { fetch_format: "auto" }],

  // Blur placeholder
  blur: [
    { width: 20, height: 20, crop: "fill" },
    { quality: "auto:low" },
    { effect: "blur:1000" },
    { fetch_format: "auto" },
  ],
};

// =============================
// 📤 UPLOAD IMAGE (ENHANCED)
// =============================
export const uploadImage = async (file, folder = "kayad/cars", options = {}) => {
  try {
    const { generateVariants = true, preserveOriginal = true, compress = true } = options;

    // 🔥 SUPPORT BOTH MEMORY + DISK
    const uploadOptions = {
      folder,
      resource_type: "image",
      transformation: T.full,

      // Generate responsive variants if enabled
      eager: generateVariants ? [T.card, T.thumb, T.mobile, T.tablet, T.desktop] : [T.card, T.thumb],
      eager_async: true,

      invalidate: true,

      // Preserve original if requested
      type: preserveOriginal ? "upload" : "upload",

      // Additional optimizations
      quality: compress ? "auto:good" : "auto",
      fetch_format: "auto",
      progressive: "auto",
    };

    let result;

    // memoryStorage (buffer)
    if (file.buffer) {
      result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(uploadOptions, (err, res) => {
            if (err) reject(err);
            else resolve(res);
          })
          .end(file.buffer);
      });
    } else {
      // diskStorage (file.path)
      result = await cloudinary.uploader.upload(file.path, uploadOptions);
    }

    const publicId = result.public_id;
    const buffer = file.buffer ? Buffer.from(file.buffer) : file.path ? readFileSync(file.path) : null;
    const storageRecord = createUploadRecord({
      originalName: file.originalname || file.name || "upload",
      mimeType: file.mimetype || result.resource_type || "application/octet-stream",
      size: file.size || result.bytes || (buffer ? buffer.length : null),
      folder,
      provider: "cloudinary",
      storagePath: file.path || null,
      publicId,
      url: result.secure_url,
      thumb: cloudinary.url(publicId, { transformation: T.thumb }),
      content: buffer,
      metadata: {
        source: file.buffer ? "memory" : file.path ? "disk" : "unknown",
        resourceType: result.resource_type,
        format: result.format,
      },
    });

    return {
      public_id: publicId,

      // 🔥 ALWAYS KEEP THIS
      url: result.secure_url,

      // 🔥 STRUCTURED IMAGES (NEW UI)
      card: cloudinary.url(publicId, { transformation: T.card }),
      thumb: cloudinary.url(publicId, { transformation: T.thumb }),
      blur: cloudinary.url(publicId, { transformation: T.blur }),

      // 🔥 RESPONSIVE VARIANTS (NEW)
      mobile: cloudinary.url(publicId, { transformation: T.mobile }),
      tablet: cloudinary.url(publicId, { transformation: T.tablet }),
      desktop: cloudinary.url(publicId, { transformation: T.desktop }),
      large: cloudinary.url(publicId, { transformation: T.large }),

      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      storageId: storageRecord.id,
      storageProvider: "sql+cloudinary",
    };
  } catch (err) {
    console.error("❌ CLOUDINARY ERROR:", err);
    throw new Error("Upload failed");
  }
};

// =============================
// 📦 MULTIPLE UPLOAD
// =============================
export const uploadMultiple = async (files, folder) => {
  return Promise.all(files.map((file) => uploadImage(file, folder)));
};

// =============================
// ❌ DELETE
// =============================
export const deleteImage = async (publicId) => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
    });
    deleteUploadRecord(publicId);
  } catch (err) {
    console.error("❌ DELETE ERROR:", err.message);
  }
};

// =============================
// 🧠 UNIVERSAL IMAGE RESOLVER
// =============================
export const resolveImage = (img) => {
  if (!img) return "/placeholder.jpg";

  // 🔥 NEW FORMAT (object)
  if (typeof img === "object") {
    return img.card || img.url || "/placeholder.jpg";
  }

  // 🔥 OLD FORMAT (string)
  if (typeof img === "string") {
    return img;
  }

  return "/placeholder.jpg";
};

export default cloudinary;
