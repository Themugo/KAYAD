import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { logWarn, logError } from "../utils/logger.js";

// =============================
// 📁 CONFIG
// =============================
const UPLOAD_DIR = "uploads";

// =============================
// 📁 ENSURE DIR EXISTS
// =============================
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// =============================
// 📸 SANITIZE NAME
// =============================
const sanitizeFileName = (name) => {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.-]/g, "");
};

// =============================
// 🔐 GENERATE SAFE FILE NAME
// =============================
const generateFileName = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const baseName = sanitizeFileName(path.basename(originalName, ext));
  const unique = crypto.randomBytes(6).toString("hex");

  return `${Date.now()}-${unique}-${baseName}${ext}`;
};

// =============================
// 📦 DISK STORAGE (DEFAULT)
// =============================
const diskStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),

  filename: (_, file, cb) => {
    cb(null, generateFileName(file.originalname));
  },
});

// =============================
// ⚡ MEMORY STORAGE (FOR CLOUDINARY DIRECT)
// =============================
export const memoryStorage = multer.memoryStorage();

// =============================
// 🛡 FILE FILTER (STRICT + MAGIC BYTES)
// =============================

// Map of allowed MIME types → magic byte signatures
const MAGIC_BYTES = {
  "image/jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
  "image/png": [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  "image/webp": [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF header (+ "WEBP" at byte 8, checked below)
};

const headOf = (file) => {
  if (file?.buffer) return Buffer.from(file.buffer.subarray(0, 12));
  if (file?.path) {
    try {
      const fd = fs.openSync(file.path, "r");
      try { const b = Buffer.alloc(12); fs.readSync(fd, b, 0, 12, 0); return b; } finally { fs.closeSync(fd); }
    } catch { return Buffer.alloc(0); }
  }
  return Buffer.alloc(0);
};

export const fileMatchesDeclaredType = (file) => {
  const head = headOf(file);
  const signatures = MAGIC_BYTES[file?.mimetype] || [];
  if (!signatures.some((sig) => head.subarray(0, sig.length).equals(sig))) return false;
  if (file.mimetype === "image/webp") return head.subarray(8, 12).toString("latin1") === "WEBP";
  return true;
};

// Wrap a multer instance so every handler verifies content against the declared MIME after parsing; mismatches are
// deleted (disk) and rejected with 400 through the normal error path (handleUploadError).
const guardUploads = (instance) => {
  const guard = (mw) => (req, res, next) => mw(req, res, (err) => {
    if (err) return next(err);
    const files = [req.file, ...(Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat())].filter(Boolean);
    const bad = files.find((f) => !fileMatchesDeclaredType(f));
    if (bad) {
      logWarn("FILE REJECTED (magic bytes)", { name: bad.originalname, type: bad.mimetype, user: req.user?.id || "guest" });
      cleanupFiles(files);
      return next(new Error("File content does not match its declared type"));
    }
    return next();
  });
  return {
    single: (n) => guard(instance.single(n)),
    array: (n, max) => guard(instance.array(n, max)),
    fields: (f) => guard(instance.fields(f)),
    any: () => guard(instance.any()),
    none: () => instance.none(),
  };
};

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(ext)) {
    logWarn("FILE REJECTED (type/ext)", {
      name: file.originalname,
      type: file.mimetype,
      user: req.user?.id || "guest",
    });
    return cb(new Error("Only JPG, PNG, WEBP images allowed"), false);
  }

  // Magic bytes are verified AFTER multer has the file (see guardUploads below). multer's fileFilter never receives a
  // stream, so the previous `file.stream.on(...)` threw a TypeError inside busboy -> uncaughtException on EVERY upload.
  cb(null, true);
};

// =============================
// ⚠️ LIMITS
// =============================
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
  files: 10,
};

// =============================
// 🚀 MAIN UPLOAD (DISK)
// =============================
const upload = guardUploads(multer({
  storage: diskStorage,
  fileFilter,
  limits,
}));

// =============================
// 🚀 CLOUDINARY-READY UPLOAD
// =============================
export const uploadMemory = guardUploads(multer({
  storage: memoryStorage,
  fileFilter,
  limits,
}));

// =============================
// 🎯 PRESETS
// =============================
export const uploadSingle = upload.single("image");
export const uploadMultiple = upload.array("images", 10);

// =============================
// 🧹 CLEANUP HELPER
// =============================
export const cleanupFiles = (files = []) => {
  try {
    files.forEach((file) => {
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  } catch (err) {
    logWarn("CLEANUP FAILED", { error: err.message });
  }
};

// =============================
// 🧹 STAGE 5C.1: REMOVE DISK UPLOADS WHEN THE REQUEST ENDS IN AN ERROR
// =============================
// multer writes accepted files to disk BEFORE the controller decides whether the caller may use them. Every rejected
// request after that point (ownership 403, 404, cap 400, validation 400, storage failure 5xx) used to leave the files
// behind forever. This runs after the upload middleware and deletes them once the response has finished with a 4xx/5xx.
// Successful responses (2xx/3xx) keep their files: createCar uploads them to cloud storage in the background.
export const cleanupUploadsOnError = (req, res, next) => {
  res.once("finish", () => {
    if (res.statusCode < 400) return;
    const files = [...(Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat()), ...(req.file ? [req.file] : [])];
    if (files.length) cleanupFiles(files);
  });
  next();
};

// =============================
// ❌ ERROR HANDLER
// =============================
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logError("MULTER ERROR", { error: err.message });

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    logError("UPLOAD ERROR", { error: err.message });

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

export default upload;
