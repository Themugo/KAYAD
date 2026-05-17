import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

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
  const baseName = sanitizeFileName(
    path.basename(originalName, ext)
  );
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
// 🛡 FILE FILTER (STRICT)
// =============================
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    console.warn("🚫 FILE REJECTED:", {
      name: file.originalname,
      type: file.mimetype,
      user: req.user?.id || "guest",
    });

    cb(new Error("Only JPG, PNG, WEBP images allowed"), false);
  }
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
const upload = multer({
  storage: diskStorage,
  fileFilter,
  limits,
});

// =============================
// 🚀 CLOUDINARY-READY UPLOAD
// =============================
export const uploadMemory = multer({
  storage: memoryStorage,
  fileFilter,
  limits,
});

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
    console.warn("⚠️ CLEANUP FAILED:", err.message);
  }
};

// =============================
// ❌ ERROR HANDLER
// =============================
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("❌ MULTER ERROR:", err.message);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    console.error("❌ UPLOAD ERROR:", err.message);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

export default upload;