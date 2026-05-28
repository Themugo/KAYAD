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
// 🛡 FILE FILTER (STRICT + MAGIC BYTES)
// =============================

// Map of allowed MIME types → magic byte signatures
const MAGIC_BYTES = {
  "image/jpeg": [Buffer.from([0xFF, 0xD8, 0xFF])],
  "image/png":  [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  "image/webp": [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF header
};

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(ext)) {
    console.warn("🚫 FILE REJECTED (type/ext):", {
      name: file.originalname,
      type: file.mimetype,
      user: req.user?.id || "guest",
    });
    return cb(new Error("Only JPG, PNG, WEBP images allowed"), false);
  }

  // 🔐 Validate magic bytes from the stream (prevents MIME spoofing)
  const chunks = [];
  let checked = false;

  file.stream.on("data", (chunk) => {
    if (checked) return;
    chunks.push(chunk);
    const combined = Buffer.concat(chunks);
    if (combined.length < 4) return; // wait for enough bytes
    checked = true;

    const signatures = MAGIC_BYTES[file.mimetype] || [];
    const valid = signatures.some((sig) => combined.slice(0, sig.length).equals(sig));

    if (!valid) {
      console.warn("🚫 FILE REJECTED (magic bytes):", {
        name: file.originalname,
        type: file.mimetype,
        user: req.user?.id || "guest",
      });
      // Destroy the stream to abort the upload
      file.stream.destroy(new Error("File content does not match its declared type"));
    }
  });

  cb(null, true); // multer proceeds; stream destroy will abort if magic bytes fail
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